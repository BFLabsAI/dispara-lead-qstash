-- Admin dashboard performance tuning:
-- 1. speed up disconnected instance alerts
-- 2. speed up stuck campaign alerts
-- 3. avoid full log aggregation for inactive tenants

CREATE INDEX IF NOT EXISTS idx_instances_disconnected_updated_at_desc
ON public.instances_dispara_lead_saas_02 (updated_at DESC, created_at DESC)
WHERE coalesce(status, 'disconnected') <> 'connected';

CREATE INDEX IF NOT EXISTS idx_campaigns_pending_processing_created_at
ON public.campaigns_dispara_lead_saas_02 (created_at ASC)
WHERE status IN ('pending', 'processing');

CREATE OR REPLACE FUNCTION public.admin_dashboard_alerts(window_days integer DEFAULT 30, result_limit integer DEFAULT 10)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  window_start timestamptz;
  result jsonb;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  window_start := now() - make_interval(days => greatest(window_days, 1));

  WITH tenants_without_owner AS (
    SELECT coalesce(jsonb_agg(row_to_json(x)), '[]'::jsonb) AS data
    FROM (
      SELECT t.id, t.name, t.status
      FROM public.tenants_dispara_lead_saas_02 t
      LEFT JOIN public.users_dispara_lead_saas_02 u
        ON u.tenant_id = t.id AND u.role = 'owner'
      GROUP BY t.id, t.name, t.status
      HAVING count(u.id) = 0
      ORDER BY t.created_at DESC
      LIMIT greatest(result_limit, 1)
    ) x
  ),
  tenants_without_users AS (
    SELECT coalesce(jsonb_agg(row_to_json(x)), '[]'::jsonb) AS data
    FROM (
      SELECT t.id, t.name, t.status
      FROM public.tenants_dispara_lead_saas_02 t
      LEFT JOIN public.users_dispara_lead_saas_02 u
        ON u.tenant_id = t.id
      GROUP BY t.id, t.name, t.status
      HAVING count(u.id) = 0
      ORDER BY t.created_at DESC
      LIMIT greatest(result_limit, 1)
    ) x
  ),
  inactive_tenants AS (
    SELECT coalesce(jsonb_agg(row_to_json(x)), '[]'::jsonb) AS data
    FROM (
      SELECT t.id, t.name, t.status
      FROM public.tenants_dispara_lead_saas_02 t
      WHERE NOT EXISTS (
        SELECT 1
        FROM public.message_logs_dispara_lead_saas_03 l
        WHERE l.tenant_id = t.id
          AND l.created_at >= window_start
      )
      ORDER BY t.created_at DESC
      LIMIT greatest(result_limit, 1)
    ) x
  ),
  disconnected_instances AS (
    SELECT coalesce(jsonb_agg(row_to_json(x)), '[]'::jsonb) AS data
    FROM (
      SELECT i.id, i.tenant_id, t.name AS tenant_name, i.instance_name, i.status, i.last_connected_at
      FROM public.instances_dispara_lead_saas_02 i
      LEFT JOIN public.tenants_dispara_lead_saas_02 t ON t.id = i.tenant_id
      WHERE coalesce(i.status, 'disconnected') <> 'connected'
      ORDER BY i.updated_at DESC NULLS LAST, i.created_at DESC
      LIMIT greatest(result_limit, 1)
    ) x
  ),
  stuck_campaigns AS (
    SELECT coalesce(jsonb_agg(row_to_json(x)), '[]'::jsonb) AS data
    FROM (
      SELECT c.id, c.tenant_id, t.name AS tenant_name, c.name, c.status, c.created_at, c.scheduled_for
      FROM public.campaigns_dispara_lead_saas_02 c
      LEFT JOIN public.tenants_dispara_lead_saas_02 t ON t.id = c.tenant_id
      WHERE c.status IN ('pending', 'processing')
      ORDER BY c.created_at ASC
      LIMIT greatest(result_limit, 1)
    ) x
  ),
  invalid_profiles AS (
    SELECT coalesce(jsonb_agg(row_to_json(x)), '[]'::jsonb) AS data
    FROM (
      SELECT u.id, u.email, u.role, u.is_super_admin, u.created_at
      FROM public.users_dispara_lead_saas_02 u
      WHERE u.tenant_id IS NULL
        AND coalesce(u.is_super_admin, false) = false
      ORDER BY u.created_at DESC
      LIMIT greatest(result_limit, 1)
    ) x
  )
  SELECT jsonb_build_object(
    'generated_at', now(),
    'window_days', greatest(window_days, 1),
    'tenants_without_owner', tenants_without_owner.data,
    'tenants_without_users', tenants_without_users.data,
    'inactive_tenants', inactive_tenants.data,
    'disconnected_instances', disconnected_instances.data,
    'stuck_campaigns', stuck_campaigns.data,
    'invalid_profiles', invalid_profiles.data
  )
  INTO result
  FROM tenants_without_owner, tenants_without_users, inactive_tenants, disconnected_instances, stuck_campaigns, invalid_profiles;

  RETURN result;
END;
$$;
