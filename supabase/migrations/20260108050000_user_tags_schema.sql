-- Create definition table for User Tags
create table if not exists user_tags_dispara_lead_saas_02 (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  color text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add tags JSON column to contacts with default empty array and max length constraint
alter table contacts_dispara_lead_saas_02
add column if not exists tags jsonb default '[]'::jsonb;

-- Add check constraint for max 3 tags
alter table contacts_dispara_lead_saas_02
add constraint contacts_tags_max_length check (jsonb_array_length(tags) <= 3);

-- RLS Policies for User Tags
alter table user_tags_dispara_lead_saas_02 enable row level security;

create policy "Users can view tags for their tenant"
  on user_tags_dispara_lead_saas_02 for select
  using (tenant_id = (select auth.jwt() ->> 'tenant_id')::uuid);

create policy "Users can insert tags for their tenant"
  on user_tags_dispara_lead_saas_02 for insert
  with check (tenant_id = (select auth.jwt() ->> 'tenant_id')::uuid);

create policy "Users can update tags for their tenant"
  on user_tags_dispara_lead_saas_02 for update
  using (tenant_id = (select auth.jwt() ->> 'tenant_id')::uuid);

create policy "Users can delete tags for their tenant"
  on user_tags_dispara_lead_saas_02 for delete
  using (tenant_id = (select auth.jwt() ->> 'tenant_id')::uuid);
