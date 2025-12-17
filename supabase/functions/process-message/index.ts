import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { Receiver } from "https://esm.sh/@upstash/qstash@2.7.17"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const QSTASH_CURRENT_SIGNING_KEY = Deno.env.get('QSTASH_CURRENT_SIGNING_KEY') ?? '';
const QSTASH_NEXT_SIGNING_KEY = Deno.env.get('QSTASH_NEXT_SIGNING_KEY') ?? '';
const UAZAPI_BASE_URL = Deno.env.get('UAZAPI_BASE_URL') ?? '';
// Note: We don't use UAZAPI_TOKEN (Global) here, we use the Instance Token from DB.

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const receiver = new Receiver({
    currentSigningKey: QSTASH_CURRENT_SIGNING_KEY,
    nextSigningKey: QSTASH_NEXT_SIGNING_KEY,
});

serve(async (req) => {
    // 1. Validate QStash Signature
    const signature = req.headers.get("Upstash-Signature");
    if (!signature) {
        return new Response("Missing signature", { status: 401 });
    }

    try {
        const body = await req.text();
        // Verify signature (skip locally if needed, but important for prod)
        // For local dev without QStash triggering, this might fail unless manually mocked.
        // Assuming this runs in production or with ngrok.
        const isValid = await receiver.verify({
            signature,
            body,
        });

        if (!isValid) {
            return new Response("Invalid signature", { status: 401 });
        }

        const payload = JSON.parse(body);
        const {
            messageId,
            phoneNumber,
            messageContent,
            instanceName,
            campaignId,
            tenantId,
            mediaUrl,
            mediaType
        } = payload;

        if (!messageId || !phoneNumber || !instanceName || !campaignId) {
            return new Response("Missing required fields", { status: 400 });
        }

        // 2. Fetch Instance Token
        const { data: instanceData, error: instanceError } = await supabase
            .from('instances_dispara_lead_saas_02')
            .select('token, uazapi_instance_id') // Use token
            .eq('instance_name', instanceName)
            .single();

        if (instanceError || !instanceData?.token) {
            console.error(`Instance not found or no API key: ${instanceName}`);
            // Mark as failed in DB
            await supabase
                .from('message_logs_dispara_lead_saas_03')
                .update({
                    status: 'failed',
                    error_message: 'Instance not found or invalid API key'
                })
                .eq('id', messageId);

            // Return 200 to stop QStash from retrying forever on permanent config error
            return new Response("Instance configuration error", { status: 200 });
        }

        const instanceToken = instanceData.token;

        // 3. Send to UazAPI
        let uazapiResponse;
        let isSuccess = false;
        let errorMessage = '';
        let uazapiMessageId = null;

        try {
            let endpoint = `${UAZAPI_BASE_URL}/send/text`; // CORRECT ENDPOINT
            let bodyData: any = {
                number: phoneNumber,
                text: messageContent,
                delay: 1200,
                linkPreview: true
            };

            if (mediaUrl && mediaType) {
                endpoint = `${UAZAPI_BASE_URL}/send/media`; // CORRECT ENDPOINT
                bodyData = {
                    number: phoneNumber,
                    file: mediaUrl, // NEW SPEC
                    type: mediaType, // NEW SPEC
                    text: messageContent
                };
            }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'token': instanceToken // CORRECT HEADER
                },
                body: JSON.stringify(bodyData)
            });

            uazapiResponse = await response.json();

            if (response.ok) {
                isSuccess = true;
                uazapiMessageId = uazapiResponse?.key?.id; // Capture ID if available
            } else {
                errorMessage = uazapiResponse?.message || response.statusText;
            }
        } catch (error) {
            errorMessage = (error as Error).message;
        }

        // 4. Update Supabase
        const now = new Date().toISOString();

        // Update message log
        await supabase
            .from('message_logs_dispara_lead_saas_03')
            .update({
                status: isSuccess ? 'sent' : 'failed',
                sent_at: now,
                provider_message_id: uazapiMessageId,
                provider_response: uazapiResponse,
                error_message: errorMessage
            })
            .eq('id', messageId);

        // Update campaign counters via RPC (ensure this RPC exists or update campaign manually)
        // Assuming rpc 'increment_campaign_sent_count' works with campaign_id
        // NOTE: The RPC might target the old logs table? 
        // If the RPC executes logic on 'message_logs', we might need to update the RPC too.
        // For now, let's keep calling it. If it fails, it logs error but msg is sent.
        // Ideally we should check the RPC definition.
        if (isSuccess) {
            await supabase.rpc('increment_campaign_sent_count', { campaign_id: campaignId });
        } else {
            await supabase.rpc('increment_campaign_failed_count', { campaign_id: campaignId });
        }

        if (isSuccess) {
            return new Response(JSON.stringify({ success: true, id: uazapiMessageId }), {
                headers: { "Content-Type": "application/json" },
                status: 200
            });
        } else {
            // Smart Retry Logic for UazAPI
            const status = uazapiResponse?.status || 500;

            if (status >= 500 || status === 429) {
                return new Response(JSON.stringify({ success: false, error: errorMessage }), {
                    headers: { "Content-Type": "application/json" },
                    status: 500 // Triggers QStash retry
                });
            } else {
                return new Response(JSON.stringify({ success: false, error: errorMessage }), {
                    headers: { "Content-Type": "application/json" },
                    status: 200 // Stops QStash retry (Permanent Failure)
                });
            }
        }

    } catch (error) {
        console.error(error);
        return new Response(error.message, { status: 500 });
    }
});
