CREATE OR REPLACE FUNCTION public.get_dashboard_stats(
  p_tenant_id uuid,
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_sent bigint;
  v_total_failed bigint;
  v_total_queued bigint;
  v_total_responded bigint;
  v_total_ia bigint;
  v_scheduled_campaigns bigint;
  v_scheduled_messages bigint;
  v_daily_stats json;
BEGIN
  -- Aggregate counts from message_logs_dispara_lead_saas_03
  SELECT
    COUNT(*) FILTER (WHERE status = 'sent'),
    COUNT(*) FILTER (WHERE status = 'failed'),
    COUNT(*) FILTER (WHERE status IN ('queued', 'pending')),
    COUNT(*) FILTER (WHERE responded_at IS NOT NULL),
    COUNT(*) FILTER (WHERE (metadata->>'usaria')::boolean = true)
  INTO
    v_total_sent,
    v_total_failed,
    v_total_queued,
    v_total_responded,
    v_total_ia
  FROM public.message_logs_dispara_lead_saas_03
  WHERE tenant_id = p_tenant_id
  AND (p_start_date IS NULL OR created_at >= p_start_date)
  AND (p_end_date IS NULL OR created_at <= p_end_date);

  -- Scheduled Campaigns (from campaigns table)
  SELECT COUNT(*)
  INTO v_scheduled_campaigns
  FROM public.campaigns_dispara_lead_saas_02
  WHERE tenant_id = p_tenant_id
  AND status = 'pending'
  AND (p_start_date IS NULL OR created_at >= p_start_date)
  AND (p_end_date IS NULL OR created_at <= p_end_date);

  -- Scheduled Messages
  SELECT COALESCE(SUM(total_messages), 0)
  INTO v_scheduled_messages
  FROM public.campaigns_dispara_lead_saas_02
  WHERE tenant_id = p_tenant_id
  AND status = 'pending'
  AND (p_start_date IS NULL OR created_at >= p_start_date)
  AND (p_end_date IS NULL OR created_at <= p_end_date);

  -- Daily Stats (Sent vs Responded)
  SELECT json_agg(t)
  INTO v_daily_stats
  FROM (
    SELECT
      DATE(created_at) as date,
      COUNT(*) as count,
      COUNT(*) FILTER (WHERE status = 'sent') as sent,
      COUNT(*) FILTER (WHERE responded_at IS NOT NULL) as responded
    FROM public.message_logs_dispara_lead_saas_03
    WHERE tenant_id = p_tenant_id
    AND (p_start_date IS NULL OR created_at >= p_start_date)
    AND (p_end_date IS NULL OR created_at <= p_end_date)
    GROUP BY DATE(created_at)
    ORDER BY DATE(created_at)
  ) t;

  RETURN json_build_object(
    'total_envios', COALESCE(v_total_sent, 0),
    'total_failed', COALESCE(v_total_failed, 0),
    'total_queued', COALESCE(v_total_queued, 0),
    'total_responded', COALESCE(v_total_responded, 0),
    'total_ia', COALESCE(v_total_ia, 0),
    'scheduled_campaigns', COALESCE(v_scheduled_campaigns, 0),
    'scheduled_messages', COALESCE(v_scheduled_messages, 0),
    'daily_stats', COALESCE(v_daily_stats, '[]'::json)
  );
END;
$$;
