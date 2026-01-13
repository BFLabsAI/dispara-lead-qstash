
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Client } from "https://esm.sh/@upstash/qstash@2.7.17";

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

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // 1. Authenticate
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return debugResponse({ success: false, stage: 'Auth', error: 'Missing Authorization header' });
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
            return debugResponse({ success: false, stage: 'Client Init', error: e.message });
        }

        // 4. Parse Body
        let body;
        try {
            body = await req.json();
        } catch (e) {
            return debugResponse({ success: false, stage: 'Body Parse', error: e.message });
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
                destinationUrl = `${baseUrl}/functions/v1/process-message`;
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

            return {
                url: destinationUrl,
                body: JSON.stringify(msg),
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
                error: qstashErr.message,
                details: JSON.stringify(qstashErr),
                tokenStatus
            });
        }

        return debugResponse({ success: true, count: results.length, debug: 'Enqueue Successful' });

    } catch (error) {
        return debugResponse({
            success: false,
            stage: 'Unhandled Exception',
            error: error.message,
            stack: error.stack
        });
    }
});
