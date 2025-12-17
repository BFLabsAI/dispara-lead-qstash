import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const UAZAPI_BASE_URL = Deno.env.get('UAZAPI_BASE_URL') || '';
const UAZAPI_TOKEN = Deno.env.get('UAZAPI_TOKEN') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { action, ...params } = await req.json();
        let result = null;

        // Log the incoming request
        await supabase.from('uazapi_logs_dispara_lead_saas_02').insert({
            action,
            request_payload: params,
            created_at: new Date().toISOString()
        });

        switch (action) {
            case 'create_instance':
                result = await createInstance(params);
                break;
            case 'get_qrcode':
                result = await getQrCode(params);
                break;
            case 'disconnect_instance':
                result = await disconnectInstance(params); // Uses new POST endpoint
                break;
            case 'delete_instance':
                result = await deleteInstance(params);
                break;
                // ...
                // ... in Helper Functions
                async function disconnectInstance({ instanceName }) {
                    const { data } = await supabase.from('instances_dispara_lead_saas_02').select('token').eq('instance_name', instanceName).single();

                    // User requested endpoint
                    const endpoint = `${UAZAPI_BASE_URL}/instance/disconnect`;

                    const response = await fetch(endpoint, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'token': data?.token
                        },
                        body: JSON.stringify({ reason: "user_requested" }) // Optional
                    });

                    if (response.ok || response.status === 404) { // 404 means already restricted/gone
                        await supabase
                            .from('instances_dispara_lead_saas_02')
                            .update({ status: 'disconnected', qrcode: null })
                            .eq('instance_name', instanceName);
                        return { success: true };
                    }

                    // If not OK, log error but maybe we should still mark disconnected locally?
                    // Let's rely on status sync or webhook to confirm.
                    const errorBody = await response.text();
                    throw new Error(`Disconnect failed: ${response.status} - ${errorBody}`);
                }
            case 'logout_instance':
                result = await logoutInstance(params);
                break;
            case 'get_connection_status':
                result = await getConnectionStatus(params);
                break;
            case 'send_message':
                result = await sendMessage(params);
                break;
            case 'send_media': // Added for completeness if frontend calls it
                result = await sendMedia(params);
                break;
            default:
                throw new Error(`Unknown action: ${action}`);
        }

        // Log success response
        await supabase.from('uazapi_logs_dispara_lead_saas_02').insert({
            action: `${action}_response`,
            response_payload: result,
            status_code: 200,
            created_at: new Date().toISOString()
        });

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error) {
        console.error('Proxy Error:', error);

        // Log error
        await supabase.from('uazapi_logs_dispara_lead_saas_02').insert({
            action: 'error',
            response_payload: { error: error.message },
            status_code: 500,
            created_at: new Date().toISOString()
        });

        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200, // Return 200 with error body for frontend handling
        });
    }
});

// --- Helper Functions ---

// --- Helper Functions ---

async function createInstance({ instanceName, tenant_id }) {
    if (!instanceName || !tenant_id) throw new Error("Missing instanceName or tenant_id");

    const endpoint = `${UAZAPI_BASE_URL}/instance/init`;
    const body = {
        name: instanceName,
        systemName: 'dispara-lead',
        adminField01: tenant_id,
        adminField02: 'created_via_app'
    };

    console.log(`Creating instance: ${instanceName} at ${endpoint}`);

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'admintoken': UAZAPI_TOKEN
        },
        body: JSON.stringify(body)
    });

    const data = await response.json();

    if (response.ok) {
        const instanceToken = data.token || data.hash?.apikey;

        // Save with status 'disconnected' initially
        await supabase.from('instances_dispara_lead_saas_02').insert({
            tenant_id,
            instance_name: instanceName,
            uazapi_instance_id: data.instance?.instanceId || instanceName,
            token: instanceToken,
            status: 'disconnected', // Initial status must be disconnected
            metadata: data
        });

        // Attempt webhook registration immediately (best effort)
        if (instanceToken) {
            await ensureWebhooks(instanceName, instanceToken);
        }

        return data;
    }

    const errorDetail = `Upstream Error: ${response.status} - ${JSON.stringify(data)}`;
    console.error(errorDetail);
    throw new Error(data.message || errorDetail);
}

