import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { Receiver } from "https://esm.sh/@upstash/qstash@2.7.17"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const QSTASH_CURRENT_SIGNING_KEY = Deno.env.get('QSTASH_CURRENT_SIGNING_KEY') ?? '';
const QSTASH_NEXT_SIGNING_KEY = Deno.env.get('QSTASH_NEXT_SIGNING_KEY') ?? '';
const UAZAPI_BASE_URL = Deno.env.get('UAZAPI_BASE_URL') ?? 'https://bflabs.uazapi.com';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const receiver = new Receiver({
    currentSigningKey: QSTASH_CURRENT_SIGNING_KEY,
    nextSigningKey: QSTASH_NEXT_SIGNING_KEY,
});

serve(async (req) => {
    const signature = req.headers.get("Upstash-Signature");
    if (!signature) {
        return new Response("Missing signature", { status: 401 });
    }

    try {

        const body = await req.text();
        console.log(`[Process-Message] Received body: ${body.substring(0, 500)}...`); // Log first 500 chars

        const isValid = await receiver.verify({ signature, body });

        if (!isValid) {
            console.error("[Process-Message] Invalid signature");
            return new Response("Invalid signature", { status: 401 });
        }

        const payload = JSON.parse(body);
        const { messageId, phoneNumber, messageContent, instanceName, campaignId, tenantId, mediaUrl, mediaType } = payload;

        console.log(`[Process-Message] Processing messageId: ${messageId}, campaignId: ${campaignId}, instance: ${instanceName}`);

        if (!messageId || !phoneNumber || !instanceName || !campaignId) {
            console.error(`[Process-Message] Missing required fields: ${JSON.stringify(payload)}`);
            return new Response("Missing required fields", { status: 400 });
        }

        let isSuccess = false;
        let uazapiMessageId: string | null = null;
        let uazapiResponse: any = null;
        let errorMessage: string | null = null;
        let alreadySent = false;
        let instanceToken: string | null = null;

        // --- Fetch Instance Data ---
        const { data: instanceData, error: instanceError } = await supabase
            .from('instances_dispara_lead_saas_02')
            .select('uazapi_instance_id, metadata')
            .eq('instance_name', instanceName)
            .eq('tenant_id', tenantId)
            .single();

        if (instanceError || !instanceData) {
            console.error(`Instance not found: ${instanceName} for tenant ${tenantId}`);
            // Only update log if it's the first attempt
            await supabase.from('message_logs_dispara_lead_saas_03').update({
                status: 'failed',
                error_message: 'Instance not found or not owned by tenant'
            }).eq('id', messageId);
            return new Response("Instance not found", { status: 404 });
        }

        instanceToken = instanceData.metadata?.token || instanceData.metadata?.apikey;
        if (!instanceToken) {
            await supabase.from('message_logs_dispara_lead_saas_03').update({
                status: 'failed',
                error_message: 'Instance token missing in metadata'
            }).eq('id', messageId);
            return new Response("Instance token missing", { status: 500 });
        }

        // --- Campaign Status Check ---
        if (campaignId) {
            const { data: campaign } = await supabase
                .from('campaigns_dispara_lead_saas_02')
                .select('status')
                .eq('id', campaignId)
                .single();

            if (campaign && (campaign.status === 'paused' || campaign.status === 'cancelled')) {
                console.log(`[Process] Campaign ${campaign.status}. Skipping message.`);
                // Update log to reflect status (unless already final)
                await supabase.from('message_logs_dispara_lead_saas_03')
                    .update({ status: campaign.status, error_message: `Campaign ${campaign.status}` })
                    .eq('id', messageId)
                    .neq('status', 'sent'); // Don't overwrite sent

                return new Response(`Campaign ${campaign.status}`, { status: 200 });
            }
        }

        // --- Fetch Log & Idempotency Check ---
        const { data: existingLog } = await supabase
            .from('message_logs_dispara_lead_saas_03')
            .select('status, provider_message_id, message_content, media_url, message_type') // Fixed column name
            .eq('id', messageId)
            .single();

        if (existingLog && existingLog.status === 'sent') {
            console.log(`[Idempotency] Message ${messageId} already sent. Skipping send logic.`);
            alreadySent = true;
            uazapiMessageId = existingLog.provider_message_id;
            isSuccess = true;
        }

        // Use DB content as Source of Truth (allows Editing)
        const finalMessageContent = existingLog?.message_content || messageContent;
        const finalMediaUrl = existingLog?.media_url || mediaUrl;
        const finalMediaType = existingLog?.message_type || mediaType; // Fixed usage
        // -------------------------

        if (!alreadySent) {
            try {
                let endpoint = '';
                let bodyData: any = {};

                if (finalMediaUrl) {
                    endpoint = `${UAZAPI_BASE_URL}/send/media`;
                    const uazapiMediaType = {
                        'imagem': 'image',
                        'video': 'video',
                        'audio': 'audio'
                    }[finalMediaType] || finalMediaType;

                    bodyData = {
                        number: phoneNumber,
                        file: finalMediaUrl,
                        type: uazapiMediaType,
                        text: finalMessageContent
                    };
                } else {
                    endpoint = `${UAZAPI_BASE_URL}/send/text`;
                    bodyData = {
                        number: phoneNumber,
                        text: finalMessageContent,
                        delay: 1200,
                        linkPreview: true
                    };
                }

                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'token': instanceToken
                    },
                    body: JSON.stringify(bodyData)
                });

                uazapiResponse = await response.json();
                if (response.ok) {
                    isSuccess = true;
                    uazapiMessageId = uazapiResponse?.key?.id;
                } else {
                    errorMessage = uazapiResponse?.message || response.statusText;
                }
            } catch (error) {
                errorMessage = (error as Error).message;
            }

            const now = new Date().toISOString();
            const updateData: any = {
                status: isSuccess ? 'sent' : 'failed',
                sent_at: now,
                provider_message_id: uazapiMessageId,
                provider_response: uazapiResponse,
                error_message: errorMessage
            };

            // No need to update media_url as we read it from DB

            await supabase.from('message_logs_dispara_lead_saas_03').update(updateData).eq('id', messageId);
        }

        // --- Campaign Completion Notification ---
        if (campaignId) {
            console.log(`[CompletionCheck] Checking for campaign ${campaignId} (Current message: ${messageId})`);

            // We exclude the current message from the pending count.
            // Why? Because we just processed it (either now or in a previous attempt).
            // This prevents race conditions where DB lag might still see this message as 'pending'
            // even after the update call.
            const { count, error: countError } = await supabase
                .from('message_logs_dispara_lead_saas_03')
                .select('id', { count: 'exact', head: true })
                .eq('campaign_id', campaignId)
                .neq('id', messageId)
                .in('status', ['queued', 'pending']);

            const pendingCount = count || 0;
            console.log(`[CompletionCheck] Other messages pending: ${pendingCount}`);

            if (pendingCount === 0) {
                const { data: campaign, error: campError } = await supabase
                    .from('campaigns_dispara_lead_saas_02')
                    .select('*')
                    .eq('id', campaignId)
                    .single();

                if (campaign) {
                    console.log(`[CompletionCheck] Campaign ${campaign.name} loaded. CompletedAt: ${campaign.completed_at}`);
                } else {
                    console.error(`[CompletionCheck] Campaign ${campaignId} not found. Error: ${campError?.message}`);
                }

                if (campaign && !campaign.completed_at) {
                    // Mark as completed to prevent duplicate notifications (optimistic lock)
                    const { error: updateError } = await supabase
                        .from('campaigns_dispara_lead_saas_02')
                        .update({ completed_at: new Date().toISOString(), status: 'completed' })
                        .eq('id', campaignId)
                        .is('completed_at', null); // Safety check

                    if (!updateError) {
                        console.log(`[CompletionCheck] Campaign marked as completed. Gathering stats...`);
                        // Gather Stats
                        const { data: stats } = await supabase
                            .from('message_logs_dispara_lead_saas_03')
                            .select('sent_at, instance_name, campaign_type, metadata')
                            .eq('campaign_id', campaignId);

                        if (stats && stats.length > 0) {
                            const totalMessages = stats.length;
                            const uniqueInstances = [...new Set(stats.map(s => s.instance_name).filter(Boolean))];

                            const sortedDates = stats
                                .map(s => s.sent_at ? new Date(s.sent_at).getTime() : 0)
                                .filter(t => t > 0)
                                .sort((a, b) => a - b);

                            const startTime = sortedDates.length > 0 ? new Date(sortedDates[0]).toLocaleString('pt-BR') : 'N/A';
                            const endTime = new Date().toLocaleString('pt-BR');

                            const isAI = (campaign.content_configuration?.use_ai) ||
                                (campaign.use_ai) ||
                                stats.some(s => s.campaign_type === 'ai' || s.campaign_type === 'ai_agent' || s.metadata?.ai_rewritten);
                            const modeIcon = isAI ? '🤖' : '💬';
                            const modeText = isAI ? 'Com IA' : 'Sem IA (Estático)';

                            // Get Notification Phones
                            const { data: settings } = await supabase
                                .from('company_settings_dispara_lead_saas_02')
                                .select('report_notification_phones')
                                .eq('tenant_id', tenantId)
                                .single();

                            console.log(`[CompletionCheck] Settings found for tenant ${tenantId}: ${!!settings}`);
                            if (settings?.report_notification_phones) {
                                console.log(`[CompletionCheck] Phones: ${JSON.stringify(settings.report_notification_phones)}`);
                            }

                            if (settings?.report_notification_phones?.length) {
                                const notificationText = `🎉 *Ótimas notícias, finalizamos mais uma campanha!*

📊 *Dados da Ação:*
*Campanha:* ${campaign.name}
*Público:* ${campaign.target_audience || 'N/A'}
*Criativo:* ${campaign.creative ? (campaign.creative.substring(0, 30) + (campaign.creative.length > 30 ? '...' : '')) : 'N/A'}

📈 *KPI's da Ação:*
*Modo:* ${modeIcon} ${modeText}
*Disparos Realizados:* ${totalMessages}
*Instâncias Utilizadas:*
${uniqueInstances.map(i => `- ${i}`).join('\n')}

🕒 *Cronograma:*
Início: ${startTime}
Fim: ${endTime}`;

                                // Send to each admin
                                const notifEndpoint = `${UAZAPI_BASE_URL}/send/text`;
                                console.log(`[CompletionCheck] Sending to endpoint: ${notifEndpoint}`);

                                await Promise.all(settings.report_notification_phones.map(async (phone: string) => {
                                    try {
                                        const resp = await fetch(notifEndpoint, {
                                            method: 'POST',
                                            headers: {
                                                'Content-Type': 'application/json',
                                                'token': instanceToken
                                            },
                                            body: JSON.stringify({
                                                number: phone.replace(/\D/g, ""),
                                                text: notificationText
                                            })
                                        });
                                        const respText = await resp.text();
                                        console.log(`[CompletionCheck] Notification to ${phone}: Status ${resp.status} - Body: ${respText}`);
                                    } catch (e) {
                                        console.error(`Failed to notify ${phone}`, e);
                                    }
                                }));
                            } else {
                                console.log(`[CompletionCheck] No notification phones configured.`);
                            }
                        }
                    } else {
                        console.error(`[CompletionCheck] Failed to mark completed (Optimistic lock?): ${updateError?.message}`);
                    }
                } else {
                    console.log(`[CompletionCheck] Campaign already completed or not found.`);
                }
            }
        }

        if (isSuccess) {
            if (!alreadySent) {
                await supabase.rpc('increment_campaign_sent_count', { campaign_id: campaignId });
            }
            return new Response(JSON.stringify({ success: true, id: uazapiMessageId, skipped: alreadySent }), { headers: { "Content-Type": "application/json" }, status: 200 });
        } else {
            return new Response(JSON.stringify({ success: false, error: errorMessage }), { status: 500 });
        }
    } catch (error) {
        console.error("[Process-Message] Unhandled Error:", error);
        return new Response(JSON.stringify({
            error: (error as Error).message,
            stack: (error as Error).stack
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});
