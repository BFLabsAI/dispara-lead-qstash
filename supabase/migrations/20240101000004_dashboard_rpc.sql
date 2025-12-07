-- RPC function to get dashboard stats efficiently
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
  v_total_envios bigint;
  v_total_ia bigint;
  v_total_sem_ia bigint;
  v_scheduled_campaigns bigint;
  v_scheduled_messages bigint;
  v_daily_stats json;
BEGIN
  -- 1. Count Total Envios (optionally filtered by date)
  SELECT COUNT(*)
  INTO v_total_envios
  FROM public.disparador_r7_treinamentos
  WHERE tenant_id = p_tenant_id
  AND (p_start_date IS NULL OR created_at >= p_start_date)
  AND (p_end_date IS NULL OR created_at <= p_end_date);

  -- 2. Count AI Usage
  SELECT COUNT(*)
  INTO v_total_ia
  FROM public.disparador_r7_treinamentos
  WHERE tenant_id = p_tenant_id
  AND (usaria = true)
  AND (p_start_date IS NULL OR created_at >= p_start_date)
  AND (p_end_date IS NULL OR created_at <= p_end_date);

  v_total_sem_ia := v_total_envios - v_total_ia;

  -- 3. Count Scheduled Campaigns (Pending)
  SELECT COUNT(*)
  INTO v_scheduled_campaigns
  FROM public.campaigns_dispara_lead_saas_02
  WHERE tenant_id = p_tenant_id
  AND status = 'pending'
  AND (p_start_date IS NULL OR created_at >= p_start_date)
  AND (p_end_date IS NULL OR created_at <= p_end_date);

  -- 4. Count Scheduled Messages (Pending)
  SELECT COALESCE(SUM(total_messages), 0)
  INTO v_scheduled_messages
  FROM public.campaigns_dispara_lead_saas_02
  WHERE tenant_id = p_tenant_id
  AND status = 'pending'
  AND (p_start_date IS NULL OR created_at >= p_start_date)
  AND (p_end_date IS NULL OR created_at <= p_end_date);

  -- 5. Get Daily Stats for Charts (Last 30 days if no date range)
  SELECT json_agg(t)
  INTO v_daily_stats
  FROM (
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as count
    FROM public.disparador_r7_treinamentos
    WHERE tenant_id = p_tenant_id
    AND (p_start_date IS NULL OR created_at >= p_start_date)
    AND (p_end_date IS NULL OR created_at <= p_end_date)
    GROUP BY DATE(created_at)
    ORDER BY DATE(created_at)
  ) t;

  RETURN json_build_object(
    'total_envios', v_total_envios,
    'total_ia', v_total_ia,
    'total_sem_ia', v_total_sem_ia,
    'scheduled_campaigns', v_scheduled_campaigns,
    'scheduled_messages', v_scheduled_messages,
    'daily_stats', COALESCE(v_daily_stats, '[]'::json)
  );
END;
$$;
