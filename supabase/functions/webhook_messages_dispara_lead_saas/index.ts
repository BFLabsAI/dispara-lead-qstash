import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
    try {
        const payload = await req.json();
        console.log('Webhook Payload Received:', JSON.stringify(payload));

        const { EventType, instanceName, message } = payload;

        console.log(`Processing EventType: ${EventType}, Instance: ${instanceName}`);

        // Handle UazAPI 'messages' event
        if (EventType === 'messages' && message) {
            // Fetch Tenant ID
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

            // Extract Message Details
            const isFromMe = message.fromMe;
            // Prioritize sender_pn (Phone Number JID) to avoid LID (Local ID)
            const senderJid = message.sender_pn || message.chatid || message.sender || '';
            const phone = senderJid.split('@')[0];
            const pushName = message.senderName || '';
            const content = message.text || message.content || '';
            const messageType = message.type || 'text';
            const messageTimestamp = message.messageTimestamp;

            // Adjust timestamp (likely already in MS, but just in case check length or generic Date parsing)
            const sentAt = new Date(messageTimestamp).toISOString();

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
            const { error: msgError } = await supabase
                .from('messages_dispara_lead_saas_02')
                .insert({
                    tenant_id: tenantId,
                    instance_id: instanceId,
                    contact_id: contactData?.id,
                    uazapi_message_id: message.id,
                    direction: isFromMe ? 'outbound' : 'inbound',
                    message_type: messageType,
                    content: content,
                    media_url: null,
                    sent_at: sentAt,
                    sender_name: pushName
                });

            if (msgError && msgError.code !== '23505') {
                console.error('Message Insert Error:', msgError);
            }

            // 3. Track Campaign Response (If Inbound)
            if (!isFromMe) {
                // Generate phone variations for matching (Handle Brazil 9th digit)
                const possiblePhones = [phone];
                if (phone.startsWith('55')) {
                    if (phone.length === 12) {
                        // Case: 55 + DDD + 8digits (e.g., 558588888888) -> Add 9
                        const with9 = phone.slice(0, 4) + '9' + phone.slice(4);
                        possiblePhones.push(with9);
                    } else if (phone.length === 13) {
                        // Case: 55 + DDD + 9 + 8digits (e.g., 5585988888888) -> Remove 9
                        const without9 = phone.slice(0, 4) + phone.slice(5);
                        possiblePhones.push(without9);
                    }
                }

                console.log(`Checking for campaign response from ${possiblePhones.join(' or ')} for tenant ${tenantId}`);
                const { data: lastCampaignMsg } = await supabase
                    .from('message_logs_dispara_lead_saas_03')
                    .select('id')
                    .eq('tenant_id', tenantId)
                    .in('phone_number', possiblePhones)
                    .eq('status', 'sent')
                    .is('responded_at', null)
                    .order('sent_at', { ascending: false })
                    .limit(1)
                    .single();

                if (lastCampaignMsg) {
                    console.log(`Found campaign message to update: ${lastCampaignMsg.id}`);
                    await supabase
                        .from('message_logs_dispara_lead_saas_03')
                        .update({ responded_at: new Date().toISOString() })
                        .eq('id', lastCampaignMsg.id);
                } else {
                    console.log('No matching campaign message found to mark as responded.');
                }
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
