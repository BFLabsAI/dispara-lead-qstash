
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Client } from "https://esm.sh/@upstash/qstash@2.7.17";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper for debug responses (Always 200 OK to bypass client error throwing)
const debugResponse = (data: any) => {
    return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
    });
};

const getErrorMessage = (error: unknown) => error instanceof Error ? error.message : String(error);
const getErrorStack = (error: unknown) => error instanceof Error ? error.stack : undefined;

const buildJobPayload = (msg: Record<string, any>) => {
    const lead = msg.lead ?? {
        name: msg.contactName ?? msg.contact?.name ?? null,
        phone: msg.phoneNumber ?? msg.contact?.phone ?? null,
    };

    const message = msg.message ?? {
        content: msg.messageContent ?? null,
        mediaUrl: msg.mediaUrl ?? null,
        mediaType: msg.mediaType ?? null,
    };

    return {
        messageId: msg.messageId,
        campaignId: msg.campaignId,
        tenantId: msg.tenantId,
        instanceName: msg.instanceName,
        phoneNumber: lead.phone,
        messageContent: message.content,
        mediaUrl: message.mediaUrl,
        mediaType: message.mediaType,
        lead,
        message,
    };
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // 1. Authenticate
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return debugResponse({ success: false, stage: 'Auth', error: 'Missing Authorization header' });
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

        if (!supabaseUrl || !supabaseAnonKey) {
            return debugResponse({ success: false, stage: 'Auth', error: 'Missing Supabase auth configuration' });
        }

        const accessToken = authHeader.slice('Bearer '.length).trim();
        const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
        const { data: authData, error: authError } = await supabaseAuth.auth.getUser(accessToken);
        if (authError || !authData.user) {
            return debugResponse({ success: false, stage: 'Auth', error: 'Unauthorized' });
        }

        // 2. Check Secret
        const QSTASH_TOKEN = Deno.env.get('QSTASH_TOKEN');
        // Sanity check: Log partial token to return
        const tokenStatus = QSTASH_TOKEN ? `Present (len: ${QSTASH_TOKEN.length})` : 'Missing';

        if (!QSTASH_TOKEN) {
            return debugResponse({ success: false, stage: 'Secret Check', error: 'QSTASH_TOKEN is missing in Supabase Secrets', tokenStatus });
        }

        // 3. Init Client
        let client;
        try {
            client = new Client({ token: QSTASH_TOKEN });
        } catch (e) {
            return debugResponse({ success: false, stage: 'Client Init', error: getErrorMessage(e) });
        }

        // 4. Parse Body
        let body;
        try {
            body = await req.json();
        } catch (e) {
            return debugResponse({ success: false, stage: 'Body Parse', error: getErrorMessage(e) });
        }

        const messages = body.messages;
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return debugResponse({ success: false, stage: 'Validation', error: 'Invalid or empty "messages" array', receivedBody: body });
        }

        // 5. Enqueue
        const batch = messages.map(msg => {
            let destinationUrl = msg.destinationUrl;

            // Fallback to default if not provided
            if (!destinationUrl) {
                const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
                const baseUrl = supabaseUrl.startsWith('http') ? supabaseUrl : `https://${supabaseUrl}`;

                // Server-side routing decision
                if (msg.useAI) {
                    destinationUrl = `${baseUrl}/functions/v1/process-message-ai`;
                    console.log(`[Enqueue] Routing to AI Function due to useAI=true`);
                } else {
                    destinationUrl = `${baseUrl}/functions/v1/process-message`;
                }
            }

            // Ensure schema
            if (!destinationUrl.startsWith('http://') && !destinationUrl.startsWith('https://')) {
                destinationUrl = `https://${destinationUrl}`;
            }

            console.log(`[Enqueue] Destination URL: ${destinationUrl}`);

            const headers: Record<string, string> = { "Content-Type": "application/json" };
            if (msg.campaignId) {
                headers["Upstash-Label"] = msg.campaignId;
            } else if (msg.label) {
                headers["Upstash-Label"] = msg.label;
            }

            const jobPayload = buildJobPayload(msg);

            return {
                url: destinationUrl,
                body: JSON.stringify(jobPayload),
                headers: headers,
                delay: msg.delay,
                notBefore: msg.notBefore,
                retries: 2,
            };
        });

        const results = [];
        try {
            // Just send one big batch or chunk it logic (simplified for debug)
            const result = await client.batch(batch);
            results.push(...result);
        } catch (qstashErr) {
            return debugResponse({
                success: false,
                stage: 'QStash API Call',
                error: getErrorMessage(qstashErr),
                details: JSON.stringify(qstashErr),
                tokenStatus
            });
        }

        return debugResponse({ success: true, count: results.length, debug: 'Enqueue Successful' });

    } catch (error) {
        return debugResponse({
            success: false,
            stage: 'Unhandled Exception',
            error: getErrorMessage(error),
            stack: getErrorStack(error)
        });
    }
});