// Updated Webhook Logic based on USER REQUEST
async function ensureWebhooks(instanceName, instanceToken) {
    try {
        const webhookUrl = `${SUPABASE_URL}/functions/v1`;
        // We want to register 2 webhooks or 1 unified one? 
        // User provided logic suggests we can pass events array.
        // Let's create one webhook for both events to be cleaner, or two if URLs need to be different.
        // The playbook says: .../webhook_connection_audita_lead and .../webhook_messages_audita_lead
        // So we probably need two calls if the URLs differ.

        // 1. Connection Webhook
        await registerWebhook(instanceToken, `${webhookUrl}/webhook_connection_dispara_lead_saas`, ["connection"]);

        // 2. Messages Webhook
        await registerWebhook(instanceToken, `${webhookUrl}/webhook_messages_dispara_lead_saas`, ["messages"]);

    } catch (error) {
        console.error(`Error ensuring webhooks for ${instanceName}:`, error);
        // Don't throw, just log. This shouldn't block the UI flow.
    }
}

async function registerWebhook(token, url, events) {
    // 1. Check existing
    const getEndpoint = `${UAZAPI_BASE_URL}/webhook`;
    const getResponse = await fetch(getEndpoint, {
        method: 'GET',
        headers: { 'Accept': 'application/json', 'token': token }
    });

    if (getResponse.ok) {
        const existingHooks = await getResponse.json();
        // existingHooks is likely an array. Check if our URL matches.
        const found = Array.isArray(existingHooks) && existingHooks.find(h => h.url === url && h.enabled);
        if (found) {
            console.log(`Webhook for ${url} already exists.`);
            return;
        }
    }

    // 2. Register if not found
    const postEndpoint = `${UAZAPI_BASE_URL}/webhook`;
    const body = {
        action: "add",
        enabled: true,
        url: url,
        events: events,
        excludeMessages: ["wasSentByApi"] // Best practice
    };

    console.log(`Registering webhook: ${url} events: ${events}`);
    await fetch(postEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'token': token
        },
        body: JSON.stringify(body)
    });
}

async function getQrCode({ instanceName }) {
    // 1. Fetch from DB
    const { data: instance } = await supabase
        .from('instances_dispara_lead_saas_02')
        .select('qrcode, status, token, qrcode_generated_at')
        .eq('instance_name', instanceName)
        .single();

    if (!instance) throw new Error("Instance not found");

    // 2. Cache Check: If QR exists and is < 2 mins old, return it.
    if (instance.qrcode && instance.qrcode_generated_at) {
        const diffMs = new Date().getTime() - new Date(instance.qrcode_generated_at).getTime();
        const diffMins = diffMs / 60000;

        if (diffMins < 2 && instance.status !== 'open' && instance.status !== 'connected') {
            console.log("Returning cached QR Code");
            return { qrcode: instance.qrcode };
        }
    }

    // 3. Connect via API
    // Correct endpoint is /instance/connect (identified by token header)
    const endpoint = `${UAZAPI_BASE_URL}/instance/connect`;

    // Attempt POST first
    let response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'token': instance.token
        },
        body: JSON.stringify({ phone: "" })
    });

    // If 404/405, it might be that we need to just check status if it already has QR
    if (!response.ok) {
        console.log(`Connect POST failed (${response.status}), checking status...`);
        const statusEndpoint = `${UAZAPI_BASE_URL}/instance/status`;
        response = await fetch(statusEndpoint, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'token': instance.token
            }
        });
    }

    if (response.ok) {
        const data = await response.json();
        console.log("QR Response:", JSON.stringify(data).substring(0, 200));

        // Check for common fields including nested instance.qrcode
        const qrContent = data.base64 || data.qrcode || data.qr || data.instance?.qrcode;

        if (qrContent) {
            await supabase
                .from('instances_dispara_lead_saas_02')
                .update({
                    qrcode: qrContent,
                    qrcode_generated_at: new Date().toISOString()
                })
                .eq('instance_name', instanceName);
            return { qrcode: qrContent };
        }
        return data;
    }

    // Log upstream failure
    const errorBody = await response.text();
    console.error(`QR Fetch Error: ${response.status} - ${errorBody}`);

    // If 409 (Conflict), wait 3s and retry? (Simple retry logic)
    if (response.status === 409) {
        // ... (existing logic)
    }

    // Return detailed error to help debugging
    return { error: `QR Code unavailable: ${response.status}`, details: errorBody };
}

