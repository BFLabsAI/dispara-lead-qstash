#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

const PROFILE_TABLE = "users_dispara_lead_saas_02";
const MEMBERSHIP_TABLE = "user_tenant_memberships_dispara_lead_saas_02";
const TENANT_TABLE = "tenants_dispara_lead_saas_02";
const PLAN_TABLE = "plans_dispara_lead_saas_02";

const APP_CONFIG = {
  url: "https://disparalead.bflabs.com.br",
  senderName: "Dispara Lead",
  senderEmail: "tecnologia@bflabs.com.br",
};

function printUsage() {
  console.log(`Usage:
  node scripts/admin/bulk-tenant-onboarding.mjs --input <file.json> [--dry-run|--apply] [--skip-email] [--redirect-to <url>]

Environment:
  SUPABASE_SERVICE_ROLE_KEY   required
  SUPABASE_URL               optional, falls back to VITE_SUPABASE_URL from .env.local
  BREVO_API_KEY              required unless --skip-email is used

Input format:
  [
    {
      "tenant": { "name": "Empresa A", "slug": "empresa-a", "allow_existing": false },
      "users": [
        { "email": "owner@empresa-a.com", "name": "Owner A", "role": "owner" },
        { "email": "admin@empresa-a.com", "name": "Admin A", "role": "admin" }
      ]
    }
  ]`);
}

function parseArgs(argv) {
  const args = {
    mode: "dry-run",
    input: null,
    skipEmail: false,
    redirectTo: `${APP_CONFIG.url}/finish-profile`,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--input") {
      args.input = argv[index + 1] ?? null;
      index += 1;
    } else if (token === "--dry-run") {
      args.mode = "dry-run";
    } else if (token === "--apply") {
      args.mode = "apply";
    } else if (token === "--skip-email") {
      args.skipEmail = true;
    } else if (token === "--redirect-to") {
      args.redirectTo = argv[index + 1] ?? args.redirectTo;
      index += 1;
    } else if (token === "--help" || token === "-h") {
      printUsage();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }

  if (!args.input) {
    throw new Error("Missing --input");
  }

  return args;
}

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, "utf8");
  const entries = {};

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    entries[key] = value;
  }

  return entries;
}

function normalizeRole(role) {
  if (role === "owner" || role === "admin" || role === "member") return role;
  throw new Error(`Invalid role: ${String(role)}`);
}

