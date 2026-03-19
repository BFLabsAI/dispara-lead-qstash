-- Enforce a single active owner per tenant while allowing the same user
-- to be owner of multiple tenants.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tenants_dispara_lead_saas_02'
      AND column_name = 'owner_id'
  ) THEN
    ALTER TABLE public.tenants_dispara_lead_saas_02
      ADD COLUMN owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END
$$;

WITH ranked_owners AS (
  SELECT
    m.id,
    m.tenant_id,
    m.user_id,
    row_number() OVER (
      PARTITION BY m.tenant_id
      ORDER BY
        CASE WHEN t.owner_id = m.user_id THEN 0 ELSE 1 END,
        m.updated_at DESC,
        m.created_at DESC,
        m.id
    ) AS owner_rank
  FROM public.user_tenant_memberships_dispara_lead_saas_02 m
  JOIN public.tenants_dispara_lead_saas_02 t
    ON t.id = m.tenant_id
  WHERE m.role = 'owner'
    AND m.status = 'active'
)
UPDATE public.user_tenant_memberships_dispara_lead_saas_02 m
   SET role = 'admin',
       updated_at = now()
  FROM ranked_owners ro
 WHERE m.id = ro.id
   AND ro.owner_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS user_tenant_memberships_one_active_owner_per_tenant_idx
  ON public.user_tenant_memberships_dispara_lead_saas_02 (tenant_id)
  WHERE role = 'owner' AND status = 'active';

CREATE OR REPLACE FUNCTION public.sync_tenant_owner_from_memberships()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  affected_tenant_id uuid;
  active_owner_user_id uuid;
BEGIN
  affected_tenant_id := coalesce(NEW.tenant_id, OLD.tenant_id);

  IF affected_tenant_id IS NULL THEN
    RETURN coalesce(NEW, OLD);
  END IF;

  SELECT m.user_id
    INTO active_owner_user_id
  FROM public.user_tenant_memberships_dispara_lead_saas_02 m
  WHERE m.tenant_id = affected_tenant_id
    AND m.role = 'owner'
    AND m.status = 'active'
  ORDER BY m.updated_at DESC, m.created_at DESC
  LIMIT 1;

  UPDATE public.tenants_dispara_lead_saas_02
     SET owner_id = active_owner_user_id,
         updated_at = now()
   WHERE id = affected_tenant_id
     AND owner_id IS DISTINCT FROM active_owner_user_id;

  RETURN coalesce(NEW, OLD);
END;
$function$;

DROP TRIGGER IF EXISTS trg_sync_tenant_owner_from_memberships
ON public.user_tenant_memberships_dispara_lead_saas_02;

CREATE TRIGGER trg_sync_tenant_owner_from_memberships
AFTER INSERT OR UPDATE OR DELETE ON public.user_tenant_memberships_dispara_lead_saas_02
FOR EACH ROW
EXECUTE FUNCTION public.sync_tenant_owner_from_memberships();

UPDATE public.tenants_dispara_lead_saas_02 t
   SET owner_id = owner_membership.user_id,
       updated_at = now()
  FROM (
    SELECT DISTINCT ON (m.tenant_id)
      m.tenant_id,
      m.user_id
    FROM public.user_tenant_memberships_dispara_lead_saas_02 m
    WHERE m.role = 'owner'
      AND m.status = 'active'
    ORDER BY m.tenant_id, m.updated_at DESC, m.created_at DESC
  ) AS owner_membership
 WHERE t.id = owner_membership.tenant_id
   AND t.owner_id IS DISTINCT FROM owner_membership.user_id;
