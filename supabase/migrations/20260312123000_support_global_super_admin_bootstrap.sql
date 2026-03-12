CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_tenant_id uuid;
  default_plan_id uuid;
  company_name text;
  tenant_slug text;
BEGIN
  -- Invites and admin-provisioned accounts can opt out of automatic tenant/profile bootstrap.
  IF (new.raw_user_meta_data->>'invited_to_tenant_id') IS NOT NULL
     OR coalesce(new.raw_user_meta_data->>'skip_profile_bootstrap', 'false') = 'true' THEN
      RETURN new;
  END IF;

  company_name := coalesce(new.raw_user_meta_data->>'company_name', 'Minha Empresa');
  tenant_slug := lower(regexp_replace(company_name, '[^a-zA-Z0-9]', '', 'g')) || '-' || floor(random() * 1000)::text;

  SELECT id INTO default_plan_id
  FROM public.plans_dispara_lead_saas_02
  WHERE slug = 'basic'
  LIMIT 1;

  IF default_plan_id IS NULL THEN
      SELECT id INTO default_plan_id
      FROM public.plans_dispara_lead_saas_02
      LIMIT 1;
  END IF;

  INSERT INTO public.tenants_dispara_lead_saas_02 (name, slug, owner_id, plan_id, status)
  VALUES (company_name, tenant_slug, new.id, default_plan_id, 'active')
  RETURNING id INTO new_tenant_id;

  INSERT INTO public.users_dispara_lead_saas_02 (id, tenant_id, role, email, full_name)
  VALUES (
    new.id,
    new_tenant_id,
    'owner',
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', company_name)
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
