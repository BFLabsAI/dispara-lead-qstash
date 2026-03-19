import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const UAZAPI_BASE_URL = Deno.env.get("UAZAPI_BASE_URL") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const PROFILE_TABLE = "users_dispara_lead_saas_02";
const MEMBERSHIP_TABLE = "user_tenant_memberships_dispara_lead_saas_02";
const INSTANCES_TABLE = "instances_dispara_lead_saas_02";
const LABELS_TABLE = "instance_labels_dispara_lead_saas_02";
const CONTACTS_TABLE = "instance_contacts_dispara_lead_saas_02";
const CONTACT_LABELS_TABLE = "instance_contact_labels_dispara_lead_saas_02";
const SYNC_RUNS_TABLE = "instance_contact_sync_runs_dispara_lead_saas_02";
const AUDIENCE_SYNC_RULES_TABLE = "audience_sync_rules_dispara_lead_saas_02";
const AUDIENCE_CONTACTS_TABLE = "audience_contacts_dispara_lead_saas_02";
const AUDIENCES_TABLE = "audiences_dispara_lead_saas_02";

type MembershipRole = "owner" | "admin" | "member";

type AudienceSyncRuleRecord = {
  audience_id: string;
  instance_id: string;
  tenant_id: string;
  match_mode: "labels" | "naming";
  label_ids: string[] | null;
  label_names: string[] | null;
  naming_term_normalized: string | null;
  sync_enabled: boolean | null;
};

type SyncRequest = {
  instanceId: string;
  syncRunId?: string | null;
  page?: number;
  pageSize?: number;
  syncLabels?: boolean;
  syncDetails?: boolean;
};

type InstanceRecord = {
  id: string;
  tenant_id: string;
  instance_name: string;
  token: string | null;
  status: string | null;
};

type ProfileRecord = {
  id: string;
  role: string | null;
  tenant_id: string | null;
  current_tenant_id: string | null;
  is_super_admin: boolean | null;
};

type MembershipRecord = {
  user_id: string;
  tenant_id: string;
  role: MembershipRole;
  status: string;
};

type LabelApiRecord = {
  id?: string;
  labelid?: string;
  owner?: string;
  name?: string;
  color?: number;
  colorHex?: string;
  [key: string]: unknown;
};

type ContactApiRecord = {
  jid?: string;
  contact_name?: string;
  contact_FirstName?: string;
  [key: string]: unknown;
};

type ContactDetailsRecord = {
  id?: string;
  image?: string;
  imagePreview?: string;
  lead_fullName?: string;
  lead_name?: string;
  lead_tags?: string[];
  name?: string;
  owner?: string;
  phone?: string;
  wa_chatid?: string;
  wa_chatlid?: string;
  wa_common_groups?: string;
  wa_contactName?: string;
  wa_fastid?: string;
  wa_label?: string[];
  wa_name?: string;
  [key: string]: unknown;
};

type ContactsPageResponse = {
  contacts?: ContactApiRecord[];
  pagination?: {
    currentPage?: number;
    hasNextPage?: boolean;
    hasPreviousPage?: boolean;
    pageSize?: number;
    totalDeviceContacts?: number;
    totalPages?: number;
    totalRecords?: number;
  };
};

