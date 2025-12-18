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

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { action, email, name, tenant_id, role, redirectTo } = await req.json();

        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
            throw new Error("Missing Supabase configuration");
        }

        const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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
                console.warn("BREVO_API_KEY not set. Email skipped.");
                return;
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
            // 0. Ensure user exists (Create if not exists)
            // This handles cases where user was deleted or is brand new
            const { error: createError } = await supabaseAdmin.auth.admin.createUser({
                email: email,
                email_confirm: true, // Auto-confirm since admin is inviting
                user_metadata: { full_name: name || email.split('@')[0] }
            });

            // Ignore "User already registered" error
            if (createError && !createError.message.includes("already registered") && !createError.message.includes("already exists")) {
                console.warn("Create user warning (ignoring if duplicate):", createError);
                // We don't throw here immediately, we let generateLink fail if it's a real issue,
                // or simply proceed if the user already exists.
            }

            // 1. Generate Magic Link
            const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
                type: 'magiclink',
                email: email,
                options: { redirectTo: redirectTo }
            });

            if (linkError) throw linkError;
            const targetUser = linkData.user;
            if (!targetUser) throw new Error("Failed to resolve user");

            // 2. Upsert User Profile
            await supabaseAdmin
                .from('users_dispara_lead_saas_02')
                .upsert({
                    id: targetUser.id,
                    email: email,
                    full_name: name || email.split('@')[0],
                    tenant_id: tenant_id, // Assign to tenant
                    role: role || 'user' // Use provided role
                }, { onConflict: 'id' });

            // 3. Send Email
            await sendBrevoEmail({
                type: 'invite',
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
        return new Response(JSON.stringify({ error: `Auth Manager Error: ${error.message}` }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    }
});
