import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Secrets
const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const PROFILE_TABLE = "users_dispara_lead_saas_02";
const MEMBERSHIP_TABLE = "user_tenant_memberships_dispara_lead_saas_02";

type MembershipRole = "owner" | "admin" | "member";

type UserProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: MembershipRole | string | null;
  tenant_id: string | null;
  current_tenant_id: string | null;
  is_super_admin: boolean | null;
};

type TenantMembership = {
  user_id: string;
  tenant_id: string;
  role: MembershipRole;
  status: string;
};

const APP_CONFIG = {
  url: "https://disparalead.app",
  senderName: "Dispara Lead",
  senderEmail: "tecnologia@bflabs.com.br",
};

const normalizeRole = (
  role: unknown,
  fallback: MembershipRole = "member",
): MembershipRole => {
  if (role === "owner" || role === "admin" || role === "member") {
    return role;
  }

  if (role === "user") {
    return "member";
  }

  return fallback;
};

const getEffectiveTenantId = (
  profile: Pick<UserProfile, "tenant_id" | "current_tenant_id"> | null,
) => profile?.current_tenant_id ?? profile?.tenant_id ?? null;

const getBearerToken = (req: Request) => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice("Bearer ".length).trim();
  return token || null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, email, name, tenant_id, role, redirectTo, is_super_admin } =
      await req.json();

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase configuration");
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const supabaseAuth = createClient(
      SUPABASE_URL,
      Deno.env.get("SUPABASE_ANON_KEY") || "",
    );

    // HELPER: Send Email via Brevo
    const sendBrevoEmail = async (
      { type, toEmail, toName, variables }: any,
    ) => {
      const { data: template } = await supabaseAdmin
        .from("email_templates_dispara_lead_saas")
        .select("subject, html_content")
        .eq("type", type)
        .single();

      const defaultHtml = `<h1>${type}</h1><p>Click: {{action_url}}</p>`;
      let html = template?.html_content || defaultHtml;
      let subject = template?.subject || `Dispara Lead - ${type}`;

      for (const [key, value] of Object.entries(variables)) {
        const placeholder = `{{${key}}}`;
        html = html.replaceAll(placeholder, String(value));
        subject = subject.replaceAll(placeholder, String(value));
      }

      if (!BREVO_API_KEY) {
        throw new Error("BREVO_API_KEY not set");
      }

      const endpoint = "https://api.brevo.com/v3/smtp/email";
      const body = {
        sender: { name: APP_CONFIG.senderName, email: APP_CONFIG.senderEmail },
        to: [{ email: toEmail, name: toName }],
        subject: subject,
        htmlContent: html,
      };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "accept": "application/json",
          "api-key": BREVO_API_KEY,
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`Brevo API Error: ${response.status} - ${errText}`);
        throw new Error(`Brevo API Error: ${errText}`);
      }
    };

    const getProfileById = async (profileId: string) => {
      const { data, error } = await supabaseAdmin
        .from(PROFILE_TABLE)
        .select(
          "id, email, full_name, role, tenant_id, current_tenant_id, is_super_admin",
        )
        .eq("id", profileId)
        .maybeSingle();

      if (error) throw error;
      return data as UserProfile | null;
    };

    const getMembership = async (
      memberUserId: string,
      memberTenantId: string,
    ) => {
      const { data, error } = await supabaseAdmin
        .from(MEMBERSHIP_TABLE)
        .select("user_id, tenant_id, role, status")
        .eq("user_id", memberUserId)
        .eq("tenant_id", memberTenantId)
        .maybeSingle();

      if (error) throw error;
      return data as TenantMembership | null;
    };

    const ensureProfile = async ({
      targetUserId,
      targetEmail,
      targetName,
      targetRole,
      targetTenantId,
      targetIsSuperAdmin,
    }: {
      targetUserId: string;
      targetEmail: string;
      targetName: string;
      targetRole: MembershipRole;
      targetTenantId: string | null;
      targetIsSuperAdmin: boolean;
    }) => {
      const existingProfile = await getProfileById(targetUserId);

      if (!existingProfile) {
        const { error: insertError } = await supabaseAdmin.from(PROFILE_TABLE)
          .insert({
            id: targetUserId,
            email: targetEmail,
            full_name: targetName,
            role: targetRole,
            tenant_id: targetTenantId,
            current_tenant_id: targetTenantId,
            is_super_admin: targetIsSuperAdmin,
          });

        if (insertError) throw insertError;
        return;
      }

      const updates: Record<string, unknown> = {
        email: targetEmail,
        full_name: targetName,
      };

      if (targetIsSuperAdmin && !existingProfile.is_super_admin) {
        updates.is_super_admin = true;
      }

      if (!existingProfile.role) {
        updates.role = targetRole;
      }

      if (!existingProfile.tenant_id && targetTenantId) {
        updates.tenant_id = targetTenantId;
      }

      if (!existingProfile.current_tenant_id && targetTenantId) {
        updates.current_tenant_id = targetTenantId;
      }

      const { error: updateError } = await supabaseAdmin
        .from(PROFILE_TABLE)
        .update(updates)
        .eq("id", targetUserId);

      if (updateError) throw updateError;
    };

    const ensureMembership = async ({
      targetUserId,
      targetTenantId,
      targetRole,
      invitedBy,
    }: {
      targetUserId: string;
      targetTenantId: string;
      targetRole: MembershipRole;
      invitedBy: string;
    }) => {
      const { error } = await supabaseAdmin
        .from(MEMBERSHIP_TABLE)
        .upsert(
          {
            user_id: targetUserId,
            tenant_id: targetTenantId,
            role: targetRole,
            status: "active",
            invited_by: invitedBy,
          },
          { onConflict: "user_id,tenant_id" },
        );

      if (error) throw error;
    };

    const getRequestersTenantRole = async (
      requesterId: string,
      scopeTenantId: string | null,
    ) => {
      if (!scopeTenantId) {
        return normalizeRole(null, "member");
      }

      const membership = await getMembership(requesterId, scopeTenantId);
      if (membership?.status === "active") {
        return membership.role;
      }

      const requesterProfile = await getProfileById(requesterId);
      if (
        requesterProfile &&
        (requesterProfile.current_tenant_id === scopeTenantId ||
          requesterProfile.tenant_id === scopeTenantId)
      ) {
        return normalizeRole(requesterProfile.role, "member");
      }

      return null;
    };

    const authorizeTenantAction = async (
      requesterId: string,
      scopeTenantId: string | null,
      isSuperAdmin: boolean,
    ) => {
      if (isSuperAdmin) {
        return;
      }

      if (!scopeTenantId) {
        throw new Error("Tenant ID is required for this action");
      }

      const tenantRole = await getRequestersTenantRole(
        requesterId,
        scopeTenantId,
      );
      if (tenantRole !== "owner" && tenantRole !== "admin") {
        throw new Error("Forbidden");
      }
    };

    // --- ACTIONS ---

    if (action === "invite") {
      const requesterToken = getBearerToken(req);
      if (!requesterToken) {
        throw new Error("Unauthorized");
      }

      const { data: authData, error: authError } = await supabaseAuth.auth
        .getUser(requesterToken);
      const requester = authData?.user;
      if (authError || !requester) {
        throw new Error("Unauthorized");
      }

      console.log(`[AUTH_MANAGER] Starting invite for ${email}`);
      const isGlobalSuperAdmin = Boolean(is_super_admin);
      const emailTemplateType = isGlobalSuperAdmin
        ? "super_admin_invite"
        : "invite";
      const invitedTenantId = isGlobalSuperAdmin
        ? "__global_super_admin__"
        : tenant_id;
      const targetTenantId = isGlobalSuperAdmin ? null : (tenant_id || null);

      if (!email) {
        throw new Error("Email is required");
      }

      const requesterProfile = await getProfileById(requester.id);
      if (!requesterProfile) {
        throw new Error("Unauthorized");
      }

      const requesterIsSuperAdmin = Boolean(requesterProfile.is_super_admin);

      if (isGlobalSuperAdmin) {
        if (!requesterIsSuperAdmin) {
          throw new Error("Forbidden");
        }
      } else {
        if (!targetTenantId) {
          throw new Error("Tenant ID is required for non-super-admin invites");
        }

        await authorizeTenantAction(
          requester.id,
          targetTenantId,
          requesterIsSuperAdmin,
        );
      }

      const { error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        email_confirm: true,
        user_metadata: {
          full_name: name || email.split("@")[0],
          ...(invitedTenantId ? { invited_to_tenant_id: invitedTenantId } : {}),
          ...(isGlobalSuperAdmin ? { skip_profile_bootstrap: true } : {}),
        },
        app_metadata: isGlobalSuperAdmin ? { is_super_admin: true } : undefined,
      });

      if (
        createError && !createError.message.includes("already registered") &&
        !createError.message.includes("already exists")
      ) {
        console.warn("[AUTH_MANAGER] Create user warning:", createError);
      }

      const { data: linkData, error: linkError } = await supabaseAdmin.auth
        .admin.generateLink({
          type: "magiclink",
          email: email,
          options: { redirectTo: redirectTo },
        });

      if (linkError) {
        console.error("[AUTH_MANAGER] Generate Link Error:", linkError);
        throw linkError;
      }

      const targetUser = linkData.user;
      if (!targetUser) {
        throw new Error("Failed to resolve user from link generation");
      }

      const finalRole = isGlobalSuperAdmin
        ? normalizeRole(role, "admin")
        : normalizeRole(role, "member");

      console.log(
        `[AUTH_MANAGER] Ensuring profile: ${targetUser.id} | Role: ${finalRole}`,
      );

      await ensureProfile({
        targetUserId: targetUser.id,
        targetEmail: email,
        targetName: name || email.split("@")[0],
        targetRole: finalRole,
        targetTenantId: targetTenantId,
        targetIsSuperAdmin: isGlobalSuperAdmin,
      });

      if (targetTenantId) {
        await ensureMembership({
          targetUserId: targetUser.id,
          targetTenantId,
          targetRole: finalRole,
          invitedBy: requester.id,
        });
      }

      await sendBrevoEmail({
        type: emailTemplateType,
        toEmail: email,
        toName: name,
        variables: {
          action_url: linkData.properties.action_link,
          name: name || "Colaborador",
          email: email,
        },
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- ACTION: RESEND INVITE ---
    if (action === "resend_invite") {
      const requesterToken = getBearerToken(req);
      if (!requesterToken) {
        throw new Error("Unauthorized");
      }

      const { data: authData, error: authError } = await supabaseAuth.auth
        .getUser(requesterToken);
      const requester = authData?.user;
      if (authError || !requester) {
        throw new Error("Unauthorized");
      }

      if (!email) {
        throw new Error("Email is required");
      }

      console.log(`[AUTH_MANAGER] Resending invite for ${email}`);

      // Get requester profile
      const requesterProfile = await getProfileById(requester.id);
      if (!requesterProfile) {
        throw new Error("Unauthorized");
      }

      const requesterIsSuperAdmin = Boolean(requesterProfile.is_super_admin);
      const targetTenantId = tenant_id || null;

      // Authorize tenant action
      if (!requesterIsSuperAdmin) {
        if (!targetTenantId) {
          throw new Error("Tenant ID is required");
        }
        await authorizeTenantAction(requester.id, targetTenantId, requesterIsSuperAdmin);
      }

      // Find the existing user by email
      const { data: existingProfile, error: profileError } = await supabaseAdmin
        .from(PROFILE_TABLE)
        .select("id, email, full_name, tenant_id, current_tenant_id")
        .eq("email", email)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!existingProfile) {
        throw new Error("User not found");
      }

      // Verify user belongs to the tenant
      if (targetTenantId) {
        const membership = await getMembership(existingProfile.id, targetTenantId);
        const belongsToTenant = membership ||
          existingProfile.tenant_id === targetTenantId ||
          existingProfile.current_tenant_id === targetTenantId;

        if (!belongsToTenant) {
          throw new Error("User not found in this tenant");
        }
      }

      // Generate magic link for the user
      const { data: linkData, error: linkError } = await supabaseAdmin.auth
        .admin.generateLink({
          type: "magiclink",
          email: email,
          options: { redirectTo: redirectTo },
        });

      if (linkError) {
        console.error("[AUTH_MANAGER] Generate Link Error:", linkError);
        throw linkError;
      }

      const targetUser = linkData.user;
      if (!targetUser) {
        throw new Error("Failed to resolve user from link generation");
      }

      // Send email via Brevo
      await sendBrevoEmail({
        type: "invite",
        toEmail: email,
        toName: existingProfile.full_name || email.split("@")[0],
        variables: {
          action_url: linkData.properties.action_link,
          name: existingProfile.full_name || "Colaborador",
          email: email,
        },
      });

      console.log(`[AUTH_MANAGER] Invite resent successfully to ${email}`);

      return new Response(JSON.stringify({ success: true, message: "Invite resent successfully" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "recovery") {
      const { data: linkData, error: linkError } = await supabaseAdmin.auth
        .admin.generateLink({
          type: "recovery",
          email: email,
          options: { redirectTo: redirectTo },
        });

      if (linkError) throw linkError;
      const targetUser = linkData.user;

      let userName = email.split("@")[0];
      if (targetUser) {
        const { data: p } = await supabaseAdmin
          .from(PROFILE_TABLE)
          .select("full_name")
          .eq("id", targetUser.id)
          .single();
        if (p?.full_name) userName = p.full_name;
      }

      await sendBrevoEmail({
        type: "recovery",
        toEmail: email,
        toName: userName,
        variables: {
          action_url: linkData.properties.action_link,
          name: userName,
          email: email,
        },
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Auth Manager Error:", error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
