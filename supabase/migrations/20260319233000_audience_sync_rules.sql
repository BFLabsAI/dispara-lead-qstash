create table if not exists public.audience_sync_rules_dispara_lead_saas_02 (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants_dispara_lead_saas_02(id) on delete cascade,
  audience_id uuid not null references public.audiences_dispara_lead_saas_02(id) on delete cascade,
  instance_id uuid not null,
  source_type text not null check (source_type in ('synced_contacts')),
  match_mode text not null check (match_mode in ('labels', 'naming')),
  label_ids jsonb not null default '[]'::jsonb,
  label_names jsonb not null default '[]'::jsonb,
  naming_term text,
  naming_term_normalized text,
  sync_enabled boolean not null default true,
  last_synced_at timestamptz,
  last_sync_run_id uuid references public.instance_contact_sync_runs_dispara_lead_saas_02(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint audience_sync_rules_dispara_lead_saas_02_unique_audience unique (audience_id),
  constraint audience_sync_rules_dispara_lead_saas_02_instance_fk
    foreign key (instance_id, tenant_id)
    references public.instances_dispara_lead_saas_02 (id, tenant_id)
    on delete cascade
);

create index if not exists audience_sync_rules_dispara_lead_saas_02_tenant_idx
on public.audience_sync_rules_dispara_lead_saas_02 (tenant_id);

create index if not exists audience_sync_rules_dispara_lead_saas_02_instance_idx
on public.audience_sync_rules_dispara_lead_saas_02 (instance_id);

alter table public.audience_sync_rules_dispara_lead_saas_02 enable row level security;

drop policy if exists "Tenant read audience sync rules"
on public.audience_sync_rules_dispara_lead_saas_02;

create policy "Tenant read audience sync rules"
on public.audience_sync_rules_dispara_lead_saas_02
for select
using (tenant_id = public.get_current_tenant_id() or public.is_user_super_admin());

drop policy if exists "Tenant write audience sync rules"
on public.audience_sync_rules_dispara_lead_saas_02;

create policy "Tenant write audience sync rules"
on public.audience_sync_rules_dispara_lead_saas_02
for all
using (tenant_id = public.get_current_tenant_id() or public.is_user_super_admin())
with check (tenant_id = public.get_current_tenant_id() or public.is_user_super_admin());

grant all on public.audience_sync_rules_dispara_lead_saas_02 to authenticated;
grant all on public.audience_sync_rules_dispara_lead_saas_02 to service_role;
