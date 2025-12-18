-- Migration: Fix handle_new_user trigger to conflict with User Invites
-- Date: 2025-12-18
-- Author: Antigravity

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_tenant_id uuid;
  default_plan_id uuid;
  company_name text;
  tenant_slug text;
BEGIN
  -- CHECK FOR INVITE
  -- If user is invited (indicated by metadata), we skip automated tenant creation.
  -- The Edge Function (auth_manager) handles the profile creation via upsert.
  IF (new.raw_user_meta_data->>'invited_to_tenant_id') IS NOT NULL THEN
      RETURN new;
  END IF;

  -- NORMAL FLOW (Sign Up) - Create Tenant and Owner Profile
  
  -- 1. Get Company Name or default
  company_name := coalesce(new.raw_user_meta_data->>'company_name', 'Minha Empresa');
  
  -- 2. Generate slug
  tenant_slug := lower(regexp_replace(company_name, '[^a-zA-Z0-9]', '', 'g')) || '-' || floor(random() * 1000)::text;

  -- 3. Get Default Plan
  SELECT id INTO default_plan_id FROM public.plans_dispara_lead_saas_02 WHERE slug = 'basic' LIMIT 1;
  IF default_plan_id IS NULL THEN
      SELECT id INTO default_plan_id FROM public.plans_dispara_lead_saas_02 LIMIT 1;
  END IF;

  -- 4. Create Tenant
  INSERT INTO public.tenants_dispara_lead_saas_02 (name, slug, owner_id, plan_id, status)
  VALUES (company_name, tenant_slug, new.id, default_plan_id, 'active')
  RETURNING id INTO new_tenant_id;

  -- 5. Create User Profile
  INSERT INTO public.users_dispara_lead_saas_02 (id, tenant_id, role, email, full_name)
  VALUES (
    new.id, 
    new_tenant_id, 
    'owner', 
    new.email, 
    coalesce(new.raw_user_meta_data->>'full_name', company_name)
  );

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure trigger is applied (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Drop legacy unrelated trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created_mktopps_hub_r7 ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_mktopps_hub_r7();
