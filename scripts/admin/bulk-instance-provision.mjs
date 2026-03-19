#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

const INSTANCE_TABLE = "instances_dispara_lead_saas_02";
const TENANT_TABLE = "tenants_dispara_lead_saas_02";
const PROFILE_TABLE = "users_dispara_lead_saas_02";
const MEMBERSHIP_TABLE = "user_tenant_memberships_dispara_lead_saas_02";

function parseArgs(argv) {
  const args = {
    mode: "dry-run",
    input: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--input") {
      args.input = argv[index + 1] ?? null;
      index += 1;
    } else if (token === "--apply") {
      args.mode = "apply";
    } else if (token === "--dry-run") {
      args.mode = "dry-run";
    } else if (token === "--help" || token === "-h") {
      console.log("Usage: node scripts/admin/bulk-instance-provision.mjs --input <file.json> [--dry-run|--apply]");
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
  const entries = {};
  const content = fs.readFileSync(filePath, "utf8");
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

function slugifyName(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const rootDir = process.cwd();
  const mergedEnv = {
    ...readEnvFile(path.join(rootDir, ".env.local")),
    ...readEnvFile(path.join(rootDir, "scripts/admin/.env.local")),
  };

  const supabaseUrl = process.env.SUPABASE_URL || mergedEnv.SUPABASE_URL || mergedEnv.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || mergedEnv.SUPABASE_SERVICE_ROLE_KEY;
  const uazapiBaseUrl = process.env.UAZAPI_BASE_URL || mergedEnv.UAZAPI_BASE_URL;
  const uazapiToken = process.env.UAZAPI_TOKEN || mergedEnv.UAZAPI_TOKEN;

  if (!supabaseUrl || !serviceRoleKey || !uazapiBaseUrl || !uazapiToken) {
    throw new Error("Missing SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY/UAZAPI_BASE_URL/UAZAPI_TOKEN");
  }

  const input = JSON.parse(fs.readFileSync(path.resolve(rootDir, args.input), "utf8"));
  const batches = Array.isArray(input) ? input : [input];
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  async function registerWebhook(instanceToken, url, events) {
    const getResponse = await fetch(`${uazapiBaseUrl}/webhook`, {
      method: "GET",
      headers: { Accept: "application/json", token: instanceToken },
    });

    if (getResponse.ok) {
      const hooks = await getResponse.json();
      const found = Array.isArray(hooks) && hooks.find((hook) => hook.url === url && hook.enabled);
      if (found) return;
    }

    await fetch(`${uazapiBaseUrl}/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        token: instanceToken,
      },
      body: JSON.stringify({
        action: "add",
        enabled: true,
        url,
        events,
      }),
    });
  }

  async function ensureWebhooks(instanceName, instanceToken) {
    const webhookBase = `${supabaseUrl}/functions/v1`;
    await registerWebhook(instanceToken, `${webhookBase}/webhook_connection_dispara_lead_saas`, ["connection"]);
    await registerWebhook(instanceToken, `${webhookBase}/webhook_messages_dispara_lead_saas`, ["messages"]);
    return instanceName;
  }

  const results = [];

  for (const batch of batches) {
    const tenantSlug = batch.tenant_slug;
    const ownerEmail = String(batch.owner_email || "").trim().toLowerCase();
    if (!tenantSlug || !ownerEmail) {
      throw new Error("Each batch entry must include tenant_slug and owner_email");
    }

    const { data: tenant, error: tenantError } = await supabase
      .from(TENANT_TABLE)
      .select("id, name, slug")
      .eq("slug", tenantSlug)
      .single();

    if (tenantError || !tenant) {
      throw tenantError || new Error(`Tenant not found: ${tenantSlug}`);
    }

    const { data: memberships, error: membershipError } = await supabase
      .from(MEMBERSHIP_TABLE)
      .select("user_id, role, status")
      .eq("tenant_id", tenant.id)
      .eq("status", "active");

    if (membershipError) throw membershipError;

    const memberIds = (memberships || []).map((membership) => membership.user_id);
    const { data: profiles, error: profilesError } = await supabase
      .from(PROFILE_TABLE)
      .select("id, email, full_name")
      .in("id", memberIds);

    if (profilesError) throw profilesError;

    const profilesById = new Map((profiles || []).map((profile) => [profile.id, profile]));

    const resolvedUsers = (memberships || [])
      .map((membership) => {
        const profile = profilesById.get(membership.user_id);
        const email = String(profile?.email || "").toLowerCase();
        const fullName = profile?.full_name || email;
        return {
          user_id: membership.user_id,
          email,
          full_name: fullName,
          role: membership.role,
          instance_name: slugifyName(fullName),
        };
      })
      .filter((user) => user.email && user.email !== ownerEmail && user.role !== "owner");

    const existingInstanceNames = new Set();
    const { data: existingInstances, error: existingInstancesError } = await supabase
      .from(INSTANCE_TABLE)
      .select("instance_name")
      .eq("tenant_id", tenant.id);

    if (existingInstancesError) throw existingInstancesError;
    for (const instance of existingInstances || []) {
      existingInstanceNames.add(instance.instance_name);
    }

    if (args.mode === "dry-run") {
      results.push({
        tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
        users: resolvedUsers.map((user) => ({
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          instance_name: user.instance_name,
          instance_already_exists: existingInstanceNames.has(user.instance_name),
        })),
      });
      continue;
    }

    const tenantResults = [];

    for (const user of resolvedUsers) {
      if (existingInstanceNames.has(user.instance_name)) {
        tenantResults.push({
          email: user.email,
          full_name: user.full_name,
          instance_name: user.instance_name,
          created: false,
          skipped_existing: true,
        });
        continue;
      }

      const response = await fetch(`${uazapiBaseUrl}/instance/init`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          admintoken: uazapiToken,
        },
        body: JSON.stringify({
          name: user.instance_name,
          systemName: "dispara-lead",
          adminField01: tenant.id,
          adminField02: "created_via_script",
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(`UAZAPI create failed for ${user.instance_name}: ${JSON.stringify(data)}`);
      }

      const instanceToken = data.token || data.hash?.apikey;

      const { error: insertError } = await supabase
        .from(INSTANCE_TABLE)
        .insert({
          tenant_id: tenant.id,
          instance_name: user.instance_name,
          uazapi_instance_id: data.instance?.instanceId || user.instance_name,
          token: instanceToken,
          status: "disconnected",
          metadata: data,
        });

      if (insertError) {
        throw new Error(`DB insert failed for ${user.instance_name}: ${insertError.message}`);
      }

      if (instanceToken) {
        await ensureWebhooks(user.instance_name, instanceToken);
      }

      existingInstanceNames.add(user.instance_name);
      tenantResults.push({
        email: user.email,
        full_name: user.full_name,
        instance_name: user.instance_name,
        created: true,
        skipped_existing: false,
      });
    }

    results.push({
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
      users: tenantResults,
    });
  }

  console.log(JSON.stringify({ ok: true, mode: args.mode, result: results }, null, 2));
}

main().catch((error) => {
  const message = error instanceof Error
    ? error.message
    : typeof error === "object" && error !== null
    ? JSON.stringify(error, null, 2)
    : String(error);
  console.error(JSON.stringify({ ok: false, error: message }, null, 2));
  process.exit(1);
});
