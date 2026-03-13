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
    SELECT
      u.tenant_id,
      count(*)::bigint AS users_count
    FROM public.users_dispara_lead_saas_02 u
    WHERE u.tenant_id IS NOT NULL
    GROUP BY u.tenant_id
  ),
  instance_counts AS (
    SELECT
      i.tenant_id,
      count(*)::bigint AS instances_count
    FROM public.instances_dispara_lead_saas_02 i
    WHERE i.tenant_id IS NOT NULL
    GROUP BY i.tenant_id
  ),
  campaign_counts AS (
    SELECT
      c.tenant_id,
      count(*)::bigint AS campaigns_count
    FROM public.campaigns_dispara_lead_saas_02 c
    WHERE c.tenant_id IS NOT NULL
    GROUP BY c.tenant_id
  ),
  log_counts AS (
    SELECT
      l.tenant_id,
      count(*)::bigint AS logs_in_window,
      max(l.created_at) AS last_log_at
    FROM public.message_logs_dispara_lead_saas_03 l
    WHERE l.tenant_id IS NOT NULL
      AND l.created_at >= window_start
    GROUP BY l.tenant_id
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
