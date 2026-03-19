import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

const PROFILE_TABLE = "users_dispara_lead_saas_02";
const MEMBERSHIP_TABLE = "user_tenant_memberships_dispara_lead_saas_02";
const TENANT_TABLE = "tenants_dispara_lead_saas_02";
const PLAN_TABLE = "plans_dispara_lead_saas_02";

type MembershipRole = "owner" | "admin" | "member";

type BatchUserInput = {
  email: string;
  name?: string;
  role: MembershipRole;
};

type BatchPayload = {
  dry_run?: boolean;
  redirectTo?: string;
  tenant: {
    name: string;
    slug?: string;
    status?: string;
    plan_id?: string;
    allow_existing?: boolean;
  };
  users: BatchUserInput[];
};

type UserProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: MembershipRole | string | null;
  tenant_id: string | null;
  current_tenant_id: string | null;
  is_super_admin: boolean | null;
};

type TenantRecord = {
  id: string;
  name: string;
  slug: string | null;
  status: string | null;
  owner_id: string | null;
};

const APP_CONFIG = {
  url: "https://disparalead.app",
  senderName: "Dispara Lead",
  senderEmail: "tecnologia@bflabs.com.br",
};

const normalizeRole = (role: unknown): MembershipRole => {
  if (role === "owner" || role === "admin" || role === "member") return role;
  throw new Error(`Invalid role: ${String(role)}`);
};

const slugifyTenantName = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);

const buildUniqueSlug = (name: string) =>
  `${slugifyTenantName(name) || "tenant"}-${crypto.randomUUID().slice(0, 8)}`;

const getBearerToken = (req: Request) => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice("Bearer ".length).trim();
  return token || null;
};

