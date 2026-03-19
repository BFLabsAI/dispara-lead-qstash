-- Instance contact sync schema
-- Stores instance-scoped labels, contacts, label links, and sync run audit data.

create unique index if not exists instances_dispara_lead_saas_02_id_tenant_unique_idx
on public.instances_dispara_lead_saas_02 (id, tenant_id);

create table if not exists public.instance_labels_dispara_lead_saas_02 (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants_dispara_lead_saas_02(id) on delete cascade,
  instance_id uuid not null,
  external_label_id text not null,
  labelid text,
  owner text,
  name text,
  color integer,
  color_hex text,
  raw_payload jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint instance_labels_dispara_lead_saas_02_instance_fk
    foreign key (instance_id, tenant_id)
    references public.instances_dispara_lead_saas_02 (id, tenant_id)
    on delete cascade,
  constraint instance_labels_dispara_lead_saas_02_unique
    unique (instance_id, external_label_id)
);

create table if not exists public.instance_contacts_dispara_lead_saas_02 (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants_dispara_lead_saas_02(id) on delete cascade,
  instance_id uuid not null,
  jid text not null,
  phone text not null,
  contact_name text,
  contact_first_name text,
  display_name text,
  details_name text,
  wa_name text,
  wa_contact_name text,
  wa_chatid text,
  wa_chatlid text,
  wa_fastid text,
  owner_phone text,
  image_url text,
  image_preview_url text,
  wa_common_groups text,
  lead_name text,
  lead_full_name text,
  lead_tags jsonb not null default '[]'::jsonb,
  raw_contact_payload jsonb not null default '{}'::jsonb,
  raw_details_payload jsonb not null default '{}'::jsonb,
  contacts_last_synced_at timestamptz,
  details_last_synced_at timestamptz,
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint instance_contacts_dispara_lead_saas_02_instance_fk
    foreign key (instance_id, tenant_id)
    references public.instances_dispara_lead_saas_02 (id, tenant_id)
    on delete cascade,
  constraint instance_contacts_dispara_lead_saas_02_unique
    unique (instance_id, jid)
);

create unique index if not exists instance_contacts_dispara_lead_saas_02_id_instance_tenant_unique_idx
on public.instance_contacts_dispara_lead_saas_02 (id, instance_id, tenant_id);

create table if not exists public.instance_contact_labels_dispara_lead_saas_02 (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants_dispara_lead_saas_02(id) on delete cascade,
  instance_id uuid not null,
  instance_contact_id uuid not null,
  instance_label_id uuid references public.instance_labels_dispara_lead_saas_02(id) on delete set null,
  external_label_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_synced_at timestamptz not null default now(),
  constraint instance_contact_labels_dispara_lead_saas_02_contact_fk
    foreign key (instance_contact_id, instance_id, tenant_id)
    references public.instance_contacts_dispara_lead_saas_02 (id, instance_id, tenant_id)
    on delete cascade,
  constraint instance_contact_labels_dispara_lead_saas_02_unique
    unique (instance_contact_id, external_label_id)
);

create table if not exists public.instance_contact_sync_runs_dispara_lead_saas_02 (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants_dispara_lead_saas_02(id) on delete cascade,
  instance_id uuid not null,
  status text not null check (status in ('running', 'completed', 'failed')),
  labels_synced integer not null default 0,
  contacts_listed integer not null default 0,
  contacts_inserted integer not null default 0,
  contacts_updated integer not null default 0,
  details_synced integer not null default 0,
  contact_labels_linked integer not null default 0,
  errors_count integer not null default 0,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint instance_contact_sync_runs_dispara_lead_saas_02_instance_fk
    foreign key (instance_id, tenant_id)
    references public.instances_dispara_lead_saas_02 (id, tenant_id)
    on delete cascade
);

create index if not exists instance_labels_dispara_lead_saas_02_tenant_idx
on public.instance_labels_dispara_lead_saas_02 (tenant_id);

create index if not exists instance_labels_dispara_lead_saas_02_instance_idx
on public.instance_labels_dispara_lead_saas_02 (instance_id);

create index if not exists instance_contacts_dispara_lead_saas_02_tenant_idx
on public.instance_contacts_dispara_lead_saas_02 (tenant_id);

create index if not exists instance_contacts_dispara_lead_saas_02_instance_idx
on public.instance_contacts_dispara_lead_saas_02 (instance_id);

