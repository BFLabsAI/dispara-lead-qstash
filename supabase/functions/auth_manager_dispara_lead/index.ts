import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Secrets
const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const APP_CONFIG = {
    url: 'https://disparalead.app',
    senderName: 'Dispara Lead',
    senderEmail: 'tecnologia@bflabs.com.br'
};

const getBearerToken = (req: Request) => {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return null;

    const token = authHeader.slice('Bearer '.length).trim();
    return token || null;
};

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { action, email, name, tenant_id, role, redirectTo, is_super_admin } = await req.json();

        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
            throw new Error("Missing Supabase configuration");
        }

        const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const supabaseAuth = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") || "");

        // HELPER: Send Email via Brevo
        const sendBrevoEmail = async ({ type, toEmail, toName, variables }: any) => {
            // 1. Fetch Template
            const { data: template } = await supabaseAdmin
                .from('email_templates_dispara_lead_saas')
                .select('subject, html_content')
                .eq('type', type)
                .single();

            // Fallback
            const defaultHtml = `<h1>${type}</h1><p>Click: {{action_url}}</p>`;
            let html = template?.html_content || defaultHtml;
            let subject = template?.subject || `Dispara Lead - ${type}`;

            // 2. Inject Variables
            for (const [key, value] of Object.entries(variables)) {
                const placeholder = `{{${key}}}`;
                html = html.replaceAll(placeholder, String(value));
                subject = subject.replaceAll(placeholder, String(value));
            }

            // 3. Call Brevo
            if (!BREVO_API_KEY) {
                throw new Error("BREVO_API_KEY not set");
            }

            const endpoint = 'https://api.brevo.com/v3/smtp/email';
            const body = {
                sender: { name: APP_CONFIG.senderName, email: APP_CONFIG.senderEmail },
                to: [{ email: toEmail, name: toName }],
                subject: subject,
                htmlContent: html
            };

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'accept': 'application/json',
                    'api-key': BREVO_API_KEY,
                    'content-type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errText = await response.text();
                console.error(`Brevo API Error: ${response.status} - ${errText}`);
                throw new Error(`Brevo API Error: ${errText}`);
            }
        };

        // --- ACTIONS ---

        if (action === 'invite') {
            const requesterToken = getBearerToken(req);
            if (!requesterToken) {
                throw new Error("Unauthorized");
            }

            const { data: authData, error: authError } = await supabaseAuth.auth.getUser(requesterToken);
            const requester = authData?.user;
            if (authError || !requester) {
                throw new Error("Unauthorized");
            }

            console.log(`[AUTH_MANAGER] Starting invite for ${email}`);
            const isGlobalSuperAdmin = Boolean(is_super_admin);
            const emailTemplateType = isGlobalSuperAdmin ? 'super_admin_invite' : 'invite';
            const invitedTenantId = isGlobalSuperAdmin ? '__global_super_admin__' : tenant_id;

            if (!email) {
                throw new Error("Email is required");
            }

            if (!isGlobalSuperAdmin && !tenant_id) {
                throw new Error("Tenant ID is required for non-super-admin invites");
            }

            const { data: requesterProfile, error: requesterProfileError } = await supabaseAdmin
                .from('users_dispara_lead_saas_02')
                .select('role, tenant_id, is_super_admin')
                .eq('id', requester.id)
                .single();

            if (requesterProfileError || !requesterProfile) {
                throw new Error("Unauthorized");
            }

            const requesterIsSuperAdmin = Boolean(requesterProfile.is_super_admin);
            const requesterIsTenantAdmin = requesterProfile.role === 'owner' || requesterProfile.role === 'admin';

            if (isGlobalSuperAdmin) {
                if (!requesterIsSuperAdmin) {
                    throw new Error("Forbidden");
                }
            } else {
                if (!requesterIsSuperAdmin && !requesterIsTenantAdmin) {
                    throw new Error("Forbidden");
                }

                if (!requesterIsSuperAdmin && requesterProfile.tenant_id !== tenant_id) {
                    throw new Error("Forbidden");
                }
            }

            // 0. Ensure user exists (Create if not exists)
            const { error: createError } = await supabaseAdmin.auth.admin.createUser({
                email: email,
                email_confirm: true,
                user_metadata: {
                    full_name: name || email.split('@')[0],
                    ...(invitedTenantId ? { invited_to_tenant_id: invitedTenantId } : {}),
                    ...(isGlobalSuperAdmin ? { skip_profile_bootstrap: true } : {}),
                },
                app_metadata: isGlobalSuperAdmin ? { is_super_admin: true } : undefined,
            });

            if (createError && !createError.message.includes("already registered") && !createError.message.includes("already exists")) {
                console.warn("[AUTH_MANAGER] Create user warning:", createError);
            }

            // 1. Generate Magic Link
            const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
                type: 'magiclink',
                email: email,
                options: { redirectTo: redirectTo }
            });

            if (linkError) {
                console.error("[AUTH_MANAGER] Generate Link Error:", linkError);
                throw linkError;
            }

            const targetUser = linkData.user;
            if (!targetUser) throw new Error("Failed to resolve user from link generation");

            // 2. Upsert User Profile
            const finalRole = isGlobalSuperAdmin
                ? ((role === 'user' ? 'admin' : role) || 'admin')
                : ((role === 'user' ? 'member' : role) || 'member');
            console.log(`[AUTH_MANAGER] Upserting user: ${targetUser.id} | Role: ${finalRole}`);

            const { error: upsertError } = await supabaseAdmin
                .from('users_dispara_lead_saas_02')
                .upsert({
                    id: targetUser.id,
                    email: email,
                    full_name: name || email.split('@')[0],
                    tenant_id: isGlobalSuperAdmin ? null : tenant_id,
                    role: finalRole,
                    is_super_admin: isGlobalSuperAdmin,
                }, { onConflict: 'id' });

            if (upsertError) {
                console.error('[AUTH_MANAGER] Upsert Error:', upsertError);
                // Try to delete the auth user to prevent zombie state
                await supabaseAdmin.auth.admin.deleteUser(targetUser.id);
                throw new Error(`Database Error saving new user: ${upsertError.message}`);
            }

            // 3. Send Email
            await sendBrevoEmail({
                type: emailTemplateType,
                toEmail: email,
                toName: name,
                variables: {
                    action_url: linkData.properties.action_link,
                    name: name || 'Colaborador',
                    email: email
                }
            });

            return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        if (action === 'recovery') {
            const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
                type: 'recovery',
                email: email,
                options: { redirectTo: redirectTo }
            });

            if (linkError) throw linkError;
            const targetUser = linkData.user;

            // Fetch name
            let userName = email.split('@')[0];
            if (targetUser) {
                const { data: p } = await supabaseAdmin
                    .from('users_dispara_lead_saas_02')
                    .select('full_name')
                    .eq('id', targetUser.id)
                    .single();
                if (p?.full_name) userName = p.full_name;
            }

            await sendBrevoEmail({
                type: 'recovery',
                toEmail: email,
                toName: userName,
                variables: {
                    action_url: linkData.properties.action_link,
                    name: userName,
                    email: email
                }
            });

            return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        throw new Error(`Unknown action: ${action}`);

    } catch (error) {
        console.error('Auth Manager Error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    }
});