function slugifyTenantName(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

function buildUniqueSlug(name) {
  return `${slugifyTenantName(name) || "tenant"}-${crypto.randomUUID().slice(0, 8)}`;
}

function normalizeBatch(rawBatch) {
  if (!rawBatch?.tenant?.name?.trim()) {
    throw new Error("tenant.name is required");
  }

  if (!Array.isArray(rawBatch.users) || rawBatch.users.length === 0) {
    throw new Error("users must be a non-empty array");
  }

  const users = rawBatch.users.map((user) => ({
    email: user.email.trim().toLowerCase(),
    name: user.name?.trim() || user.email.split("@")[0],
    role: normalizeRole(user.role),
  }));

  const ownerCount = users.filter((user) => user.role === "owner").length;
  if (ownerCount !== 1) {
    throw new Error(`Tenant "${rawBatch.tenant.name}" must have exactly 1 owner`);
  }

  const duplicatedEmails = users
    .map((user) => user.email)
    .filter((email, index, array) => array.indexOf(email) !== index);

  if (duplicatedEmails.length > 0) {
    throw new Error(
      `Duplicated emails in tenant "${rawBatch.tenant.name}": ${Array.from(new Set(duplicatedEmails)).join(", ")}`,
    );
  }

  return {
    tenant: {
      name: rawBatch.tenant.name.trim(),
      slug: rawBatch.tenant.slug?.trim() || buildUniqueSlug(rawBatch.tenant.name),
      status: rawBatch.tenant.status || "active",
      plan_id: rawBatch.tenant.plan_id || null,
      allow_existing: Boolean(rawBatch.tenant.allow_existing),
    },
    users,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const rootDir = process.cwd();
  const envFromRootFile = readEnvFile(path.join(rootDir, ".env.local"));
  const envFromAdminFile = readEnvFile(path.join(rootDir, "scripts/admin/.env.local"));
  const mergedEnv = {
    ...envFromRootFile,
    ...envFromAdminFile,
  };

  const supabaseUrl = process.env.SUPABASE_URL || mergedEnv.SUPABASE_URL || mergedEnv.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || mergedEnv.SUPABASE_SERVICE_ROLE_KEY;
  const brevoApiKey = process.env.BREVO_API_KEY || mergedEnv.BREVO_API_KEY || null;
  const appUrl = process.env.ADMIN_APP_URL || mergedEnv.ADMIN_APP_URL || APP_CONFIG.url;

  if (args.redirectTo === `${APP_CONFIG.url}/finish-profile`) {
    args.redirectTo = `${appUrl.replace(/\/+$/, "")}/finish-profile`;
  }

  if (!supabaseUrl) {
    throw new Error("SUPABASE_URL not found. Set SUPABASE_URL or VITE_SUPABASE_URL in .env.local.");
  }

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required.");
  }

  if (!args.skipEmail && !brevoApiKey) {
    throw new Error("BREVO_API_KEY is required unless --skip-email is used.");
  }

  const rawInput = JSON.parse(fs.readFileSync(path.resolve(rootDir, args.input), "utf8"));
  const batches = Array.isArray(rawInput) ? rawInput : [rawInput];
  const normalizedBatches = batches.map(normalizeBatch);

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  async function sendInviteEmail({ toEmail, toName, actionUrl }) {
    if (args.skipEmail) return;

    const { data: template, error } = await supabaseAdmin
      .from("email_templates_dispara_lead_saas")
      .select("subject, html_content")
      .eq("type", "invite")
      .single();

    if (error) throw error;

    let html = template?.html_content || `<h1>invite</h1><p>Click: ${actionUrl}</p>`;
    let subject = template?.subject || "Dispara Lead - invite";

    for (const [key, value] of Object.entries({
      action_url: actionUrl,
      name: toName,
      email: toEmail,
    })) {
      html = html.replaceAll(`{{${key}}}`, value);
      subject = subject.replaceAll(`{{${key}}}`, value);
    }

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": brevoApiKey,
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
  }

  async function getDefaultPlanId(explicitPlanId) {
    if (explicitPlanId) return explicitPlanId;

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
  }

  async function findTenantBySlug(slug) {
    const { data, error } = await supabaseAdmin
      .from(TENANT_TABLE)
      .select("id, name, slug, status, owner_id")
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async function getActiveOwnerMembership(tenantId) {
    const { data, error } = await supabaseAdmin
      .from(MEMBERSHIP_TABLE)
      .select("user_id, tenant_id, role, status")
      .eq("tenant_id", tenantId)
      .eq("role", "owner")
      .eq("status", "active")
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async function getProfileById(profileId) {
    const { data, error } = await supabaseAdmin
      .from(PROFILE_TABLE)
      .select("id, email, full_name, role, tenant_id, current_tenant_id, is_super_admin")
      .eq("id", profileId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async function ensureProfile({ targetUserId, targetEmail, targetName, targetRole, targetTenantId }) {
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

    const updates = {
      email: targetEmail,
      full_name: targetName,
      ...(existingProfile.tenant_id ? {} : { tenant_id: targetTenantId }),
      ...(existingProfile.current_tenant_id ? {} : { current_tenant_id: targetTenantId }),
      ...(existingProfile.role ? {} : { role: targetRole }),
    };

    const { error } = await supabaseAdmin
      .from(PROFILE_TABLE)
      .update(updates)
      .eq("id", targetUserId);
    if (error) throw error;
  }

  async function ensureMembership({ targetUserId, targetTenantId, targetRole }) {
    const { data: existing, error: selectError } = await supabaseAdmin
      .from(MEMBERSHIP_TABLE)
      .select("user_id, tenant_id, role, status")
      .eq("user_id", targetUserId)
      .eq("tenant_id", targetTenantId)
      .maybeSingle();
    if (selectError) throw selectError;

    const { error } = await supabaseAdmin
      .from(MEMBERSHIP_TABLE)
      .upsert(
        {
          user_id: targetUserId,
          tenant_id: targetTenantId,
          role: targetRole,
          status: "active",
        },
        { onConflict: "user_id,tenant_id" },
      );
    if (error) throw error;

    return Boolean(existing);
  }

  async function ensureAuthUserAndLink(user) {
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
      !String(createResult.error.message || "").toLowerCase().includes("already")
    ) {
      throw createResult.error;
    }

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: user.email,
      options: { redirectTo: args.redirectTo },
    });

    if (linkError || !linkData.user) {
      throw linkError || new Error("Failed to generate link");
    }

    return {
      createdNow,
      userId: linkData.user.id,
      actionLink: linkData.properties.action_link,
    };
  }

  const output = [];

  for (const batch of normalizedBatches) {
    const requestedOwner = batch.users.find((user) => user.role === "owner");
    const existingTenant = await findTenantBySlug(batch.tenant.slug);

    if (existingTenant && !batch.tenant.allow_existing) {
      throw new Error(
        `Tenant slug already exists: ${batch.tenant.slug}. Set allow_existing=true to reuse it.`,
      );
    }

    if (existingTenant) {
      const activeOwnerMembership = await getActiveOwnerMembership(existingTenant.id);

      if (activeOwnerMembership?.user_id) {
        const { data: currentOwnerProfile, error } = await supabaseAdmin
          .from(PROFILE_TABLE)
          .select("id, email")
          .eq("id", activeOwnerMembership.user_id)
          .maybeSingle();
        if (error) throw error;

        if (
          currentOwnerProfile?.email &&
          currentOwnerProfile.email.toLowerCase() !== requestedOwner.email
        ) {
          throw new Error(
            `Tenant ${batch.tenant.slug} already has a different active owner: ${currentOwnerProfile.email}`,
          );
        }
      }
    }

    if (args.mode === "dry-run") {
      output.push({
        tenant: {
          ...batch.tenant,
          existing: Boolean(existingTenant),
        },
        users: batch.users,
      });
      continue;
    }

    let tenantId = existingTenant?.id;
    let tenantCreated = false;
    const results = [];
    let preprovisionedOwnerEmail = null;

    if (!tenantId) {
      const ownerProvision = await ensureAuthUserAndLink(requestedOwner);
      const planId = await getDefaultPlanId(batch.tenant.plan_id);

      const { data: createdTenant, error } = await supabaseAdmin
        .from(TENANT_TABLE)
        .insert({
          name: batch.tenant.name,
          slug: batch.tenant.slug,
          owner_id: ownerProvision.userId,
          plan_id: planId,
          status: batch.tenant.status,
        })
        .select("id")
        .single();
      if (error || !createdTenant?.id) throw error || new Error("Failed to create tenant");

      tenantId = createdTenant.id;
      tenantCreated = true;

      await ensureProfile({
        targetUserId: ownerProvision.userId,
        targetEmail: requestedOwner.email,
        targetName: requestedOwner.name,
        targetRole: "owner",
        targetTenantId: tenantId,
      });
      await ensureMembership({
        targetUserId: ownerProvision.userId,
        targetTenantId: tenantId,
        targetRole: "owner",
      });
      await sendInviteEmail({
        toEmail: requestedOwner.email,
        toName: requestedOwner.name,
        actionUrl: ownerProvision.actionLink,
      });

      preprovisionedOwnerEmail = requestedOwner.email;
      results.push({
        email: requestedOwner.email,
        role: requestedOwner.role,
        user_id: ownerProvision.userId,
        auth_user_created: ownerProvision.createdNow,
        membership_created: true,
        membership_already_existed: false,
        invite_sent: !args.skipEmail,
      });
    }

    for (const user of batch.users) {
      if (preprovisionedOwnerEmail && user.email === preprovisionedOwnerEmail) continue;

      const provision = await ensureAuthUserAndLink(user);
      await ensureProfile({
        targetUserId: provision.userId,
        targetEmail: user.email,
        targetName: user.name,
        targetRole: user.role,
        targetTenantId: tenantId,
      });

      const membershipExisted = await ensureMembership({
        targetUserId: provision.userId,
        targetTenantId: tenantId,
        targetRole: user.role,
      });

      if (user.role === "owner") {
        const { error } = await supabaseAdmin
          .from(TENANT_TABLE)
          .update({ owner_id: provision.userId })
          .eq("id", tenantId);
        if (error) throw error;
      }

      await sendInviteEmail({
        toEmail: user.email,
        toName: user.name,
        actionUrl: provision.actionLink,
      });

      results.push({
        email: user.email,
        role: user.role,
        user_id: provision.userId,
        auth_user_created: provision.createdNow,
        membership_created: !membershipExisted,
        membership_already_existed: membershipExisted,
        invite_sent: !args.skipEmail,
      });
    }

    output.push({
      tenant: {
        id: tenantId,
        name: batch.tenant.name,
        slug: batch.tenant.slug,
        created: tenantCreated,
        reused_existing: !tenantCreated,
      },
      users: results,
    });
  }

  console.log(JSON.stringify({
    ok: true,
    mode: args.mode,
    skip_email: args.skipEmail,
    result: output,
  }, null, 2));
}

main().catch((error) => {
  const message = error instanceof Error
    ? error.message
    : typeof error === "object" && error !== null
    ? JSON.stringify(error, null, 2)
    : String(error);
  console.error(JSON.stringify({
    ok: false,
    error: message,
  }, null, 2));
  process.exit(1);
});
