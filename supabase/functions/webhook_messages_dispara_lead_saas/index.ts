import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const UAZAPI_BASE_URL = Deno.env.get('UAZAPI_BASE_URL') || 'https://free.uazapi.com'; // Default or Env

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
    try {
        const payload = await req.json();
        const eventType = payload.EventType || payload.eventType || payload.event;
        const instanceName = payload.instanceName || payload.instance;
        const message = payload.message || payload.data?.message || payload.data;

        console.log(`Processing EventType: ${eventType}, Instance: ${instanceName}`);


        const isMessageEvent = ["messages", "messages.upsert", "message.received", "MESSAGES_UPSERT"].includes(eventType);

        if (isMessageEvent && message) {
            // Fetch Tenant ID and Token
            const { data: instanceData } = await supabase
                .from('instances_dispara_lead_saas_02')
                .select('id, tenant_id, token')
                .eq('instance_name', instanceName)
                .single();

            if (!instanceData) {
                console.log(`Instance not found: ${instanceName}`);
                return new Response('Instance not found', { status: 200 });
            }

            const tenantId = instanceData.tenant_id;
            const instanceId = instanceData.id;
            const instanceToken = instanceData.token;

            // Extract Message Details
            const isFromMe = !!(
                message.fromMe ||
                message.from_me ||
                message.key?.fromMe ||
                message.direction === 'outbound' ||
                message.direction === 'sent'
            );

            const chatPayload = payload.body?.chat || payload.chat || {};

            const senderJid = message.key?.remoteJid || message.chatid || message.sender_pn || message.sender || '';
            const phone = senderJid.split('@')[0];

            // Priority Name Extraction
            // User indicated 'name' field in chat object is reliable
            const pushName =
                chatPayload.name ||
                chatPayload.wa_name ||
                chatPayload.contactName ||
                message.senderName ||
                message.pushName ||
                '';

            if (pushName) {
                console.log(`Extracted Name: "${pushName}" for ${phone}`);
            }

            const messageType = message.messageType || message.type || 'text';
            const messageId = message.key?.id || message.id;

            // 1. Decouple Text Content from Raw Content Object
            let textContent = message.text || message.conversation || message.message?.conversation || '';
            const rawContent = message.content || message.message?.content; // The object containing media info

            // 2. Extract Media URL - Explicit Logic based on Message Type
            let mediaUrl = null;

            // Explicit handling for ImageMessage
            if (messageType === 'ImageMessage' || messageType === 'image') {
                if (typeof rawContent === 'object' && rawContent !== null) {
                    mediaUrl = rawContent.JPEGThumbnail || rawContent.base64 || rawContent.image;
                    if (!mediaUrl) mediaUrl = rawContent.url || rawContent.URL;
                }
            }

            // Fallback / General check
            if (!mediaUrl && typeof rawContent === 'object' && rawContent !== null) {
                mediaUrl = rawContent.JPEGThumbnail ||
                    rawContent.base64 ||
                    rawContent.image ||
                    rawContent.mediaUrl ||
                    rawContent.url ||
                    rawContent.URL ||
                    rawContent.fileUrl ||
                    rawContent.fileURL;
            }

            // Check top-level message object (Fallback)
            if (!mediaUrl) {
                mediaUrl = message.JPEGThumbnail ||
                    message.base64 ||
                    message.image ||
                    message.mediaUrl ||
                    message.url ||
                    message.file ||
                    message.fileURL ||
                    message.fileUrl;
            }

            // check if textContent is actually a JSON string containing the media
            if (!mediaUrl && typeof textContent === 'string' && textContent.trim().startsWith('{')) {
                try {
                    const parsed = JSON.parse(textContent);
                    textContent = parsed.caption || parsed.text || textContent;
                    mediaUrl = parsed.JPEGThumbnail ||
                        parsed.base64 ||
                        parsed.image ||
                        parsed.mediaUrl ||
                        parsed.url ||
                        parsed.URL ||
                        parsed.fileUrl ||
                        parsed.fileURL;
                } catch (e) {
                    // ignore
                }
            } else if (typeof rawContent === 'object' && rawContent !== null) {
                if (!textContent) {
                    textContent = rawContent.caption || rawContent.text || '';
                }
            }

            // --- High Quality Media Download Logic ---
            const isMedia = ['image', 'video', 'audio', 'document', 'sticker', 'ImageMessage', 'VideoMessage', 'AudioMessage', 'DocumentMessage'].includes(messageType);

            if (isMedia && instanceToken && messageId) {
                const downloadEndpoint = `${UAZAPI_BASE_URL}/message/download`;
                const downloadBody = {
                    id: messageId,
                    return_base64: true,
                    return_link: false,
                    download_quoted: false
                };

                // DB Logging Helper
                const logToDb = async (action: string, payload: any, status: number) => {
                    await supabase.from('uazapi_logs_dispara_lead_saas_02').insert({
                        action: action,
                        request_payload: typeof payload === 'string' ? { msg: payload } : payload,
                        status_code: status,
                        created_at: new Date().toISOString()
                    });
                };

                try {
                    // Log Attempt
                    await logToDb('hq_download_attempt', { endpoint: downloadEndpoint, body: downloadBody, msg_id: messageId }, 0);

                    const dlResponse = await fetch(downloadEndpoint, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'token': instanceToken
                        },
                        body: JSON.stringify(downloadBody)
                    });

                    if (dlResponse.ok) {
                        const dlData = await dlResponse.json();

                        await logToDb('hq_download_success', {
                            keys: Object.keys(dlData),
                            mimetype: dlData.mimetype,
                            hasBase64: !!dlData.base64Data,
                            hasUrl: !!dlData.fileURL,
                            base64Length: dlData.base64Data?.length
                        }, dlResponse.status);

                        if (dlData.base64Data && dlData.mimetype) {
                            mediaUrl = `data:${dlData.mimetype};base64,${dlData.base64Data}`;
                        } else if (dlData.fileURL) {
                            mediaUrl = dlData.fileURL;
                        }
                    } else {
                        const errTxt = await dlResponse.text();
                        await logToDb('hq_download_failed', { status: dlResponse.status, error: errTxt }, dlResponse.status);
                    }

                } catch (dlError) {
                    await logToDb('hq_download_exception', { error: dlError.message || String(dlError) }, 500);
                }
            }
            // -----------------------------------------

            // Final Content variable to be used in Insert
            const finalContent = textContent;

            if (mediaUrl) {
                console.log(`Extracted Media URL (Length: ${mediaUrl.length})`);
            }

            // Safe timestamp parsing
            let sentAt = new Date().toISOString();
            const messageTimestamp = message.messageTimestamp || message.timestamp;
            if (messageTimestamp) {
                const ts = Number(messageTimestamp);
                if (!isNaN(ts)) {
                    sentAt = new Date(ts < 10000000000 ? ts * 1000 : ts).toISOString();
                }
            }

            // 1. Upsert Contact
            const { data: contactData } = await supabase
                .from('contacts_dispara_lead_saas_02')
                .upsert({
                    tenant_id: tenantId,
                    phone: phone,
                    name: pushName || null,
                    last_message_at: new Date().toISOString()
                }, { onConflict: 'tenant_id, phone' })
                .select('id')
                .maybeSingle();

            // 2. Insert Message (Upsert ensures we update the record with official data if client already inserted)
            const { error: insertError } = await supabase
                .from('messages_dispara_lead_saas_02')
                .upsert({
                    tenant_id: tenantId,
                    instance_id: instanceId,
                    contact_id: contactData?.id || null,
                    uazapi_message_id: message.id || message.key?.id,
                    direction: isFromMe ? 'outbound' : 'inbound',
                    message_type: messageType,
                    content: finalContent,
                    media_url: mediaUrl,
                    sent_at: sentAt,
                    sender_name: pushName || null
                }, { onConflict: 'uazapi_message_id' }); // Update record with Webhook data

            // 3. Track Campaign Response
            if (!isFromMe && phone) {
                const possiblePhones = [phone];
                if (phone.startsWith('55')) {
                    if (phone.length === 12) possiblePhones.push(phone.slice(0, 4) + '9' + phone.slice(4));
                    else if (phone.length === 13) possiblePhones.push(phone.slice(0, 4) + phone.slice(5));
                }

                const { data: lastCampaignMsg, error: logError } = await supabase
                    .from('message_logs_dispara_lead_saas_03')
                    .select('id, responded_at, campaign_id')
                    .eq('tenant_id', tenantId)
                    .in('phone_number', possiblePhones)
                    .eq('status', 'sent')
                    .order('sent_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (logError) {
                    await supabase.from('debug_logs').insert({ message: `LogLookupError: ${logError.message}` });
                }

                if (lastCampaignMsg) {
                    await supabase.from('debug_logs').insert({ message: `CampaignMsgFound: ID=${lastCampaignMsg.id} CampID=${lastCampaignMsg.campaign_id} RespAt=${lastCampaignMsg.responded_at}` });
                } else {
                    await supabase.from('debug_logs').insert({ message: `NoCampaignMsgFound for ${phone}` });
                }

                if (lastCampaignMsg && !lastCampaignMsg.responded_at) {
                    // 1. Mark as responded
                    await supabase
                        .from('message_logs_dispara_lead_saas_03')
                        .update({ responded_at: new Date().toISOString() })
                        .eq('id', lastCampaignMsg.id);

                    // 2. Notifications Logic
                    try {
                        const { data: settings } = await supabase
                            .from('company_settings_dispara_lead_saas_02')
                            .select('response_notification_phones')
                            .eq('tenant_id', tenantId)
                            .maybeSingle();

                        if (settings?.response_notification_phones?.length && lastCampaignMsg.campaign_id) {
                            await supabase.from('debug_logs').insert({ message: `Notify: Phones=${settings.response_notification_phones.length} CampID=${lastCampaignMsg.campaign_id}` });

                            // Get Campaign Details
                            const { data: camp } = await supabase
                                .from('campaigns_dispara_lead_saas_02')
                                .select('name, target_audience, creative')
                                .eq('id', lastCampaignMsg.campaign_id)
                                .single();

                            const campName = camp?.name || 'Desconhecida';
                            const audience = camp?.target_audience || 'N/A';
                            const creativeRaw = camp?.creative || 'N/A';
                            const creative = creativeRaw.length > 50 ? creativeRaw.substring(0, 47) + '...' : creativeRaw;

                            const leadLink = `https://wa.me/${phone}`;
                            const notificationText = `🔔 *Novo Lead Respondeu a Campanha!*

👤 *Lead:* ${pushName || phone}
📱 *WhatsApp:* ${phone}
🔗 *Link:* ${leadLink}

📢 *Campanha:* ${campName}
🎯 *Público:* ${audience}
🎨 *Criativo:* ${creative}

_Responda rápido para converter!_`;

                            // Send Notifications
                            console.log(`Sending notifications to ${settings.response_notification_phones.length} admins...`);
                            const notifEndpoint = `${UAZAPI_BASE_URL}/send/text`;

                            await Promise.all(settings.response_notification_phones.map(async (adminPhone: string) => {
                                try {
                                    const resp = await fetch(notifEndpoint, {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json',
                                            'token': instanceToken
                                        },
                                        body: JSON.stringify({
                                            number: adminPhone,
                                            text: notificationText
                                        })
                                    });
                                    const respText = await resp.text();
                                    await supabase.from('debug_logs').insert({ message: `NotifySent: ${adminPhone} Status=${resp.status} Body=${respText}` });
                                } catch (e) {
                                    console.error(`Failed to notify ${adminPhone}:`, e);
                                    await supabase.from('debug_logs').insert({ message: `NotifyFail: ${adminPhone} Err=${e}` });
                                }
                            }));
                        } else {
                            await supabase.from('debug_logs').insert({ message: `NotifySkip: Settings=${!!settings} Phones=${settings?.response_notification_phones?.length} CampID=${lastCampaignMsg.campaign_id}` });
                        }
                    } catch (notifyError) {
                        console.error('Notification Error:', notifyError);
                        await supabase.from('debug_logs').insert({ message: `NotifyError: ${notifyError}` });
                    }
                }
            }
        }

        return new Response(JSON.stringify({ received: true }), {
            headers: { "Content-Type": "application/json" },
            status: 200,
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { "Content-Type": "application/json" },
            status: 500,
        });
    }
});
