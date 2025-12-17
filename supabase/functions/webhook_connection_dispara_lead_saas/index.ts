import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
    try {
        const payload = await req.json();
        // Log raw webhook for debugging
        console.log("Full Webhook Payload:", JSON.stringify(payload, null, 2));

        // Robust parsing handling different API versions
        const event = payload.event || payload.type || payload.EventType;
        const instanceName = typeof payload.instance === 'string'
            ? payload.instance
            : payload.instance?.name || payload.instanceName;

        const data = payload.data || payload.instance; // instance object often contains the status

        console.log(`Parsed Webhook: Event=${event}, Instance=${instanceName}`);

        // Handle various event names: CONNECTION_UPDATE, connection.update, or just 'connection'
        const isConnectionEvent =
            event === 'CONNECTION_UPDATE' ||
            event === 'connection.update' ||
            event === 'connection';

        if (isConnectionEvent && data) {
            // Normalize status
            // payload.instance.status might be 'connected', 'open', 'close', etc.
            // payload.data.state might be 'open', 'connecting', 'close'

            const rawStatus = data.status || data.state;

            let status = 'disconnected';
            if (rawStatus === 'open' || rawStatus === 'connected') status = 'open'; // 'open' in DB means connected
            else if (rawStatus === 'connecting') status = 'connecting';
            else if (rawStatus === 'close' || rawStatus === 'disconnected') status = 'disconnected';

            console.log(`Updating status for ${instanceName} to ${status} (Raw: ${rawStatus})`);

            await supabase
                .from('instances_dispara_lead_saas_02')
                .update({
                    status: status,
                    last_connected_at: status === 'open' ? new Date().toISOString() : undefined,
                    // Clear QR Code if connected
                    qrcode: status === 'open' ? null : undefined
                })
                .eq('instance_name', instanceName);
        }

        return new Response(JSON.stringify({ received: true }), {
            headers: { "Content-Type": "application/json" },
            status: 200,
        });
    } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { "Content-Type": "application/json" },
            status: 500,
        });
    }
});