const sendJson = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
      throw new Error("Missing Supabase configuration");
    }

    const requesterToken = getBearerToken(req);
    if (!requesterToken) {
      throw new Error("Unauthorized");
    }

    const payload = (await req.json()) as BatchPayload;
    const dryRun = Boolean(payload.dry_run);
    const redirectTo = payload.redirectTo || `${APP_CONFIG.url}/finish-profile`;

    if (!payload?.tenant?.name?.trim()) {
      throw new Error("tenant.name is required");
    }

    if (!Array.isArray(payload.users) || payload.users.length === 0) {
      throw new Error("users must be a non-empty array");
    }

    const ownerCount = payload.users.filter((user) => user.role === "owner")
      .length;
    if (ownerCount !== 1) {
      throw new Error("Exactly one owner must be provided in users");
    }

    const normalizedUsers = payload.users.map((user) => ({
      email: user.email.trim().toLowerCase(),
      name: user.name?.trim() || user.email.split("@")[0],
      role: normalizeRole(user.role),
    }));

    const duplicatedEmails = normalizedUsers
      .map((user) => user.email)
      .filter((email, index, array) => array.indexOf(email) !== index);
    if (duplicatedEmails.length > 0) {
      throw new Error(
        `Duplicated emails in batch: ${Array.from(new Set(duplicatedEmails)).join(", ")}`,
      );
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const { data: authData, error: authError } = await supabaseAuth.auth
      .getUser(requesterToken);
    const requester = authData?.user;
    if (authError || !requester) {
      throw new Error("Unauthorized");
    }

    const { data: requesterProfile, error: requesterProfileError } =
      await supabaseAdmin
        .from(PROFILE_TABLE)
        .select("id, is_super_admin")
        .eq("id", requester.id)
        .single();

    if (requesterProfileError || !requesterProfile?.is_super_admin) {
      throw new Error("Forbidden: only super admins can run bulk onboarding");
    }

    const sendBrevoEmail = async (
      { type, toEmail, toName, variables }: {
        type: string;
        toEmail: string;
        toName: string;
        variables: Record<string, string>;
      },
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
        html = html.replaceAll(placeholder, value);
        subject = subject.replaceAll(placeholder, value);
      }

      if (!BREVO_API_KEY) {
        throw new Error("BREVO_API_KEY not set");
      }

      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          accept: "application/json",
          "api-key": BREVO_API_KEY,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          sender: {
            name: APP_CONFIG.senderName,
            email: APP_CONFIG.senderEmail,
          },
          to: [{ email: toEmail, name: toName }],
          subject,
          htmlContent: html,
        }),
      });

      if (!response.ok) {
        throw new Error(`Brevo API Error: ${await response.text()}`);
      }
    };

    const getDefaultPlanId = async () => {
      if (payload.tenant.plan_id) return payload.tenant.plan_id;

      const { data: basicPlan } = await supabaseAdmin
        .from(PLAN_TABLE)
        .select("id")
        .eq("slug", "basic")
        .maybeSingle();
      if (basicPlan?.id) return basicPlan.id;

      const { data: anyPlan, error } = await supabaseAdmin
        .from(PLAN_TABLE)
        .select("id")
        .limit(1)
        .single();
      if (error || !anyPlan?.id) throw new Error("No plan found to create tenant");
      return anyPlan.id;
    };

    const findTenantBySlug = async (slug: string) => {
      const { data, error } = await supabaseAdmin
        .from(TENANT_TABLE)
        .select("id, name, slug, status, owner_id")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data as TenantRecord | null;
    };

    const getActiveOwnerMembership = async (tenantId: string) => {
      const { data, error } = await supabaseAdmin
        .from(MEMBERSHIP_TABLE)
        .select("user_id, tenant_id, role, status")
        .eq("tenant_id", tenantId)
        .eq("role", "owner")
        .eq("status", "active")
        .maybeSingle();
      if (error) throw error;
      return data as { user_id: string; tenant_id: string; role: string; status: string } | null;
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

    const ensureProfile = async ({
      targetUserId,
      targetEmail,
      targetName,
      targetRole,
      targetTenantId,
    }: {
      targetUserId: string;
      targetEmail: string;
      targetName: string;
      targetRole: MembershipRole;
      targetTenantId: string;
    }) => {
      const existingProfile = await getProfileById(targetUserId);

      if (!existingProfile) {
        const { error } = await supabaseAdmin.from(PROFILE_TABLE).insert({
          id: targetUserId,
          email: targetEmail,
          full_name: targetName,
          role: targetRole,
          tenant_id: targetTenantId,
          current_tenant_id: targetTenantId,
          is_super_admin: false,
        });
        if (error) throw error;
        return;
      }

      const updates: Record<string, unknown> = {
        email: targetEmail,
        full_name: targetName,
      };

      if (!existingProfile.tenant_id) {
        updates.tenant_id = targetTenantId;
      }

      if (!existingProfile.current_tenant_id) {
        updates.current_tenant_id = targetTenantId;
      }

      if (!existingProfile.role) {
        updates.role = targetRole;
      }

      const { error } = await supabaseAdmin
        .from(PROFILE_TABLE)
        .update(updates)
        .eq("id", targetUserId);
      if (error) throw error;
    };

    const ensureMembership = async ({
      targetUserId,
      targetTenantId,
      targetRole,
    }: {
      targetUserId: string;
      targetTenantId: string;
      targetRole: MembershipRole;
    }) => {
      const { data: existing } = await supabaseAdmin
        .from(MEMBERSHIP_TABLE)
        .select("user_id, tenant_id, role, status")
        .eq("user_id", targetUserId)
        .eq("tenant_id", targetTenantId)
        .maybeSingle();

      const existed = Boolean(existing);

      const { error } = await supabaseAdmin.from(MEMBERSHIP_TABLE).upsert(
        {
          user_id: targetUserId,
          tenant_id: targetTenantId,
          role: targetRole,
          status: "active",
          invited_by: requester.id,
        },
        { onConflict: "user_id,tenant_id" },
      );
      if (error) throw error;

      return existed;
    };

    const ensureAuthUserAndLink = async (
      user: { email: string; name: string },
    ) => {
      const createResult = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        email_confirm: true,
        user_metadata: {
          full_name: user.name,
          skip_profile_bootstrap: true,
        },
      });

      const createdNow = !createResult.error;
      if (
        createResult.error &&
        !String(createResult.error.message || "").toLowerCase().includes(
          "already",
        )
      ) {
        throw createResult.error;
      }

      const { data: linkData, error: linkError } = await supabaseAdmin.auth
        .admin.generateLink({
          type: "magiclink",
          email: user.email,
          options: { redirectTo },
        });

      if (linkError || !linkData.user) {
        throw linkError || new Error("Failed to generate link");
      }

      return {
        createdNow,
        userId: linkData.user.id,
        actionLink: linkData.properties.action_link,
      };
    };

    const requestedOwner = normalizedUsers.find((user) => user.role === "owner")!;
    const tenantSlug = payload.tenant.slug?.trim() ||
      buildUniqueSlug(payload.tenant.name);
    const existingTenant = await findTenantBySlug(tenantSlug);
    if (existingTenant && !payload.tenant.allow_existing) {
      throw new Error(
        `Tenant slug already exists: ${tenantSlug}. Set tenant.allow_existing=true to reuse it.`,
      );
    }

    if (existingTenant) {
      const activeOwnerMembership = await getActiveOwnerMembership(existingTenant.id);

      if (activeOwnerMembership?.user_id) {
        const { data: currentOwnerProfile, error: currentOwnerError } = await supabaseAdmin
          .from(PROFILE_TABLE)
          .select("id, email")
          .eq("id", activeOwnerMembership.user_id)
          .maybeSingle();

        if (currentOwnerError) throw currentOwnerError;

        if (
          currentOwnerProfile?.email &&
          currentOwnerProfile.email.toLowerCase() !== requestedOwner.email
        ) {
          throw new Error(
            `Tenant ${tenantSlug} already has a different active owner: ${currentOwnerProfile.email}`,
          );
        }
      }
    }

    if (dryRun) {
      return sendJson({
        ok: true,
        dry_run: true,
        tenant: {
          name: payload.tenant.name,
          slug: tenantSlug,
          existing: Boolean(existingTenant),
        },
        users: normalizedUsers.map((user) => ({
          email: user.email,
          name: user.name,
          role: user.role,
        })),
      });
    }

    let tenantId = existingTenant?.id as string | undefined;
    let tenantCreated = false;
    const results = [];

    let preprovisionedOwnerEmail: string | null = null;

    if (!tenantId) {
      const owner = requestedOwner;
      const ownerProvision = await ensureAuthUserAndLink(owner);
      const planId = await getDefaultPlanId();

      const { data: createdTenant, error: tenantError } = await supabaseAdmin
        .from(TENANT_TABLE)
        .insert({
          name: payload.tenant.name.trim(),
          slug: tenantSlug,
          owner_id: ownerProvision.userId,
          plan_id: planId,
          status: payload.tenant.status || "active",
        })
        .select("id, name, slug, status")
        .single();

      if (tenantError || !createdTenant?.id) {
        throw tenantError || new Error("Failed to create tenant");
      }

      tenantId = createdTenant.id;
      tenantCreated = true;

      await ensureProfile({
        targetUserId: ownerProvision.userId,
        targetEmail: owner.email,
        targetName: owner.name,
        targetRole: "owner",
        targetTenantId: tenantId,
      });
      await ensureMembership({
        targetUserId: ownerProvision.userId,
        targetTenantId: tenantId,
        targetRole: "owner",
      });

      await sendBrevoEmail({
        type: "invite",
        toEmail: owner.email,
        toName: owner.name,
        variables: {
          action_url: ownerProvision.actionLink,
          name: owner.name,
          email: owner.email,
        },
      });

      preprovisionedOwnerEmail = owner.email;

      results.push({
        email: owner.email,
        role: owner.role,
        user_id: ownerProvision.userId,
        auth_user_created: ownerProvision.createdNow,
        membership_created: true,
        membership_already_existed: false,
        invite_sent: true,
      });
    }

    for (const user of normalizedUsers) {
      if (preprovisionedOwnerEmail && user.email === preprovisionedOwnerEmail) {
        continue;
      }

      const provision = await ensureAuthUserAndLink(user);

      await ensureProfile({
        targetUserId: provision.userId,
        targetEmail: user.email,
        targetName: user.name,
        targetRole: user.role,
        targetTenantId: tenantId!,
      });

      const membershipExisted = await ensureMembership({
        targetUserId: provision.userId,
        targetTenantId: tenantId!,
        targetRole: user.role,
      });

      if (user.role === "owner") {
        const { error: ownerSyncError } = await supabaseAdmin
          .from(TENANT_TABLE)
          .update({ owner_id: provision.userId })
          .eq("id", tenantId!);

        if (ownerSyncError) throw ownerSyncError;
      }

      await sendBrevoEmail({
        type: "invite",
        toEmail: user.email,
        toName: user.name,
        variables: {
          action_url: provision.actionLink,
          name: user.name,
          email: user.email,
        },
      });

      results.push({
        email: user.email,
        role: user.role,
        user_id: provision.userId,
        auth_user_created: provision.createdNow,
        membership_created: !membershipExisted,
        membership_already_existed: membershipExisted,
        invite_sent: true,
      });
    }

    return sendJson({
      ok: true,
      dry_run: false,
      tenant: {
        id: tenantId,
        name: payload.tenant.name.trim(),
        slug: tenantSlug,
        created: tenantCreated,
        reused_existing: !tenantCreated,
      },
      users: results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[BULK_TENANT_ONBOARDING]", message);
    return sendJson({ ok: false, error: message }, 400);
  }
});