async function deleteInstance({ instanceName, tenant_id }) {
    // ...
    const endpoint = `${UAZAPI_BASE_URL}/instance/delete/${instanceName}`;
    const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: { 'admintoken': UAZAPI_TOKEN }
    });

    if (response.ok || response.status === 404) {
        await supabase
            .from('instances_dispara_lead_saas_02')
            .delete()
            .eq('instance_name', instanceName)
            .eq('tenant_id', tenant_id);
        return { success: true };
    }
    return { success: false };
}

async function logoutInstance({ instanceName }) {
    const { data } = await supabase.from('instances_dispara_lead_saas_02').select('token').eq('instance_name', instanceName).single();
    const endpoint = `${UAZAPI_BASE_URL}/instance/logout/${instanceName}`;
    await fetch(endpoint, {
        method: 'DELETE', // Logout is usually DELETE or POST depending on version. Sticking to DELETE as per prev code.
        headers: { 'token': data?.token }
    });
    return { success: true };
}

async function getConnectionStatus({ instanceName, ensure_webhooks }) {
    // 1. Get Token
    const { data: instance } = await supabase
        .from('instances_dispara_lead_saas_02')
        .select('token, status')
        .eq('instance_name', instanceName)
        .single();

    if (!instance?.token) return { instance: { state: 'disconnected' } };

    // 2. Call API
    const endpoint = `${UAZAPI_BASE_URL}/instance/status`;
    const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'token': instance.token
        }
    });

    let realStatus = 'disconnected';
    let data = null;

    if (response.ok) {
        data = await response.json();
        console.log("Upstream Data:", JSON.stringify(data));

        // Check multiple possible status fields based on different UazAPI versions
        const instanceStatus = data.instance?.status || data.instance?.state || data.state;
        const isConnectedBool = data.status?.connected === true;

        // Normalize
        if (instanceStatus === 'open' || instanceStatus === 'connected' || instanceStatus === 'PAIRED' || isConnectedBool) {
            realStatus = 'connected';
        }
    } else {
        console.error(`Upstream Error: ${response.status}`);
    }

    // 3. Sync DB
    await supabase
        .from('instances_dispara_lead_saas_02')
        .update({
            status: realStatus,
            last_connected_at: realStatus === 'connected' ? new Date().toISOString() : undefined
        })
        .eq('instance_name', instanceName);

    // 4. Ensure Webhooks (Lazy Fix)
    if (ensure_webhooks) {
        // Run in background (don't await to block response)
        ensureWebhooks(instanceName, instance.token);
    }

    return {
        instance: { state: realStatus },
        debug_upstream: data,
        upstream_status: response.status
    };
}

async function sendMessage({ instanceName, number, text }) {
    const { data } = await supabase
        .from('instances_dispara_lead_saas_02')
        .select('token')
        .eq('instance_name', instanceName)
        .single();

    if (!data?.token) throw new Error("Instance token not found");

    const endpoint = `${UAZAPI_BASE_URL}/send/text`;
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'token': data.token
        },
        body: JSON.stringify({
            number,
            text,
            delay: 1200,
            linkPreview: true
        })
    });
    return await response.json();
}

async function sendMedia({ instanceName, number, mediaUrl, mediaType, caption }) {
    const { data } = await supabase
        .from('instances_dispara_lead_saas_02')
        .select('token')
        .eq('instance_name', instanceName)
        .single();

    if (!data?.token) throw new Error("Instance token not found");

    const endpoint = `${UAZAPI_BASE_URL}/send/media`;
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'token': data.token
        },
        body: JSON.stringify({
            number,
            type: mediaType,
            file: mediaUrl,
            text: caption
        })
    });
    return await response.json();
}
