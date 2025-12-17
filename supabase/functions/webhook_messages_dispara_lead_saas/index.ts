import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
    try {
        const payload = await req.json();
        const event = payload.event;
        const instanceName = payload.instance;
        const data = payload.data; // varies by event

        // We care about MESSAGES_UPSERT or SEND_MESSAGE
        // UazAPI usually sends 'MESSAGES_UPSERT' for incoming/outgoing storage
        if (event === 'MESSAGES_UPSERT' && data) {
            const message = data.message; // Determine structure based on UazAPI docs/logs
            if (!message) return new Response('No message data', { status: 200 });

            // Fetch Tenant ID based on instanceName
            const { data: instanceData } = await supabase
                .from('instances_dispara_lead_saas_02')
                .select('id, tenant_id')
                .eq('instance_name', instanceName)
                .single();

            if (!instanceData) {
                console.error(`Instance not found: ${instanceName}`);
                return new Response('Instance not found', { status: 200 });
            }

            const tenantId = instanceData.tenant_id;
            const instanceId = instanceData.id;

            // Extract details
            const key = data.key;
            const isFromMe = key?.fromMe || false;
            const remoteJid = key?.remoteJid || ''; // Contains phone number
            const phone = remoteJid.split('@')[0];
            const pushName = data.pushName;

            let content = '';
            let messageType = 'text';
            let mediaUrl = null;

            // Parsing content (Simplified for Baileys/UazAPI structure)
            if (message.conversation) {
                content = message.conversation;
            } else if (message.extendedTextMessage?.text) {
                content = message.extendedTextMessage.text;
            } else if (message.imageMessage) {
                messageType = 'image';
                content = message.imageMessage.caption || '';
                // Media handling usually requires fetching/downloading. 
                // UazAPI might provide a URL in specific fields or we might need to process media separately.
                // For now, storing caption.
            } else if (message.videoMessage) {
                messageType = 'video';
                content = message.videoMessage.caption || '';
            }

            // 1. Upsert Contact
            const { data: contactData, error: contactError } = await supabase
                .from('contacts_dispara_lead_saas_02')
                .upsert({
                    tenant_id: tenantId,
                    phone: phone,
                    name: pushName,
                    last_message_at: new Date().toISOString()
                }, { onConflict: 'tenant_id, phone' })
                .select('id')
                .single();

            if (contactError) console.error('Contact Upsert Error:', contactError);

            // 2. Insert Message
            // Check if exists to avoid duplicates (idempotency)
            const { error: msgError } = await supabase
                .from('messages_dispara_lead_saas_02')
                .insert({
                    tenant_id: tenantId,
                    instance_id: instanceId,
                    contact_id: contactData?.id,
                    uazapi_message_id: key?.id,
                    direction: isFromMe ? 'outbound' : 'inbound',
                    message_type: messageType,
                    content: content,
                    media_url: mediaUrl,
                    sent_at: new Date(Number(data.messageTimestamp) * 1000).toISOString(),
                    sender_name: pushName
                });

            if (msgError && msgError.code !== '23505') { // Ignore unique constraint violation
                console.error('Message Insert Error:', msgError);
            }
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
