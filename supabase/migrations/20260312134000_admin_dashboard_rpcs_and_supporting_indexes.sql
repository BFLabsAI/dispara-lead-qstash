-- Supporting indexes for admin dashboard aggregations.
CREATE INDEX IF NOT EXISTS idx_users_super_admin
ON public.users_dispara_lead_saas_02 (is_super_admin);

CREATE INDEX IF NOT EXISTS idx_users_tenant_role
ON public.users_dispara_lead_saas_02 (tenant_id, role);

CREATE INDEX IF NOT EXISTS idx_users_null_tenant_non_super
ON public.users_dispara_lead_saas_02 (id)
WHERE tenant_id IS NULL AND coalesce(is_super_admin, false) = false;

CREATE INDEX IF NOT EXISTS idx_instances_tenant_status
ON public.instances_dispara_lead_saas_02 (tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_campaigns_tenant_status_created
ON public.campaigns_dispara_lead_saas_02 (tenant_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_campaigns_status_created
ON public.campaigns_dispara_lead_saas_02 (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tenants_status
ON public.tenants_dispara_lead_saas_02 (status);

CREATE OR REPLACE FUNCTION public.admin_dashboard_summary(window_days integer DEFAULT 30)
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

  WITH
  tenant_counts AS (
    SELECT
      count(*)::int AS total,
      count(*) FILTER (WHERE status = 'active')::int AS active,
      count(*) FILTER (WHERE status = 'inactive')::int AS inactive,
      count(*) FILTER (WHERE status = 'suspended')::int AS suspended
    FROM public.tenants_dispara_lead_saas_02
  ),
  user_counts AS (
    SELECT
      count(*)::int AS total,
      count(*) FILTER (WHERE coalesce(is_super_admin, false) = true)::int AS super_admins,
      count(*) FILTER (WHERE role = 'owner')::int AS owners,
      count(*) FILTER (WHERE role = 'admin')::int AS admins,
      count(*) FILTER (WHERE role = 'member')::int AS members,
      count(*) FILTER (WHERE tenant_id IS NULL AND coalesce(is_super_admin, false) = true)::int AS global_super_admins,
      count(*) FILTER (WHERE tenant_id IS NULL AND coalesce(is_super_admin, false) = false)::int AS invalid_profiles
    FROM public.users_dispara_lead_saas_02
  ),
  instance_counts AS (
    SELECT
      count(*)::int AS total,
      count(*) FILTER (WHERE status = 'connected')::int AS connected,
      count(*) FILTER (WHERE status = 'disconnected')::int AS disconnected
    FROM public.instances_dispara_lead_saas_02
  ),
  campaign_counts AS (
    SELECT
      count(*)::int AS total,
      count(*) FILTER (WHERE status = 'draft')::int AS draft,
      count(*) FILTER (WHERE status = 'pending')::int AS pending,
      count(*) FILTER (WHERE status = 'processing')::int AS processing,
      count(*) FILTER (WHERE status = 'completed')::int AS completed,
      count(*) FILTER (WHERE status = 'failed')::int AS failed
    FROM public.campaigns_dispara_lead_saas_02
  ),
  log_counts AS (
    SELECT
      count(*)::bigint AS total,
      count(*) FILTER (WHERE created_at >= now() - interval '7 days')::bigint AS last_7d,
      count(*) FILTER (WHERE created_at >= now() - interval '30 days')::bigint AS last_30d
    FROM public.message_logs_dispara_lead_saas_03
  ),
  active_tenants AS (
    SELECT count(DISTINCT tenant_id)::int AS active_last_window
    FROM public.message_logs_dispara_lead_saas_03
    WHERE created_at >= window_start
      AND tenant_id IS NOT NULL
  )
  SELECT jsonb_build_object(
    'generated_at', now(),
    'window_days', greatest(window_days, 1),
    'totals', jsonb_build_object(
      'tenants', tenant_counts.total,
      'users', user_counts.total,
      'super_admins', user_counts.super_admins,
      'instances', instance_counts.total,
      'campaigns', campaign_counts.total,
      'logs', log_counts.total
    ),
    'tenants', jsonb_build_object(
      'total', tenant_counts.total,
      'active', tenant_counts.active,
      'inactive', tenant_counts.inactive,
      'suspended', tenant_counts.suspended,
      'active_last_window', coalesce(active_tenants.active_last_window, 0)
    ),
    'users', jsonb_build_object(
      'total', user_counts.total,
      'super_admins', user_counts.super_admins,
      'owners', user_counts.owners,
      'admins', user_counts.admins,
      'members', user_counts.members,
      'global_super_admins', user_counts.global_super_admins,
      'invalid_profiles', user_counts.invalid_profiles
    ),
    'instances', jsonb_build_object(
      'total', instance_counts.total,
      'connected', instance_counts.connected,
      'disconnected', instance_counts.disconnected
    ),
    'campaigns', jsonb_build_object(
      'total', campaign_counts.total,
      'draft', campaign_counts.draft,
      'pending', campaign_counts.pending,
      'processing', campaign_counts.processing,
      'completed', campaign_counts.completed,
      'failed', campaign_counts.failed
    ),
    'logs', jsonb_build_object(
      'total', log_counts.total,
      'last_7d', log_counts.last_7d,
      'last_30d', log_counts.last_30d
    )
  )
  INTO result
  FROM tenant_counts, user_counts, instance_counts, campaign_counts, log_counts, active_tenants;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_dashboard_top_tenants(window_days integer DEFAULT 30, result_limit integer DEFAULT 5)
RETURNS TABLE (
  tenant_id uuid,
  tenant_name text,
  users_count bigint,
  instances_count bigint,
  campaigns_count bigint,
  logs_in_window bigint,
  last_log_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  window_start timestamptz;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  window_start := now() - make_interval(days => greatest(window_days, 1));

  RETURN QUERY
  WITH user_counts AS (
    SELECT tenant_id, count(*)::bigint AS users_count
    FROM public.users_dispara_lead_saas_02
    WHERE tenant_id IS NOT NULL
    GROUP BY tenant_id
  ),
  instance_counts AS (
    SELECT tenant_id, count(*)::bigint AS instances_count
    FROM public.instances_dispara_lead_saas_02
    WHERE tenant_id IS NOT NULL
    GROUP BY tenant_id
  ),
  campaign_counts AS (
    SELECT tenant_id, count(*)::bigint AS campaigns_count
    FROM public.campaigns_dispara_lead_saas_02
    WHERE tenant_id IS NOT NULL
    GROUP BY tenant_id
  ),
  log_counts AS (
    SELECT
      tenant_id,
      count(*)::bigint AS logs_in_window,
      max(created_at) AS last_log_at
    FROM public.message_logs_dispara_lead_saas_03
    WHERE tenant_id IS NOT NULL
      AND created_at >= window_start
    GROUP BY tenant_id
  )
  SELECT
    t.id,
    t.name,
    coalesce(u.users_count, 0),
    coalesce(i.instances_count, 0),
    coalesce(c.campaigns_count, 0),
    coalesce(l.logs_in_window, 0),
    l.last_log_at
  FROM public.tenants_dispara_lead_saas_02 t
  LEFT JOIN user_counts u ON u.tenant_id = t.id
  LEFT JOIN instance_counts i ON i.tenant_id = t.id
  LEFT JOIN campaign_counts c ON c.tenant_id = t.id
  LEFT JOIN log_counts l ON l.tenant_id = t.id
  ORDER BY coalesce(l.logs_in_window, 0) DESC, t.created_at DESC
  LIMIT greatest(result_limit, 1);
END;
$$;

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
      LEFT JOIN (
        SELECT tenant_id, max(created_at) AS last_log_at
        FROM public.message_logs_dispara_lead_saas_03
        WHERE tenant_id IS NOT NULL
        GROUP BY tenant_id
      ) l ON l.tenant_id = t.id
      WHERE l.last_log_at IS NULL OR l.last_log_at < window_start
      ORDER BY l.last_log_at NULLS FIRST, t.created_at DESC
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

GRANT EXECUTE ON FUNCTION public.admin_dashboard_summary(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_top_tenants(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_alerts(integer, integer) TO authenticated;
