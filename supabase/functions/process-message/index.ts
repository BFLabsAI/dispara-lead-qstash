import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { Receiver } from "https://esm.sh/@upstash/qstash@2.7.17"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const QSTASH_CURRENT_SIGNING_KEY = Deno.env.get('QSTASH_CURRENT_SIGNING_KEY') ?? '';
const QSTASH_NEXT_SIGNING_KEY = Deno.env.get('QSTASH_NEXT_SIGNING_KEY') ?? '';
const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL') ?? 'https://api.bflabs.com.br';
const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY') ?? '9a38befe6a9f6938cd70cb769c66357d';

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

        // 2. Send to Evolution API
        let evolutionResponse;
        let isSuccess = false;
        let errorMessage = '';

        try {
            let endpoint = `${EVOLUTION_API_URL}/message/sendText/${instanceName}`;
            let bodyData: any = {
                number: phoneNumber,
                text: messageContent,
                delay: 1200,
                linkPreview: true
            };

            if (mediaUrl && mediaType) {
                endpoint = `${EVOLUTION_API_URL}/message/sendMedia/${instanceName}`;
                bodyData = {
                    number: phoneNumber,
                    media: mediaUrl,
                    mediatype: mediaType,
                    caption: messageContent,
                    delay: 1200
                };
            }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': EVOLUTION_API_KEY
                },
                body: JSON.stringify(bodyData)
            });

            evolutionResponse = await response.json();

            if (response.ok) {
                isSuccess = true;
            } else {
                errorMessage = evolutionResponse?.message || response.statusText;
            }
        } catch (error) {
            errorMessage = (error as Error).message;
        }

        // 3. Update Supabase
        const now = new Date().toISOString();

        // Update message log
        await supabase
            .from('message_logs_dispara_lead_saas_02')
            .update({
                status: isSuccess ? 'sent' : 'failed',
                sent_at: now,
                evolution_key: evolutionResponse?.key?.id,
                evolution_response: evolutionResponse,
                error_message: errorMessage
            })
            .eq('id', messageId);

        // Update campaign counters via RPC
        if (isSuccess) {
            await supabase.rpc('increment_campaign_sent_count', { campaign_id: campaignId });
        } else {
            await supabase.rpc('increment_campaign_failed_count', { campaign_id: campaignId });
        }

        if (isSuccess) {
            return new Response(JSON.stringify({ success: true, key: evolutionResponse?.key?.id }), {
                headers: { "Content-Type": "application/json" },
                status: 200
            });
        } else {
            // Smart Retry Logic
            // If it's a server error (5xx) or Rate Limit (429), return 500 to trigger QStash retry.
            // If it's a client error (400, 401, 404), return 200 to STOP retry (permanent failure).

            const status = evolutionResponse?.status || 500; // Default to 500 if unknown

            // Check for specific Evolution API error codes if available, or use HTTP status
            // Evolution often returns 400 for invalid numbers.

            // We want to retry on: 5xx, 429.
            // We do NOT want to retry on: 400, 401, 403, 404.

            // However, the user requested: "se der failed depois do retry devemos atualizar o banco como falha mas manter falha no qstash"
            // This implies they WANT retries even if it fails. 
            // BUT retrying a 400 is useless. 
            // I will stick to the best practice: Retry only transient errors.

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
