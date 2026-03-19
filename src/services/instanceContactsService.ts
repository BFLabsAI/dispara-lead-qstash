import {
  getEffectiveTenantId,
  invokeAuthenticatedEdgeFunction,
  supabase,
} from "@/services/supabaseClient";

const INSTANCES_TABLE = "instances_dispara_lead_saas_02";
const CONTACTS_TABLE = "instance_contacts_dispara_lead_saas_02";
const LABELS_TABLE = "instance_labels_dispara_lead_saas_02";
const CONTACT_LABELS_TABLE = "instance_contact_labels_dispara_lead_saas_02";
const SYNC_RUNS_TABLE = "instance_contact_sync_runs_dispara_lead_saas_02";
const ACTIVE_SYNC_STORAGE_KEY = "instance-contact-sync-jobs-v1";
const CONTACTS_SELECTED_INSTANCE_STORAGE_KEY = "contacts:selected-instance";
const DEFAULT_PAGE_SIZE = 50;
const CONTACTS_FETCH_BATCH_SIZE = 1000;

export interface InstanceListItem {
  id: string;
  instance_name: string;
  status: string | null;
}

export interface InstanceLabel {
  id: string;
  external_label_id: string;
  labelid: string | null;
  name: string | null;
  color_hex: string | null;
}

export interface InstanceContact {
  id: string;
  instance_id: string;
  jid: string;
  phone: string;
  display_name: string | null;
  contact_name: string | null;
  contact_first_name: string | null;
  details_name: string | null;
  wa_name: string | null;
  wa_contact_name: string | null;
  wa_chatid: string | null;
  wa_chatlid: string | null;
  wa_fastid: string | null;
  image_url: string | null;
  image_preview_url: string | null;
  wa_common_groups: string | null;
  lead_name: string | null;
  lead_full_name: string | null;
  lead_tags: string[];
  last_synced_at: string;
  labels: InstanceLabel[];
}

export interface InstanceSyncRun {
  id: string;
  instance_id: string;
  status: "running" | "completed" | "failed";
  labels_synced: number;
  contacts_listed: number;
  contacts_inserted: number;
  contacts_updated: number;
  details_synced: number;
  contact_labels_linked: number;
  errors_count: number;
  error_message: string | null;
  started_at: string;
  finished_at: string | null;
  updated_at: string;
}

export interface SyncInstanceContactsResponse {
  syncRunId: string;
  instanceId: string;
  instanceName: string;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  nextPage: number | null;
  labelsSynced: number;
  contactsListed: number;
  contactsInserted: number;
  contactsUpdated: number;
  detailsSynced: number;
  contactLabelsLinked: number;
  errorsCount: number;
  pagination?: {
    currentPage?: number;
    totalPages?: number;
    totalRecords?: number;
    hasNextPage?: boolean;
  };
}

export interface ContactSyncJobState {
  instanceId: string;
  syncRunId: string | null;
  status: "idle" | "running" | "completed" | "failed";
  currentPage: number;
  nextPage: number | null;
  updatedAt: string | null;
  startedAt: string | null;
  error: string | null;
  lastResult: SyncInstanceContactsResponse | null;
}

type ContactLabelLinkRow = {
  instance_contact_id: string;
  external_label_id: string;
};

type SyncJobRecord = {
  promise: Promise<void> | null;
  state: ContactSyncJobState;
};

type SyncJobListener = (stateByInstanceId: Record<string, ContactSyncJobState>) => void;

const listeners = new Set<SyncJobListener>();
const syncJobs = new Map<string, SyncJobRecord>();

function readStoredJobs(): Record<string, ContactSyncJobState> {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(ACTIVE_SYNC_STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as Record<string, ContactSyncJobState>;
    return parsed ?? {};
  } catch {
    return {};
  }
}

function writeStoredJobs(states: Record<string, ContactSyncJobState>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACTIVE_SYNC_STORAGE_KEY, JSON.stringify(states));
}

