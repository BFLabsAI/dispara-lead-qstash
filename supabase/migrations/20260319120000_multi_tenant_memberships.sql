-- Multi-tenant membership foundation
-- Date: 2026-03-19
-- Purpose: allow a single auth user to belong to multiple tenants while keeping a current tenant context.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. Schema
-- -----------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users_dispara_lead_saas_02'
      AND column_name = 'current_tenant_id'
  ) THEN
    ALTER TABLE public.users_dispara_lead_saas_02
      ADD COLUMN current_tenant_id uuid;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_dispara_lead_saas_02_current_tenant_id_fkey'
  ) THEN
    ALTER TABLE public.users_dispara_lead_saas_02
      ADD CONSTRAINT users_dispara_lead_saas_02_current_tenant_id_fkey
      FOREIGN KEY (current_tenant_id)
      REFERENCES public.tenants_dispara_lead_saas_02(id)
      ON DELETE SET NULL;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_users_dispara_lead_saas_02_current_tenant_id
  ON public.users_dispara_lead_saas_02 (current_tenant_id);

CREATE TABLE IF NOT EXISTS public.user_tenant_memberships_dispara_lead_saas_02 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants_dispara_lead_saas_02(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  status text NOT NULL DEFAULT 'active',
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_tenant_memberships_role_check
    CHECK (role IN ('owner', 'admin', 'member')),
  CONSTRAINT user_tenant_memberships_status_check
    CHECK (status IN ('invited', 'active', 'disabled'))
);

CREATE UNIQUE INDEX IF NOT EXISTS user_tenant_memberships_unique_user_tenant_idx
  ON public.user_tenant_memberships_dispara_lead_saas_02 (user_id, tenant_id);

CREATE INDEX IF NOT EXISTS user_tenant_memberships_user_idx
  ON public.user_tenant_memberships_dispara_lead_saas_02 (user_id);

CREATE INDEX IF NOT EXISTS user_tenant_memberships_tenant_idx
  ON public.user_tenant_memberships_dispara_lead_saas_02 (tenant_id);

CREATE INDEX IF NOT EXISTS user_tenant_memberships_tenant_role_status_idx
  ON public.user_tenant_memberships_dispara_lead_saas_02 (tenant_id, role, status);

