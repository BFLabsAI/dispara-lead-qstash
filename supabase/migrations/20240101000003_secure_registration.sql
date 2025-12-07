-- Function to handle new user registration automatically
CREATE OR REPLACE FUNCTION public.handle_new_user_dispara_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_tenant_id uuid;
  default_plan_id uuid;
  company_name text;
  tenant_slug text;
BEGIN
  -- 1. Get Company Name from metadata or default
  company_name := coalesce(new.raw_user_meta_data->>'company_name', 'Minha Empresa');
  
  -- 2. Generate a basic slug (sanitize name)
  tenant_slug := lower(regexp_replace(company_name, '[^a-zA-Z0-9]', '', 'g')) || '-' || floor(random() * 1000)::text;

  -- 3. Get Default Plan (Basic)
  SELECT id INTO default_plan_id FROM public.plans_dispara_lead_saas_02 WHERE slug = 'basic' LIMIT 1;
  
  -- Fallback if no basic plan exists (should not happen if seeded, but safety first)
  IF default_plan_id IS NULL THEN
      -- Try to get ANY plan
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
$$;

-- Trigger definition
DROP TRIGGER IF EXISTS on_auth_user_created_dispara_lead ON auth.users;
CREATE TRIGGER on_auth_user_created_dispara_lead
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_dispara_lead();
