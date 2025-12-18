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
    // 1. Validate QStash Signature (skip JWT verif in supabase config)
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

        // 2. FETCH INSTANCE TOKEN
        const { data: instanceData, error: instanceError } = await supabase
            .from('instances_dispara_lead_saas_02')
            .select('token')
            .eq('instance_name', instanceName)
            .single();

        if (instanceError || !instanceData?.token) {
            console.error(`Instance not found or no API key: ${instanceName}`);
            await supabase
                .from('message_logs_dispara_lead_saas_03')
                .update({ status: 'failed', error_message: 'Instance config error' })
                .eq('id', messageId);
            return new Response("Instance configuration error", { status: 200 }); // 200 to stop retry
        }

        const instanceToken = instanceData.token;

        // 3. AI REWRITING (OpenRouter)
        // Only rewrite Text content. If it's media, we might just use the caption? 
        // Assuming messageContent is the text/caption.
        let rewrittenContent = messageContent;
        let aiUsed = false;
        let aiError = null;

        if (OPENROUTER_API_KEY && messageContent && messageContent.trim().length > 0) {
            try {
                const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                        "Content-Type": "application/json",
                        "HTTP-Referer": "https://disparalead.com.br", // Site URL
                        "X-Title": "Dispara Lead AI", // App Name
                    },
                    body: JSON.stringify({
                        model: "google/gemini-2.5-flash-lite",
                        messages: [
                            {
                                role: "system",
                                content: "You are an AI assistant that rewrites marketing messages to avoid spam filters while strictly preserving the original meaning, intent, tone, and call-to-action. Rewrite the user's message in Portuguese (Brazil). Output ONLY the rewritten message text, nothing else. Do not add quotes."
                            },
                            {
                                role: "user",
                                content: messageContent
                            }
                        ]
                    })
                });

                if (aiResponse.ok) {
                    const aiData = await aiResponse.json();
                    const newText = aiData.choices?.[0]?.message?.content;
                    if (newText) {
                        rewrittenContent = newText.trim();
                        aiUsed = true;
                    }
                } else {
                    const errText = await aiResponse.text();
                    console.error("OpenRouter Error:", errText);
                    aiError = "AI Service Unavailable";
                }
            } catch (err) {
                console.error("AI Exception:", err);
                aiError = err.message;
            }
        }

        // 4. SEND TO UAZAPI
        let uazapiResponse;
        let isSuccess = false;
        let errorMessage = '';
        let uazapiMessageId = null;

        try {
            let endpoint = `${UAZAPI_BASE_URL}/send/text`;
            let bodyData: any = {
                number: phoneNumber,
                text: rewrittenContent, // Use Rescrita
                delay: 1200,
                linkPreview: true
            };

            if (mediaUrl && mediaType) {
                // Map Portuguese types to English for UazAPI
                const uazapiMediaType = {
                    'imagem': 'image',
                    'video': 'video',
                    'audio': 'audio'
                }[mediaType] || mediaType;

                endpoint = `${UAZAPI_BASE_URL}/send/media`;
                bodyData = {
                    number: phoneNumber,
                    file: mediaUrl,
                    type: uazapiMediaType,
                    text: rewrittenContent // Caption
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

        // 5. UPDATE LOGS
        const now = new Date().toISOString();

        // Prepare update object
        const updatePayload: any = {
            status: isSuccess ? 'sent' : 'failed',
            sent_at: now,
            provider_message_id: uazapiMessageId,
            provider_response: uazapiResponse,
            error_message: errorMessage || aiError // Capture AI error if send succeeded but AI failed? No, prioritized send error.
        };

        // If AI was used, we might want to store the rewritten text? 
        // The table schema might not have a dedicated column, but we can put it in metadata or message_content?
        // Let's UPDATE the message_content in the log to reflect what was actually sent, 
        // AND add metadata about original vs rewritten.
        if (aiUsed) {
            updatePayload.message_content = rewrittenContent;
            updatePayload.metadata = {
                original_content: messageContent,
                ai_model: "gemini-2.5-flash-lite",
                ai_rewritten: true
            };
        }

        await supabase
            .from('message_logs_dispara_lead_saas_03')
            .update(updatePayload)
            .eq('id', messageId);

        if (isSuccess) {
            await supabase.rpc('increment_campaign_sent_count', { campaign_id: campaignId });
            return new Response(JSON.stringify({ success: true, id: uazapiMessageId }), {
                headers: { "Content-Type": "application/json" },
                status: 200
            });
        } else {
            // Smart Retry Logic for UazAPI
            const status = uazapiResponse?.status || 500;
            if (status >= 500 || status === 429) {
                return new Response(JSON.stringify({ success: false, error: errorMessage }), { status: 500 });
            } else {
                return new Response(JSON.stringify({ success: false, error: errorMessage }), { status: 200 });
            }
        }

    } catch (error) {
        console.error(error);
        return new Response(error.message, { status: 500 });
    }
});
