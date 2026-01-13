import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { Receiver } from "https://esm.sh/@upstash/qstash@2.7.17"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const QSTASH_CURRENT_SIGNING_KEY = Deno.env.get('QSTASH_CURRENT_SIGNING_KEY') ?? '';
const QSTASH_NEXT_SIGNING_KEY = Deno.env.get('QSTASH_NEXT_SIGNING_KEY') ?? '';
const UAZAPI_BASE_URL = Deno.env.get('UAZAPI_BASE_URL') ?? '';
const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY') ?? '';

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
        const isValid = await receiver.verify({ signature, body });
        if (!isValid) {
            return new Response("Invalid signature", { status: 401 });
        }

        const payload = JSON.parse(body);
        const { messageId, phoneNumber, messageContent, instanceName, campaignId, tenantId, mediaUrl, mediaType, metadata: originalMetadata } = payload;

        if (!messageId || !phoneNumber || !instanceName || !campaignId) {
            return new Response("Missing required fields", { status: 400 });
        }

        let isSuccess = false;
        let uazapiMessageId: string | null = null;
        let uazapiResponse: any = null;
        let errorMessage: string | null = null;
        let alreadySent = false;
        let instanceToken: string | null = null;
        let rewrittenContent = messageContent;
        let aiUsed = false;
        let aiError: string | null = null;
        let usedModel = "";

        // --- Fetch Instance Data ---
        const { data: instanceData, error: instanceError } = await supabase
            .from('instances_dispara_lead_saas_02')
            .select('uazapi_instance_id, metadata')
            .eq('instance_name', instanceName)
            .eq('tenant_id', tenantId)
            .single();

        if (instanceError || !instanceData) {
            console.error(`Instance '${instanceName}' not found for tenant '${tenantId}'`);
            // Only update log if it's the first attempt
            await supabase.from('message_logs_dispara_lead_saas_03').update({
                status: 'failed',
                error_message: 'Instance not found in DB'
            }).eq('id', messageId);
            return new Response("Instance not found", { status: 404 });
        }

        instanceToken = instanceData.metadata?.token || instanceData.metadata?.apikey;
        if (!instanceToken) {
            await supabase.from('message_logs_dispara_lead_saas_03').update({
                status: 'failed',
                error_message: 'Instance token missing'
            }).eq('id', messageId);
            return new Response("Instance token missing", { status: 500 });
        }

        // --- Idempotency Check ---
        const { data: existingLog } = await supabase
            .from('message_logs_dispara_lead_saas_03')
            .select('status, provider_message_id, message_content')
            .eq('id', messageId)
            .single();

        if (existingLog && existingLog.status === 'sent') {
            console.log(`[Idempotency-AI] Message ${messageId} already sent. Skipping send logic.`);
            alreadySent = true;
            uazapiMessageId = existingLog.provider_message_id;
            rewrittenContent = existingLog.message_content;
            isSuccess = true;
        }
        // -------------------------

        if (!alreadySent) {
            // --- AI Processing ---
            console.log(`[AI Debug] Params: HasKey=${!!OPENROUTER_API_KEY}, KeyLen=${OPENROUTER_API_KEY?.length}, ContentLen=${messageContent?.length}`);

            if (OPENROUTER_API_KEY) {
                const systemPrompt = `REGRAS OBRIGATÓRIAS:
1. Mantenha APENAS os elementos presentes no original (se tem saudação/emoji/despedida mantém, se não tem não adiciona)
2. NÃO invente informações, contextos ou suposições que não existem no original
3. Respeite o NÍVEL DE FORMALIDADE da mensagem original - não force informalidade excessiva
4. Cada frase precisa fazer sentido lógico completo

TAREFA:
Reescreva essa mensagem criando uma versão diferente em estrutura e vocabulário, mantendo o mesmo propósito, informações e tom.

VARIE:
- Estrutura das frases (ordem, tamanho)
- Vocabulário (sinônimos naturais)
- Forma de fazer perguntas

Use português brasileiro natural, mas sem exageros de gírias ou informalidade. A mensagem deve soar como alguém conversando normalmente, não como quem está tentando forçar ser descolado.

Responda SOMENTE com a mensagem reescrita.`;
                const models = [
                    "google/gemini-2.5-flash-lite-preview-09-2025",
                    "nvidia/llama-3.3-nemotron-super-49b-v1.5",
                    "openai/gpt-4.1-nano",
                    "x-ai/grok-4.1-fast"
                ];

                // Shuffle models
                for (let i = models.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [models[i], models[j]] = [models[j], models[i]];
                }

                for (const model of models) {
                    try {
                        console.log(`AI: Attempting with model ${model}...`);
                        const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                            method: "POST",
                            headers: {
                                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                                "Content-Type": "application/json",
                                "HTTP-Referer": "https://disparalead.com",
                                "X-Title": "DisparaLead"
                            },
                            body: JSON.stringify({
                                "model": model,
                                "messages": [
                                    { "role": "system", "content": systemPrompt },
                                    { "role": "user", "content": messageContent }
                                ]
                            })
                        });

                        if (aiResponse.ok) {
                            const aiData = await aiResponse.json();
                            rewrittenContent = aiData.choices?.[0]?.message?.content || messageContent;
                            aiUsed = true;
                            usedModel = model;
                            aiError = null;
                            break;
                        } else {
                            const errorText = await aiResponse.text();
                            console.warn(`AI API Failed for ${model}: ${aiResponse.status} - ${errorText}`);
                            aiError = `AI Failed (${model}): ${aiResponse.status}`;
                        }
                    } catch (e) {
                        console.error(`AI Exception for ${model}:`, e);
                        aiError = `AI Error (${model}): ` + (e as Error).message;
                    }
                }
            } else {
                aiError = "OPENROUTER_API_KEY_MISSING";
            }

            try {
                let endpoint = '';
                let bodyData: any = {};

                if (mediaUrl) {
                    endpoint = `${UAZAPI_BASE_URL || 'https://bflabs.uazapi.com'}/send/media`;
                    const uazapiMediaType = {
                        'imagem': 'image',
                        'video': 'video',
                        'audio': 'audio'
                    }[mediaType as string] || mediaType;

                    bodyData = {
                        number: phoneNumber,
                        file: mediaUrl,
                        type: uazapiMediaType,
                        text: rewrittenContent
                    };
                } else {
                    endpoint = `${UAZAPI_BASE_URL || 'https://bflabs.uazapi.com'}/send/text`;
                    bodyData = {
                        number: phoneNumber,
                        text: rewrittenContent,
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
            const updatePayload: any = {
                status: isSuccess ? 'sent' : 'failed',
                sent_at: now,
                provider_message_id: uazapiMessageId,
                provider_response: uazapiResponse,
                error_message: errorMessage || aiError,
                message_content: rewrittenContent
            };

            const dbMetadata = existingLog?.metadata || {};
            const existingMetadata = { ...dbMetadata, ...(originalMetadata || {}) };

            if (aiUsed) {
                updatePayload.metadata = {
                    ...existingMetadata,
                    original_content: messageContent,
                    ai_model: usedModel,
                    ai_rewritten: true,
                    ai_response_status: "success"
                };
            } else if (aiError) {
                updatePayload.metadata = {
                    ...existingMetadata,
                    original_content: messageContent,
                    ai_error: aiError,
                    ai_attempted: true
                };
            }

            await supabase.from('message_logs_dispara_lead_saas_03').update(updatePayload).eq('id', messageId);
        }

        // --- Campaign Completion Notification ---
        if (campaignId) {
            console.log(`[CompletionCheck-AI] Checking for campaign ${campaignId} (Current message: ${messageId})`);
            const { count, error: countError } = await supabase
                .from('message_logs_dispara_lead_saas_03')
                .select('id', { count: 'exact', head: true })
                .eq('campaign_id', campaignId)
                .neq('id', messageId) // Race-condition proof
                .in('status', ['queued', 'pending']);

            const pendingCount = count || 0;
            console.log(`[CompletionCheck-AI] Other messages pending: ${pendingCount}`);

            if (pendingCount === 0) {
                const { data: campaign } = await supabase
                    .from('campaigns_dispara_lead_saas_02')
                    .select('*')
                    .eq('id', campaignId)
                    .single();

                if (campaign && !campaign.completed_at) {
                    const { error: updateError } = await supabase
                        .from('campaigns_dispara_lead_saas_02')
                        .update({ completed_at: new Date().toISOString(), status: 'completed' })
                        .eq('id', campaignId)
                        .is('completed_at', null);

                    if (!updateError) {
                        const { data: stats } = await supabase
                            .from('message_logs_dispara_lead_saas_03')
                            .select('sent_at, instance_name, campaign_type, metadata')
                            .eq('campaign_id', campaignId);

                        if (stats && stats.length > 0) {
                            const totalMessages = stats.length;
                            const uniqueInstances = [...new Set(stats.map(s => s.instance_name).filter(Boolean))];
                            const sortedDates = stats.map(s => s.sent_at ? new Date(s.sent_at).getTime() : 0).filter(t => t > 0).sort((a, b) => a - b);
                            const startTime = sortedDates.length > 0 ? new Date(sortedDates[0]).toLocaleString('pt-BR') : 'N/A';
                            const endTime = new Date().toLocaleString('pt-BR');

                            const { data: settings } = await supabase
                                .from('company_settings_dispara_lead_saas_02')
                                .select('report_notification_phones')
                                .eq('tenant_id', tenantId)
                                .single();

                            if (settings?.report_notification_phones?.length) {
                                const notificationText = `🎉 *Ótimas notícias, finalizamos mais uma campanha!* (Via IA 🤖)

📊 *Dados da Ação:*
*Campanha:* ${campaign.name}
*Público:* ${campaign.target_audience || 'N/A'}
*Criativo:* ${campaign.creative ? (campaign.creative.substring(0, 30) + (campaign.creative.length > 30 ? '...' : '')) : 'N/A'}

📈 *KPI's da Ação:*
*Modo:* 🤖 Inteligência Artificial
*Disparos Realizados:* ${totalMessages}
*Instâncias Utilizadas:*
${uniqueInstances.map(i => `- ${i}`).join('\n')}

🕒 *Cronograma:*
Início: ${startTime}
Fim: ${endTime}`;

                                const notifEndpoint = `${UAZAPI_BASE_URL || 'https://bflabs.uazapi.com'}/send/text`;
                                await Promise.all(settings.report_notification_phones.map(async (phone: string) => {
                                    try {
                                        await fetch(notifEndpoint, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json', 'token': instanceToken! },
                                            body: JSON.stringify({
                                                number: phone.replace(/\D/g, ""),
                                                text: notificationText
                                            })
                                        });
                                    } catch (e) {
                                        console.error(`Failed to notify ${phone}`, e);
                                    }
                                }));
                            }
                        }
                    }
                }
            }
        }

        if (isSuccess) {
            if (!alreadySent) {
                await supabase.rpc('increment_campaign_sent_count', { campaign_id: campaignId });
            }
            return new Response(JSON.stringify({ success: true, id: uazapiMessageId }), { headers: { "Content-Type": "application/json" }, status: 200 });
        } else {
            return new Response(JSON.stringify({ success: false, error: errorMessage }), { status: 500 });
        }
    } catch (error) {
        console.error("Global Error:", error);
        return new Response((error as Error).message, { status: 500 });
    }
});