function getPersistedStateMap() {
  const persisted = readStoredJobs();

  for (const [instanceId, state] of Object.entries(persisted)) {
    if (!syncJobs.has(instanceId)) {
      syncJobs.set(instanceId, { promise: null, state });
    }
  }

  return Object.fromEntries(
    Array.from(syncJobs.entries()).map(([instanceId, record]) => [instanceId, record.state]),
  );
}

function notifySyncJobListeners() {
  const snapshot = getPersistedStateMap();
  writeStoredJobs(snapshot);
  for (const listener of listeners) {
    listener(snapshot);
  }
}

function setSyncJobState(instanceId: string, nextState: Partial<ContactSyncJobState>) {
  const existing = syncJobs.get(instanceId)?.state ?? {
    instanceId,
    syncRunId: null,
    status: "idle" as const,
    currentPage: 0,
    nextPage: 1,
    updatedAt: null,
    startedAt: null,
    error: null,
    lastResult: null,
  };

  syncJobs.set(instanceId, {
    promise: syncJobs.get(instanceId)?.promise ?? null,
    state: {
      ...existing,
      ...nextState,
    },
  });

  notifySyncJobListeners();
}

export function subscribeToContactSyncJobs(listener: SyncJobListener) {
  listeners.add(listener);
  listener(getPersistedStateMap());

  return () => {
    listeners.delete(listener);
  };
}

export function getContactSyncJobState(instanceId: string) {
  return getPersistedStateMap()[instanceId] ?? null;
}

export function getStoredSelectedContactsInstance() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(CONTACTS_SELECTED_INSTANCE_STORAGE_KEY);
}

export function setStoredSelectedContactsInstance(instanceId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CONTACTS_SELECTED_INSTANCE_STORAGE_KEY, instanceId);
}