create index if not exists instance_contacts_dispara_lead_saas_02_phone_idx
on public.instance_contacts_dispara_lead_saas_02 (instance_id, phone);

create index if not exists instance_contact_labels_dispara_lead_saas_02_contact_idx
on public.instance_contact_labels_dispara_lead_saas_02 (instance_contact_id);

create index if not exists instance_contact_labels_dispara_lead_saas_02_instance_idx
on public.instance_contact_labels_dispara_lead_saas_02 (instance_id);

create index if not exists instance_contact_sync_runs_dispara_lead_saas_02_instance_idx
on public.instance_contact_sync_runs_dispara_lead_saas_02 (instance_id, started_at desc);

alter table public.instance_labels_dispara_lead_saas_02 enable row level security;
alter table public.instance_contacts_dispara_lead_saas_02 enable row level security;
alter table public.instance_contact_labels_dispara_lead_saas_02 enable row level security;
alter table public.instance_contact_sync_runs_dispara_lead_saas_02 enable row level security;

drop policy if exists "Service role full access instance_labels"
on public.instance_labels_dispara_lead_saas_02;

create policy "Service role full access instance_labels"
on public.instance_labels_dispara_lead_saas_02
for all
using (auth.jwt() ->> 'role' = 'service_role')
with check (auth.jwt() ->> 'role' = 'service_role');

drop policy if exists "Service role full access instance_contacts"
on public.instance_contacts_dispara_lead_saas_02;

create policy "Service role full access instance_contacts"
on public.instance_contacts_dispara_lead_saas_02
for all
using (auth.jwt() ->> 'role' = 'service_role')
with check (auth.jwt() ->> 'role' = 'service_role');

drop policy if exists "Service role full access instance_contact_labels"
on public.instance_contact_labels_dispara_lead_saas_02;

create policy "Service role full access instance_contact_labels"
on public.instance_contact_labels_dispara_lead_saas_02
for all
using (auth.jwt() ->> 'role' = 'service_role')
with check (auth.jwt() ->> 'role' = 'service_role');

drop policy if exists "Service role full access instance_contact_sync_runs"
on public.instance_contact_sync_runs_dispara_lead_saas_02;

create policy "Service role full access instance_contact_sync_runs"
on public.instance_contact_sync_runs_dispara_lead_saas_02
for all
using (auth.jwt() ->> 'role' = 'service_role')
with check (auth.jwt() ->> 'role' = 'service_role');

drop policy if exists "Tenant read access instance_labels"
on public.instance_labels_dispara_lead_saas_02;

create policy "Tenant read access instance_labels"
on public.instance_labels_dispara_lead_saas_02
for select
using (tenant_id = public.get_current_tenant_id() or public.is_user_super_admin());

drop policy if exists "Tenant read access instance_contacts"
on public.instance_contacts_dispara_lead_saas_02;

create policy "Tenant read access instance_contacts"
on public.instance_contacts_dispara_lead_saas_02
for select
using (tenant_id = public.get_current_tenant_id() or public.is_user_super_admin());

drop policy if exists "Tenant read access instance_contact_labels"
on public.instance_contact_labels_dispara_lead_saas_02;

create policy "Tenant read access instance_contact_labels"
on public.instance_contact_labels_dispara_lead_saas_02
for select
using (tenant_id = public.get_current_tenant_id() or public.is_user_super_admin());

drop policy if exists "Tenant read access instance_contact_sync_runs"
on public.instance_contact_sync_runs_dispara_lead_saas_02;

create policy "Tenant read access instance_contact_sync_runs"
on public.instance_contact_sync_runs_dispara_lead_saas_02
for select
using (tenant_id = public.get_current_tenant_id() or public.is_user_super_admin());

grant select on public.instance_labels_dispara_lead_saas_02 to authenticated;
grant select on public.instance_contacts_dispara_lead_saas_02 to authenticated;
grant select on public.instance_contact_labels_dispara_lead_saas_02 to authenticated;
grant select on public.instance_contact_sync_runs_dispara_lead_saas_02 to authenticated;

grant all on public.instance_labels_dispara_lead_saas_02 to service_role;
grant all on public.instance_contacts_dispara_lead_saas_02 to service_role;
grant all on public.instance_contact_labels_dispara_lead_saas_02 to service_role;
grant all on public.instance_contact_sync_runs_dispara_lead_saas_02 to service_role;