ALTER TABLE public.user_tenant_memberships_dispara_lead_saas_02
  ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 2. Helper functions
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.users_dispara_lead_saas_02
    WHERE id = auth.uid()
      AND coalesce(is_super_admin, false) = true
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_user_super_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN public.is_super_admin();
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_user_member_of_tenant(p_user_id uuid, p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_tenant_memberships_dispara_lead_saas_02 m
    WHERE m.user_id = p_user_id
      AND m.tenant_id = p_tenant_id
      AND m.status = 'active'
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_member_of_tenant(p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT public.is_user_member_of_tenant(auth.uid(), p_tenant_id)
     OR public.is_super_admin();
$function$;

CREATE OR REPLACE FUNCTION public.is_user_tenant_admin(p_user_id uuid, p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_tenant_memberships_dispara_lead_saas_02 m
    WHERE m.user_id = p_user_id
      AND m.tenant_id = p_tenant_id
      AND m.status = 'active'
      AND m.role IN ('owner', 'admin')
  );
$function$;

CREATE OR REPLACE FUNCTION public.has_tenant_admin_access(p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT public.is_user_tenant_admin(auth.uid(), p_tenant_id)
     OR public.is_super_admin();
$function$;

CREATE OR REPLACE FUNCTION public.resolve_user_current_tenant(p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_current_tenant_id uuid;
  v_legacy_tenant_id uuid;
  v_is_super_admin boolean;
  v_resolved_tenant_id uuid;
BEGIN
  SELECT u.current_tenant_id, u.tenant_id, coalesce(u.is_super_admin, false)
    INTO v_current_tenant_id, v_legacy_tenant_id, v_is_super_admin
  FROM public.users_dispara_lead_saas_02 u
  WHERE u.id = p_user_id;

  IF v_current_tenant_id IS NOT NULL THEN
    IF v_is_super_admin OR public.is_user_member_of_tenant(p_user_id, v_current_tenant_id) THEN
      RETURN v_current_tenant_id;
    END IF;
  END IF;

  IF v_legacy_tenant_id IS NOT NULL THEN
    IF v_is_super_admin OR public.is_user_member_of_tenant(p_user_id, v_legacy_tenant_id) THEN
      RETURN v_legacy_tenant_id;
    END IF;
  END IF;

  SELECT m.tenant_id
    INTO v_resolved_tenant_id
  FROM public.user_tenant_memberships_dispara_lead_saas_02 m
  WHERE m.user_id = p_user_id
    AND m.status = 'active'
  ORDER BY
    CASE WHEN m.role = 'owner' THEN 0 WHEN m.role = 'admin' THEN 1 ELSE 2 END,
    m.created_at ASC
  LIMIT 1;

  RETURN v_resolved_tenant_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN public.resolve_user_current_tenant(auth.uid());
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_my_tenant_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN public.resolve_user_current_tenant(auth.uid());
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_my_memberships()
RETURNS TABLE (
  tenant_id uuid,
  tenant_name text,
  role text,
  status text,
  is_current boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT
    m.tenant_id,
    t.name AS tenant_name,
    m.role,
    m.status,
    m.tenant_id = u.current_tenant_id AS is_current
  FROM public.user_tenant_memberships_dispara_lead_saas_02 m
  JOIN public.users_dispara_lead_saas_02 u
    ON u.id = m.user_id
  LEFT JOIN public.tenants_dispara_lead_saas_02 t
    ON t.id = m.tenant_id
  WHERE m.user_id = auth.uid()
    AND m.status = 'active'
  ORDER BY
    CASE WHEN m.tenant_id = u.current_tenant_id THEN 0
         WHEN m.role = 'owner' THEN 1
         WHEN m.role = 'admin' THEN 2
         ELSE 3 END,
    m.created_at ASC;
$function$;

CREATE OR REPLACE FUNCTION public.set_current_tenant_id(p_tenant_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NOT public.is_super_admin() AND NOT public.is_member_of_tenant(p_tenant_id) THEN
    RAISE EXCEPTION 'Forbidden: tenant is not available for this user';
  END IF;

  UPDATE public.users_dispara_lead_saas_02
  SET current_tenant_id = p_tenant_id,
      updated_at = now()
  WHERE id = auth.uid();

  RETURN p_tenant_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_user_current_tenant(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_resolved_tenant_id uuid;
BEGIN
  v_resolved_tenant_id := public.resolve_user_current_tenant(p_user_id);

  UPDATE public.users_dispara_lead_saas_02
  SET current_tenant_id = v_resolved_tenant_id,
      updated_at = now()
  WHERE id = p_user_id
    AND (
      current_tenant_id IS DISTINCT FROM v_resolved_tenant_id
      OR updated_at IS NULL
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.touch_user_tenant_membership_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_user_current_tenant_from_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_user_id := OLD.user_id;
  ELSE
    v_user_id := NEW.user_id;
  END IF;

  PERFORM public.sync_user_current_tenant(v_user_id);
  RETURN coalesce(NEW, OLD);
END;
$function$;

-- -----------------------------------------------------------------------------
-- 3. Policies for memberships
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Members can view memberships" ON public.user_tenant_memberships_dispara_lead_saas_02;
CREATE POLICY "Members can view memberships"
ON public.user_tenant_memberships_dispara_lead_saas_02
FOR SELECT
USING (
  auth.uid() = user_id
  OR public.has_tenant_admin_access(tenant_id)
);

DROP POLICY IF EXISTS "Tenant admins can add memberships" ON public.user_tenant_memberships_dispara_lead_saas_02;
CREATE POLICY "Tenant admins can add memberships"
ON public.user_tenant_memberships_dispara_lead_saas_02
FOR INSERT
WITH CHECK (
  public.has_tenant_admin_access(tenant_id)
);

DROP POLICY IF EXISTS "Tenant admins can update memberships" ON public.user_tenant_memberships_dispara_lead_saas_02;
CREATE POLICY "Tenant admins can update memberships"
ON public.user_tenant_memberships_dispara_lead_saas_02
FOR UPDATE
USING (
  public.has_tenant_admin_access(tenant_id)
)
WITH CHECK (
  public.has_tenant_admin_access(tenant_id)
);

DROP POLICY IF EXISTS "Tenant admins can delete memberships" ON public.user_tenant_memberships_dispara_lead_saas_02;
CREATE POLICY "Tenant admins can delete memberships"
ON public.user_tenant_memberships_dispara_lead_saas_02
FOR DELETE
USING (
  public.has_tenant_admin_access(tenant_id)
);

-- -----------------------------------------------------------------------------
-- 4. Triggers
-- -----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_touch_user_tenant_membership_updated_at ON public.user_tenant_memberships_dispara_lead_saas_02;
CREATE TRIGGER trg_touch_user_tenant_membership_updated_at
BEFORE UPDATE ON public.user_tenant_memberships_dispara_lead_saas_02
FOR EACH ROW
EXECUTE FUNCTION public.touch_user_tenant_membership_updated_at();

DROP TRIGGER IF EXISTS trg_sync_user_current_tenant_from_membership ON public.user_tenant_memberships_dispara_lead_saas_02;
CREATE TRIGGER trg_sync_user_current_tenant_from_membership
AFTER INSERT OR UPDATE OR DELETE ON public.user_tenant_memberships_dispara_lead_saas_02
FOR EACH ROW
EXECUTE FUNCTION public.sync_user_current_tenant_from_membership();

-- -----------------------------------------------------------------------------
-- 5. Backfill
-- -----------------------------------------------------------------------------

INSERT INTO public.user_tenant_memberships_dispara_lead_saas_02 (
  user_id,
  tenant_id,
  role,
  status,
  invited_by,
  created_at,
  updated_at
)
SELECT
  u.id AS user_id,
  u.tenant_id AS tenant_id,
  coalesce(u.role, 'member') AS role,
  'active' AS status,
  NULL::uuid AS invited_by,
  coalesce(u.created_at, now()) AS created_at,
  coalesce(u.updated_at, now()) AS updated_at
FROM public.users_dispara_lead_saas_02 u
WHERE u.tenant_id IS NOT NULL
ON CONFLICT (user_id, tenant_id) DO NOTHING;

UPDATE public.users_dispara_lead_saas_02
SET current_tenant_id = tenant_id
WHERE current_tenant_id IS NULL
  AND tenant_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 6. Bootstrap for new auth.users signups
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  new_tenant_id uuid;
  default_plan_id uuid;
  company_name text;
  tenant_slug text;
BEGIN
  -- Admin-provisioned accounts can opt out of automatic bootstrap.
  IF coalesce(new.raw_user_meta_data->>'skip_profile_bootstrap', 'false') = 'true' THEN
    RETURN new;
  END IF;

  -- Invite flows still bootstrap the profile from the application layer.
  IF (new.raw_user_meta_data->>'invited_to_tenant_id') IS NOT NULL THEN
    RETURN new;
  END IF;

  company_name := coalesce(new.raw_user_meta_data->>'company_name', 'Minha Empresa');
  tenant_slug := lower(regexp_replace(company_name, '[^a-zA-Z0-9]', '', 'g')) || '-' || floor(random() * 1000)::text;

  SELECT id
  INTO default_plan_id
  FROM public.plans_dispara_lead_saas_02
  WHERE slug = 'basic'
  LIMIT 1;

  IF default_plan_id IS NULL THEN
    SELECT id
    INTO default_plan_id
    FROM public.plans_dispara_lead_saas_02
    LIMIT 1;
  END IF;

  INSERT INTO public.tenants_dispara_lead_saas_02 (name, slug, owner_id, plan_id, status)
  VALUES (company_name, tenant_slug, new.id, default_plan_id, 'active')
  RETURNING id INTO new_tenant_id;

  INSERT INTO public.users_dispara_lead_saas_02 (
    id,
    tenant_id,
    current_tenant_id,
    role,
    email,
    full_name
  )
  VALUES (
    new.id,
    new_tenant_id,
    new_tenant_id,
    'owner',
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', company_name)
  )
  ON CONFLICT (id) DO UPDATE
  SET tenant_id = EXCLUDED.tenant_id,
      current_tenant_id = coalesce(public.users_dispara_lead_saas_02.current_tenant_id, EXCLUDED.current_tenant_id),
      role = EXCLUDED.role,
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      updated_at = now();

  INSERT INTO public.user_tenant_memberships_dispara_lead_saas_02 (
    user_id,
    tenant_id,
    role,
    status,
    created_at,
    updated_at
  )
  VALUES (
    new.id,
    new_tenant_id,
    'owner',
    'active',
    now(),
    now()
  )
  ON CONFLICT (user_id, tenant_id) DO NOTHING;

  RETURN new;
END;
$function$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_dispara_lead ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_mktopps_hub_r7 ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 7. Grants
-- -----------------------------------------------------------------------------

GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_member_of_tenant(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_member_of_tenant(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_tenant_admin(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_tenant_admin_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_user_current_tenant(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_tenant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_tenant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_memberships() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_current_tenant_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_user_current_tenant(uuid) TO authenticated;