type AuthContext = {
  requesterId: string | null;
  internalServiceRole: boolean;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const normalizeRole = (
  role: unknown,
  fallback: MembershipRole = "member",
): MembershipRole => {
  if (role === "owner" || role === "admin" || role === "member") return role;
  if (role === "user") return "member";
  return fallback;
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const nowIso = () => new Date().toISOString();

const extractBearerToken = (req: Request) => {
  const authHeader = req.headers.get("Authorization") ?? "";
  return authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;
};

const normalizePhone = (input: string | null | undefined) => {
  if (!input) return "";
  return input.replace(/\D/g, "");
};

const phoneFromJid = (jid: string | null | undefined) => {
  if (!jid) return "";
  return normalizePhone(jid.split("@")[0] ?? "");
};

const computeDisplayName = ({
  contactName,
  waContactName,
  detailsName,
  waName,
  phone,
}: {
  contactName?: string | null;
  waContactName?: string | null;
  detailsName?: string | null;
  waName?: string | null;
  phone?: string | null;
}) =>
  contactName?.trim() ||
  waContactName?.trim() ||
  detailsName?.trim() ||
  waName?.trim() ||
  phone?.trim() ||
  "";

const chunkArray = <T>(items: T[], size: number) => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const normalizeNamingValue = (value: string | null | undefined) => {
  if (!value) return "";
  return value.trim().replace(/\s+/g, " ").toLowerCase();
};

async function getAuthContext(req: Request): Promise<AuthContext> {
  const bearerToken = extractBearerToken(req);
  if (!bearerToken) {
    throw new Error("Missing Authorization header");
  }

  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const { data: authData, error } = await authClient.auth.getUser(bearerToken);
  const user = authData.user;

  if (error || !user) {
    throw new Error(error?.message || "Unauthorized");
  }

  return { requesterId: user.id, internalServiceRole: false };
}

async function getRequesterProfile(requesterId: string) {
  const { data, error } = await admin
    .from(PROFILE_TABLE)
    .select("id, role, tenant_id, current_tenant_id, is_super_admin")
    .eq("id", requesterId)
    .maybeSingle();

  if (error) throw error;
  return data as ProfileRecord | null;
}

async function getMembership(userId: string, tenantId: string) {
  const { data, error } = await admin
    .from(MEMBERSHIP_TABLE)
    .select("user_id, tenant_id, role, status")
    .eq("user_id", userId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (error) throw error;
  return data as MembershipRecord | null;
}

async function authorizeInstanceAccess(
  authContext: AuthContext,
  instance: InstanceRecord,
) {
  if (authContext.internalServiceRole) return;
  if (!authContext.requesterId) throw new Error("Unauthorized");

  const profile = await getRequesterProfile(authContext.requesterId);
  if (!profile) throw new Error("Requester profile not found");
  if (profile.is_super_admin) return;

  const membership = await getMembership(authContext.requesterId, instance.tenant_id);
  if (membership?.status === "active") {
    if (membership.role === "owner" || membership.role === "admin") return;
    throw new Error("Forbidden: Insufficient permissions for this tenant");
  }

  const effectiveTenantId = profile.current_tenant_id ?? profile.tenant_id;
  const fallbackRole = normalizeRole(profile.role, "member");
  if (
    effectiveTenantId === instance.tenant_id &&
    (fallbackRole === "owner" || fallbackRole === "admin")
  ) {
    return;
  }

  throw new Error("Forbidden: Insufficient permissions for this tenant");
}

async function fetchInstance(instanceId: string) {
  const { data, error } = await admin
    .from(INSTANCES_TABLE)
    .select("id, tenant_id, instance_name, token, status")
    .eq("id", instanceId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Instance not found");
  if (!data.token) throw new Error("Instance token not configured");

  return data as InstanceRecord;
}

async function fetchUazapi(
  path: string,
  instanceToken: string,
  init?: RequestInit,
) {
  const response = await fetch(`${UAZAPI_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      token: instanceToken,
      ...(init?.headers ?? {}),
    },
  });

  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw new Error(
      `UazAPI ${path} failed (${response.status}): ${typeof data === "string" ? data : JSON.stringify(data)}`,
    );
  }

  return data;
}

async function fetchLabels(instanceToken: string) {
  const data = await fetchUazapi("/labels", instanceToken, { method: "GET" });
  return Array.isArray(data) ? (data as LabelApiRecord[]) : [];
}

async function fetchContactsPage(
  instanceToken: string,
  page: number,
  pageSize: number,
) {
  const data = await fetchUazapi("/contacts/list", instanceToken, {
    method: "POST",
    body: JSON.stringify({ page, pageSize }),
  });

  return (data ?? {}) as ContactsPageResponse;
}

async function fetchChatDetails(instanceToken: string, number: string) {
  const data = await fetchUazapi("/chat/details", instanceToken, {
    method: "POST",
    body: JSON.stringify({ number, preview: false }),
  });

  return (data ?? {}) as ContactDetailsRecord;
}

async function upsertLabels(instance: InstanceRecord, labels: LabelApiRecord[]) {
  if (labels.length === 0) return new Map<string, string>();

  const timestamp = nowIso();
  const payload = labels
    .filter((label) => Boolean(label.id))
    .map((label) => ({
      tenant_id: instance.tenant_id,
      instance_id: instance.id,
      external_label_id: String(label.id),
      labelid: label.labelid ?? null,
      owner: label.owner ?? null,
      name: label.name ?? null,
      color: typeof label.color === "number" ? label.color : null,
      color_hex: typeof label.colorHex === "string" ? label.colorHex : null,
      raw_payload: label,
      last_synced_at: timestamp,
      updated_at: timestamp,
    }));

  if (payload.length === 0) return new Map<string, string>();

  const { error } = await admin.from(LABELS_TABLE).upsert(payload, {
    onConflict: "instance_id,external_label_id",
  });
  if (error) throw error;

  const { data, error: selectError } = await admin
    .from(LABELS_TABLE)
    .select("id, external_label_id")
    .eq("instance_id", instance.id);

  if (selectError) throw selectError;

  return new Map(
    (data ?? []).map((row: { id: string; external_label_id: string }) => [
      row.external_label_id,
      row.id,
    ]),
  );
}

async function upsertContacts(instance: InstanceRecord, contacts: ContactApiRecord[]) {
  if (contacts.length === 0) {
    return { contactRows: [], insertedCount: 0, updatedCount: 0 };
  }

  const jids = contacts.map((contact) => String(contact.jid ?? "")).filter(Boolean);
  const { data: existingRows, error: existingError } = await admin
    .from(CONTACTS_TABLE)
    .select("id, jid")
    .eq("instance_id", instance.id)
    .in("jid", jids);

  if (existingError) throw existingError;

  const existingJids = new Set((existingRows ?? []).map((row: { jid: string }) => row.jid));
  const timestamp = nowIso();

  const payload = contacts
    .filter((contact) => Boolean(contact.jid))
    .map((contact) => {
      const jid = String(contact.jid);
      const phone = phoneFromJid(jid);
      const contactName = contact.contact_name?.trim() || null;
      const contactFirstName = contact.contact_FirstName?.trim() || null;

      return {
        tenant_id: instance.tenant_id,
        instance_id: instance.id,
        jid,
        phone,
        contact_name: contactName,
        contact_first_name: contactFirstName,
        display_name: computeDisplayName({
          contactName,
          phone,
        }),
        raw_contact_payload: contact,
        contacts_last_synced_at: timestamp,
        last_synced_at: timestamp,
        updated_at: timestamp,
      };
    });

  const { error } = await admin.from(CONTACTS_TABLE).upsert(payload, {
    onConflict: "instance_id,jid",
  });
  if (error) throw error;

  const { data: contactRows, error: selectError } = await admin
    .from(CONTACTS_TABLE)
    .select("id, jid, contact_name, phone")
    .eq("instance_id", instance.id)
    .in("jid", jids);

  if (selectError) throw selectError;

  return {
    contactRows: (contactRows ?? []) as {
      id: string;
      jid: string;
      contact_name: string | null;
      phone: string;
    }[],
    insertedCount: payload.filter((row) => !existingJids.has(row.jid)).length,
    updatedCount: payload.filter((row) => existingJids.has(row.jid)).length,
  };
}

async function reconcileContactLabels(params: {
  instance: InstanceRecord;
  contactId: string;
  externalLabelIds: string[];
  labelMap: Map<string, string>;
}) {
  const { instance, contactId, externalLabelIds, labelMap } = params;

  const { error: deleteError } = await admin
    .from(CONTACT_LABELS_TABLE)
    .delete()
    .eq("instance_contact_id", contactId);

  if (deleteError) throw deleteError;

  if (externalLabelIds.length === 0) return 0;

  const timestamp = nowIso();
  const rows = externalLabelIds.map((externalLabelId) => ({
    tenant_id: instance.tenant_id,
    instance_id: instance.id,
    instance_contact_id: contactId,
    instance_label_id: labelMap.get(externalLabelId) ?? null,
    external_label_id: externalLabelId,
    updated_at: timestamp,
    last_synced_at: timestamp,
  }));

  const { error: insertError } = await admin
    .from(CONTACT_LABELS_TABLE)
    .insert(rows);

  if (insertError) throw insertError;
  return rows.length;
}

async function syncContactDetails(params: {
  instance: InstanceRecord;
  contactRows: {
    id: string;
    jid: string;
    contact_name: string | null;
    phone: string;
  }[];
  labelMap: Map<string, string>;
}) {
  const { instance, contactRows, labelMap } = params;

  let detailsSynced = 0;
  let labelsLinked = 0;
  let errorsCount = 0;

  for (const batch of chunkArray(contactRows, 5)) {
    const batchResults = await Promise.all(
      batch.map(async (contactRow) => {
        try {
          const details = await fetchChatDetails(instance.token ?? "", contactRow.phone);
          const externalLabelIds = Array.isArray(details.wa_label)
            ? details.wa_label.map((value) => String(value))
            : [];
          const timestamp = nowIso();
          const displayName = computeDisplayName({
            contactName: contactRow.contact_name,
            waContactName: details.wa_contactName ?? null,
            detailsName: details.name ?? null,
            waName: details.wa_name ?? null,
            phone: details.phone ?? contactRow.phone,
          });

          const { error: updateError } = await admin
            .from(CONTACTS_TABLE)
            .update({
              display_name: displayName,
              details_name: details.name ?? null,
              wa_name: details.wa_name ?? null,
              wa_contact_name: details.wa_contactName ?? null,
              wa_chatid: details.wa_chatid ?? null,
              wa_chatlid: details.wa_chatlid ?? null,
              wa_fastid: details.wa_fastid ?? null,
              owner_phone: details.owner ?? null,
              image_url: details.image ?? null,
              image_preview_url: details.imagePreview ?? null,
              wa_common_groups: details.wa_common_groups ?? null,
              lead_name: details.lead_name ?? null,
              lead_full_name: details.lead_fullName ?? null,
              lead_tags: Array.isArray(details.lead_tags) ? details.lead_tags : [],
              raw_details_payload: details,
              details_last_synced_at: timestamp,
              last_synced_at: timestamp,
              updated_at: timestamp,
            })
            .eq("id", contactRow.id);

          if (updateError) throw updateError;

          const linked = await reconcileContactLabels({
            instance,
            contactId: contactRow.id,
            externalLabelIds,
            labelMap,
          });

          return { detailsSynced: 1, labelsLinked: linked, errorsCount: 0 };
        } catch (error) {
          console.error("syncContactDetails error:", error);
          return { detailsSynced: 0, labelsLinked: 0, errorsCount: 1 };
        }
      }),
    );

    for (const result of batchResults) {
      detailsSynced += result.detailsSynced;
      labelsLinked += result.labelsLinked;
      errorsCount += result.errorsCount;
    }
  }

  return { detailsSynced, labelsLinked, errorsCount };
}

async function createSyncRun(instance: InstanceRecord) {
  const { data, error } = await admin
    .from(SYNC_RUNS_TABLE)
    .insert({
      tenant_id: instance.tenant_id,
      instance_id: instance.id,
      status: "running",
      started_at: nowIso(),
      updated_at: nowIso(),
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

async function getSyncRun(syncRunId: string) {
  const { data, error } = await admin
    .from(SYNC_RUNS_TABLE)
    .select("*")
    .eq("id", syncRunId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Sync run not found");
  return data as {
    id: string;
    tenant_id: string;
    instance_id: string;
    labels_synced: number;
    contacts_listed: number;
    contacts_inserted: number;
    contacts_updated: number;
    details_synced: number;
    contact_labels_linked: number;
    errors_count: number;
    status: string;
  };
}

async function updateSyncRun(params: {
  syncRunId: string;
  labelsSynced: number;
  contactsListed: number;
  contactsInserted: number;
  contactsUpdated: number;
  detailsSynced: number;
  contactLabelsLinked: number;
  errorsCount: number;
  status: "running" | "completed" | "failed";
  errorMessage?: string | null;
  finalize?: boolean;
}) {
  const existing = await getSyncRun(params.syncRunId);
  const updates: Record<string, unknown> = {
    labels_synced: params.labelsSynced,
    contacts_listed: existing.contacts_listed + params.contactsListed,
    contacts_inserted: existing.contacts_inserted + params.contactsInserted,
    contacts_updated: existing.contacts_updated + params.contactsUpdated,
    details_synced: existing.details_synced + params.detailsSynced,
    contact_labels_linked:
      existing.contact_labels_linked + params.contactLabelsLinked,
    errors_count: existing.errors_count + params.errorsCount,
    status: params.status,
    error_message: params.errorMessage ?? null,
    updated_at: nowIso(),
  };

  if (params.finalize) {
    updates.finished_at = nowIso();
  }

  const { error } = await admin
    .from(SYNC_RUNS_TABLE)
    .update(updates)
    .eq("id", params.syncRunId);

  if (error) throw error;
}

async function refreshAudienceTotalContacts(audienceId: string) {
  const { count, error: countError } = await admin
    .from(AUDIENCE_CONTACTS_TABLE)
    .select("id", { count: "exact", head: true })
    .eq("audience_id", audienceId);

  if (countError) throw countError;

  const { error: updateError } = await admin
    .from(AUDIENCES_TABLE)
    .update({
      total_contacts: count || 0,
      updated_at: nowIso(),
    })
    .eq("id", audienceId);

  if (updateError) throw updateError;
}

async function refreshSyncedAudiencesForInstance(instance: InstanceRecord, syncRunId: string) {
  const { data: rules, error: rulesError } = await admin
    .from(AUDIENCE_SYNC_RULES_TABLE)
    .select("audience_id, instance_id, tenant_id, match_mode, label_ids, label_names, naming_term_normalized, sync_enabled")
    .eq("instance_id", instance.id)
    .eq("sync_enabled", true);

  if (rulesError) throw rulesError;
  if (!rules || rules.length === 0) return;

  for (const rule of rules as AudienceSyncRuleRecord[]) {
    let matchedContacts: {
      id: string;
      phone: string;
      jid: string;
      contact_name: string | null;
      display_name: string | null;
      wa_chatid: string | null;
    }[] = [];

    if (rule.match_mode === "labels") {
      const labelIds = Array.isArray(rule.label_ids)
        ? rule.label_ids.map((value) => String(value)).filter(Boolean)
        : [];

      if (labelIds.length === 0) continue;

      const { data: links, error: linksError } = await admin
        .from(CONTACT_LABELS_TABLE)
        .select("instance_contact_id, instance_label_id")
        .eq("instance_id", instance.id)
        .in("instance_label_id", labelIds);

      if (linksError) throw linksError;

      const contactIds = Array.from(
        new Set(
          (links ?? [])
            .map((row: { instance_contact_id: string }) => row.instance_contact_id)
            .filter(Boolean),
        ),
      );

      if (contactIds.length > 0) {
        const { data: contacts, error: contactsError } = await admin
          .from(CONTACTS_TABLE)
          .select("id, phone, jid, contact_name, display_name, wa_chatid")
          .in("id", contactIds);

        if (contactsError) throw contactsError;
        matchedContacts = (contacts ?? []) as typeof matchedContacts;
      }
    } else {
      const normalizedTerm = normalizeNamingValue(rule.naming_term_normalized);
      if (!normalizedTerm) continue;

      const { data: contacts, error: contactsError } = await admin
        .from(CONTACTS_TABLE)
        .select("id, phone, jid, contact_name, display_name, wa_chatid")
        .eq("instance_id", instance.id);

      if (contactsError) throw contactsError;

      matchedContacts = ((contacts ?? []) as typeof matchedContacts).filter((contact) => {
        const candidate = normalizeNamingValue(contact.contact_name) || normalizeNamingValue(contact.display_name);
        return candidate.includes(normalizedTerm);
      });
    }

    const uniqueByPhone = new Map<string, typeof matchedContacts[number]>();
    for (const contact of matchedContacts) {
      if (contact.phone) uniqueByPhone.set(contact.phone, contact);
    }

    const phones = Array.from(uniqueByPhone.keys());
    if (phones.length === 0) {
      const { error: ruleTouchError } = await admin
        .from(AUDIENCE_SYNC_RULES_TABLE)
        .update({
          last_synced_at: nowIso(),
          last_sync_run_id: syncRunId,
          updated_at: nowIso(),
        })
        .eq("audience_id", rule.audience_id);

      if (ruleTouchError) throw ruleTouchError;
      continue;
    }

    const { data: existingAudienceContacts, error: existingError } = await admin
      .from(AUDIENCE_CONTACTS_TABLE)
      .select("phone_number")
      .eq("audience_id", rule.audience_id)
      .in("phone_number", phones);

    if (existingError) throw existingError;

    const existingPhones = new Set(
      (existingAudienceContacts ?? []).map((row: { phone_number: string }) => row.phone_number),
    );

    const rowsToInsert = phones
      .filter((phone) => !existingPhones.has(phone))
      .map((phone) => {
        const contact = uniqueByPhone.get(phone)!;
        return {
          audience_id: rule.audience_id,
          phone_number: phone,
          name: contact.contact_name ?? contact.display_name ?? null,
          metadata: {
            source: "synced_contacts",
            auto_refreshed: true,
            instance_id: instance.id,
            instance_name: instance.instance_name,
            contact_sync_mode: rule.match_mode,
            matched_labels: rule.label_names ?? [],
            naming_term_normalized: rule.naming_term_normalized ?? null,
            source_contact_id: contact.id,
            jid: contact.jid,
            wa_chatid: contact.wa_chatid ?? null,
          },
        };
      });

    if (rowsToInsert.length > 0) {
      const { error: insertError } = await admin
        .from(AUDIENCE_CONTACTS_TABLE)
        .insert(rowsToInsert);

      if (insertError) throw insertError;
      await refreshAudienceTotalContacts(rule.audience_id);
    }

    const { error: ruleUpdateError } = await admin
      .from(AUDIENCE_SYNC_RULES_TABLE)
      .update({
        last_synced_at: nowIso(),
        last_sync_run_id: syncRunId,
        updated_at: nowIso(),
      })
      .eq("audience_id", rule.audience_id);

    if (ruleUpdateError) throw ruleUpdateError;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as SyncRequest;
    const authContext = await getAuthContext(req);
    const instanceId = body.instanceId;
    if (!instanceId) {
      throw new Error("instanceId is required");
    }

    const page = Math.max(1, Number(body.page ?? 1));
    const pageSize = Math.max(1, Math.min(100, Number(body.pageSize ?? 50)));
    const syncLabels = body.syncLabels ?? true;
    const syncDetails = body.syncDetails ?? true;

    const instance = await fetchInstance(instanceId);
    await authorizeInstanceAccess(authContext, instance);

    let syncRunId = body.syncRunId ?? null;
    if (syncRunId) {
      const existingRun = await getSyncRun(syncRunId);
      if (existingRun.instance_id !== instance.id) {
        throw new Error("syncRunId does not belong to this instance");
      }
    } else {
      const run = await createSyncRun(instance);
      syncRunId = run.id;
    }
    const resolvedSyncRunId = syncRunId;
    if (!resolvedSyncRunId) {
      throw new Error("Failed to initialize sync run");
    }

    let labelMap = new Map<string, string>();
    let labelsSynced = 0;
    if (syncLabels) {
      const labels = await fetchLabels(instance.token ?? "");
      labelMap = await upsertLabels(instance, labels);
      labelsSynced = labels.length;
    } else {
      const { data, error } = await admin
        .from(LABELS_TABLE)
        .select("id, external_label_id")
        .eq("instance_id", instance.id);
      if (error) throw error;
      labelMap = new Map(
        (data ?? []).map((row: { id: string; external_label_id: string }) => [
          row.external_label_id,
          row.id,
        ]),
      );
    }

    const contactsPage = await fetchContactsPage(instance.token ?? "", page, pageSize);
    const contacts = Array.isArray(contactsPage.contacts) ? contactsPage.contacts : [];
    const pagination = contactsPage.pagination ?? {};

    const { contactRows, insertedCount, updatedCount } = await upsertContacts(
      instance,
      contacts,
    );

    let detailsSynced = 0;
    let labelsLinked = 0;
    let errorsCount = 0;

    if (syncDetails && contactRows.length > 0) {
      const detailsResult = await syncContactDetails({
        instance,
        contactRows,
        labelMap,
      });
      detailsSynced = detailsResult.detailsSynced;
      labelsLinked = detailsResult.labelsLinked;
      errorsCount = detailsResult.errorsCount;
    }

    const hasNextPage = Boolean(pagination.hasNextPage);
    const nextPage = hasNextPage ? page + 1 : null;

    await updateSyncRun({
      syncRunId: resolvedSyncRunId,
      labelsSynced,
      contactsListed: contacts.length,
      contactsInserted: insertedCount,
      contactsUpdated: updatedCount,
      detailsSynced,
      contactLabelsLinked: labelsLinked,
      errorsCount,
      status: hasNextPage ? "running" : "completed",
      finalize: !hasNextPage,
    });

    if (!hasNextPage) {
      await refreshSyncedAudiencesForInstance(instance, resolvedSyncRunId);
    }

    return jsonResponse({
      syncRunId: resolvedSyncRunId,
      instanceId: instance.id,
      instanceName: instance.instance_name,
      page,
      pageSize,
      hasNextPage,
      nextPage,
      labelsSynced,
      contactsListed: contacts.length,
      contactsInserted: insertedCount,
      contactsUpdated: updatedCount,
      detailsSynced,
      contactLabelsLinked: labelsLinked,
      errorsCount,
      pagination,
    });
  } catch (error) {
    console.error("sync-instance-contacts error:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : String(error) },
      400,
    );
  }
});