export async function getTenantInstances() {
  const tenantId = await getEffectiveTenantId();
  if (!tenantId) {
    throw new Error("Tenant não encontrado");
  }

  const { data, error } = await supabase
    .from(INSTANCES_TABLE)
    .select("id, instance_name, status")
    .eq("tenant_id", tenantId)
    .order("instance_name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as InstanceListItem[];
}

export async function getLatestSyncRunsByInstance(instanceIds: string[]) {
  if (instanceIds.length === 0) {
    return {} as Record<string, InstanceSyncRun | null>;
  }

  const { data, error } = await supabase
    .from(SYNC_RUNS_TABLE)
    .select("*")
    .in("instance_id", instanceIds)
    .order("started_at", { ascending: false });

  if (error) throw error;

  const latestByInstance: Record<string, InstanceSyncRun | null> = {};
  for (const instanceId of instanceIds) {
    latestByInstance[instanceId] = null;
  }

  for (const row of (data ?? []) as InstanceSyncRun[]) {
    if (!latestByInstance[row.instance_id]) {
      latestByInstance[row.instance_id] = row;
    }
  }

  return latestByInstance;
}

export async function getLatestSyncRun(instanceId: string) {
  const { data, error } = await supabase
    .from(SYNC_RUNS_TABLE)
    .select("*")
    .eq("instance_id", instanceId)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as InstanceSyncRun | null;
}

export async function getInstanceContacts(instanceId: string) {
  const allContacts: Omit<InstanceContact, "labels">[] = [];
  let from = 0;

  while (true) {
    const to = from + CONTACTS_FETCH_BATCH_SIZE - 1;
    const { data, error } = await supabase
      .from(CONTACTS_TABLE)
      .select(`
        id,
        instance_id,
        jid,
        phone,
        display_name,
        contact_name,
        contact_first_name,
        details_name,
        wa_name,
        wa_contact_name,
        wa_chatid,
        wa_chatlid,
        wa_fastid,
        image_url,
        image_preview_url,
        wa_common_groups,
        lead_name,
        lead_full_name,
        lead_tags,
        last_synced_at
      `)
      .eq("instance_id", instanceId)
      .order("display_name", { ascending: true, nullsFirst: false })
      .order("contact_name", { ascending: true, nullsFirst: false })
      .order("phone", { ascending: true })
      .range(from, to);

    if (error) throw error;

    const batch = (data ?? []) as Omit<InstanceContact, "labels">[];
    allContacts.push(...batch);

    if (batch.length < CONTACTS_FETCH_BATCH_SIZE) {
      break;
    }

    from += CONTACTS_FETCH_BATCH_SIZE;
  }

  const [contactsResult, labelsResult, linksResult] = await Promise.all([
    Promise.resolve({ data: allContacts, error: null }),
    supabase
      .from(LABELS_TABLE)
      .select("id, external_label_id, labelid, name, color_hex")
      .eq("instance_id", instanceId),
    supabase
      .from(CONTACT_LABELS_TABLE)
      .select("instance_contact_id, external_label_id")
      .eq("instance_id", instanceId),
  ]);

  if (contactsResult.error) throw contactsResult.error;
  if (labelsResult.error) throw labelsResult.error;
  if (linksResult.error) throw linksResult.error;

  const labels = (labelsResult.data ?? []) as InstanceLabel[];
  const links = (linksResult.data ?? []) as ContactLabelLinkRow[];
  const labelsByExternalId = new Map(labels.map((label) => [label.external_label_id, label]));
  const labelsByContactId = new Map<string, InstanceLabel[]>();

  for (const link of links) {
    const resolvedLabel = labelsByExternalId.get(link.external_label_id);
    if (!resolvedLabel) continue;

    const existing = labelsByContactId.get(link.instance_contact_id) ?? [];
    existing.push(resolvedLabel);
    labelsByContactId.set(link.instance_contact_id, existing);
  }

  return ((contactsResult.data ?? []) as Omit<InstanceContact, "labels">[]).map((contact) => ({
    ...contact,
    lead_tags: Array.isArray(contact.lead_tags) ? contact.lead_tags : [],
    labels: labelsByContactId.get(contact.id) ?? [],
  }));
}

async function syncContactsLoop(instanceId: string) {
  const existingRecord = syncJobs.get(instanceId);
  if (existingRecord?.promise) {
    return existingRecord.promise;
  }

  const promise = (async () => {
    let page = 1;
    let syncRunId: string | null = existingRecord?.state.syncRunId ?? null;

    setSyncJobState(instanceId, {
      status: "running",
      error: null,
      currentPage: page,
      nextPage: page,
      startedAt: existingRecord?.state.startedAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    while (true) {
      const result = await invokeAuthenticatedEdgeFunction<SyncInstanceContactsResponse>(
        "sync-instance-contacts",
        {
          instanceId,
          syncRunId,
          page,
          pageSize: DEFAULT_PAGE_SIZE,
          syncLabels: page === 1,
          syncDetails: true,
        },
      );

      syncRunId = result.syncRunId;

      setSyncJobState(instanceId, {
        syncRunId,
        status: result.hasNextPage ? "running" : "completed",
        currentPage: result.page,
        nextPage: result.nextPage,
        updatedAt: new Date().toISOString(),
        error: null,
        lastResult: result,
      });

      if (!result.hasNextPage || !result.nextPage) {
        break;
      }

      page = result.nextPage;
    }
  })()
    .catch((error) => {
      setSyncJobState(instanceId, {
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
        updatedAt: new Date().toISOString(),
      });
      throw error;
    })
    .finally(() => {
      const record = syncJobs.get(instanceId);
      if (record) {
        syncJobs.set(instanceId, {
          promise: null,
          state: record.state,
        });
        notifySyncJobListeners();
      }
    });

  syncJobs.set(instanceId, {
    promise,
    state: syncJobs.get(instanceId)?.state ?? {
      instanceId,
      syncRunId,
      status: "running",
      currentPage: 1,
      nextPage: 1,
      updatedAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      error: null,
      lastResult: null,
    },
  });

  notifySyncJobListeners();
  return promise;
}

export async function startInstanceContactsSync(instanceId: string) {
  await syncContactsLoop(instanceId);
}
