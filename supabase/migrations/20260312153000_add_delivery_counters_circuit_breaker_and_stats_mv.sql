ALTER TABLE public.campaigns_dispara_lead_saas_02
ADD COLUMN IF NOT EXISTS sent_count integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS failed_count integer NOT NULL DEFAULT 0;

WITH aggregated AS (
  SELECT
    campaign_id,
    COUNT(*) FILTER (WHERE status = 'sent')::int AS sent_count,
    COUNT(*) FILTER (WHERE status = 'failed')::int AS failed_count
  FROM public.message_logs_dispara_lead_saas_03
  WHERE campaign_id IS NOT NULL
  GROUP BY campaign_id
)
UPDATE public.campaigns_dispara_lead_saas_02 campaigns
SET
  sent_count = aggregated.sent_count,
  failed_count = aggregated.failed_count
FROM aggregated
WHERE campaigns.id = aggregated.campaign_id;

CREATE OR REPLACE FUNCTION public.record_campaign_message_outcome(
  p_message_id uuid,
  p_campaign_id uuid,
  p_new_status text,
  p_sent_at timestamp with time zone DEFAULT now(),
  p_provider_message_id text DEFAULT NULL,
  p_provider_response jsonb DEFAULT NULL,
  p_error_message text DEFAULT NULL,
  p_message_content text DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
AS $function$
DECLARE
  v_previous_status text;
  v_sent_delta integer := 0;
  v_failed_delta integer := 0;
BEGIN
  SELECT status
  INTO v_previous_status
  FROM public.message_logs_dispara_lead_saas_03
  WHERE id = p_message_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'message_log % not found', p_message_id;
  END IF;

  UPDATE public.message_logs_dispara_lead_saas_03
  SET
    status = p_new_status,
    sent_at = p_sent_at,
    provider_message_id = COALESCE(p_provider_message_id, provider_message_id),
    provider_response = COALESCE(p_provider_response, provider_response),
    error_message = p_error_message,
    message_content = COALESCE(p_message_content, message_content),
    metadata = COALESCE(p_metadata, metadata)
  WHERE id = p_message_id;

  IF p_campaign_id IS NOT NULL AND v_previous_status IS DISTINCT FROM p_new_status THEN
    IF p_new_status = 'sent' THEN
      v_sent_delta := 1;
      IF v_previous_status = 'failed' THEN
        v_failed_delta := -1;
      END IF;
    ELSIF p_new_status = 'failed' THEN
      v_failed_delta := 1;
      IF v_previous_status = 'sent' THEN
        v_sent_delta := -1;
      END IF;
    END IF;

    UPDATE public.campaigns_dispara_lead_saas_02
    SET
      sent_count = GREATEST(0, sent_count + v_sent_delta),
      failed_count = GREATEST(0, failed_count + v_failed_delta),
      updated_at = now()
    WHERE id = p_campaign_id;
  END IF;

  RETURN jsonb_build_object(
    'message_id', p_message_id,
    'campaign_id', p_campaign_id,
    'previous_status', v_previous_status,
    'new_status', p_new_status,
    'sent_delta', v_sent_delta,
    'failed_delta', v_failed_delta
  );
END;
$function$;

CREATE TABLE IF NOT EXISTS public.tenant_delivery_circuit_breakers (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants_dispara_lead_saas_02(id) ON DELETE CASCADE,
  consecutive_failures integer NOT NULL DEFAULT 0,
  state text NOT NULL DEFAULT 'closed',
  open_until timestamp with time zone,
  last_error text,
  last_message_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT tenant_delivery_circuit_breakers_state_check CHECK (state IN ('closed', 'open'))
);

CREATE OR REPLACE FUNCTION public.get_tenant_delivery_circuit_state(
  p_tenant_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
AS $function$
DECLARE
  v_row public.tenant_delivery_circuit_breakers%ROWTYPE;
  v_is_open boolean := false;
BEGIN
  SELECT *
  INTO v_row
  FROM public.tenant_delivery_circuit_breakers
  WHERE tenant_id = p_tenant_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'tenant_id', p_tenant_id,
      'state', 'closed',
      'consecutive_failures', 0,
      'open_until', NULL,
      'is_open', false
    );
  END IF;

  IF v_row.state = 'open' AND v_row.open_until IS NOT NULL AND v_row.open_until <= now() THEN
    UPDATE public.tenant_delivery_circuit_breakers
    SET
      state = 'closed',
      consecutive_failures = 0,
      open_until = NULL,
      updated_at = now()
    WHERE tenant_id = p_tenant_id;

    v_row.state := 'closed';
    v_row.consecutive_failures := 0;
    v_row.open_until := NULL;
  END IF;

  v_is_open := v_row.state = 'open' AND v_row.open_until IS NOT NULL AND v_row.open_until > now();

  RETURN jsonb_build_object(
    'tenant_id', p_tenant_id,
    'state', v_row.state,
    'consecutive_failures', v_row.consecutive_failures,
    'open_until', v_row.open_until,
    'is_open', v_is_open,
    'last_error', v_row.last_error,
    'last_message_id', v_row.last_message_id
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.register_tenant_delivery_failure(
  p_tenant_id uuid,
  p_message_id uuid,
  p_error text,
  p_threshold integer DEFAULT 3,
  p_open_seconds integer DEFAULT 900
)
RETURNS jsonb
LANGUAGE plpgsql
AS $function$
DECLARE
  v_consecutive_failures integer;
  v_state text;
  v_open_until timestamp with time zone;
BEGIN
  INSERT INTO public.tenant_delivery_circuit_breakers (
    tenant_id,
    consecutive_failures,
    state,
    open_until,
    last_error,
    last_message_id,
    created_at,
    updated_at
  )
  VALUES (
    p_tenant_id,
    1,
    'closed',
    NULL,
    p_error,
    p_message_id,
    now(),
    now()
  )
  ON CONFLICT (tenant_id) DO UPDATE
  SET
    consecutive_failures = public.tenant_delivery_circuit_breakers.consecutive_failures + 1,
    state = CASE
      WHEN public.tenant_delivery_circuit_breakers.consecutive_failures + 1 >= p_threshold THEN 'open'
      ELSE 'closed'
    END,
    open_until = CASE
      WHEN public.tenant_delivery_circuit_breakers.consecutive_failures + 1 >= p_threshold THEN now() + make_interval(secs => p_open_seconds)
      ELSE NULL
    END,
    last_error = p_error,
    last_message_id = p_message_id,
    updated_at = now()
  RETURNING consecutive_failures, state, open_until
  INTO v_consecutive_failures, v_state, v_open_until;

  RETURN jsonb_build_object(
    'tenant_id', p_tenant_id,
    'state', v_state,
    'consecutive_failures', v_consecutive_failures,
    'open_until', v_open_until,
    'threshold', p_threshold
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.register_tenant_delivery_success(
  p_tenant_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
AS $function$
BEGIN
  INSERT INTO public.tenant_delivery_circuit_breakers (
    tenant_id,
    consecutive_failures,
    state,
    open_until,
    created_at,
    updated_at
  )
  VALUES (
    p_tenant_id,
    0,
    'closed',
    NULL,
    now(),
    now()
  )
  ON CONFLICT (tenant_id) DO UPDATE
  SET
    consecutive_failures = 0,
    state = 'closed',
    open_until = NULL,
    updated_at = now();

  RETURN jsonb_build_object(
    'tenant_id', p_tenant_id,
    'state', 'closed',
    'consecutive_failures', 0
  );
END;
$function$;

CREATE MATERIALIZED VIEW IF NOT EXISTS public.dashboard_daily_stats_mv AS
SELECT
  tenant_id,
  DATE(created_at) AS stat_date,
  COUNT(*) FILTER (WHERE status = 'sent')::bigint AS total_sent,
  COUNT(*) FILTER (WHERE status = 'failed')::bigint AS total_failed,
  COUNT(*) FILTER (WHERE status IN ('queued', 'pending'))::bigint AS total_queued,
  COUNT(*) FILTER (WHERE responded_at IS NOT NULL)::bigint AS total_responded,
  COUNT(*) FILTER (
    WHERE COALESCE(NULLIF(metadata->>'usaria', '')::boolean, false) = true
  )::bigint AS total_ia
FROM public.message_logs_dispara_lead_saas_03
GROUP BY tenant_id, DATE(created_at);

CREATE UNIQUE INDEX IF NOT EXISTS dashboard_daily_stats_mv_tenant_date_idx
ON public.dashboard_daily_stats_mv (tenant_id, stat_date);

CREATE OR REPLACE FUNCTION public.refresh_dashboard_daily_stats_mv()
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW public.dashboard_daily_stats_mv;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_dashboard_stats(
  p_tenant_id uuid,
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_total_sent bigint := 0;
  v_total_failed bigint := 0;
  v_total_queued bigint := 0;
  v_total_responded bigint := 0;
  v_total_ia bigint := 0;
  v_scheduled_campaigns bigint := 0;
  v_scheduled_messages bigint := 0;
  v_daily_stats json;
  v_start_date date := COALESCE(p_start_date::date, DATE '1970-01-01');
  v_end_date date := COALESCE(p_end_date::date, CURRENT_DATE);
BEGIN
  SELECT
    COALESCE(SUM(total_sent), 0),
    COALESCE(SUM(total_failed), 0),
    COALESCE(SUM(total_queued), 0),
    COALESCE(SUM(total_responded), 0),
    COALESCE(SUM(total_ia), 0)
  INTO
    v_total_sent,
    v_total_failed,
    v_total_queued,
    v_total_responded,
    v_total_ia
  FROM public.dashboard_daily_stats_mv
  WHERE tenant_id = p_tenant_id
    AND stat_date >= v_start_date
    AND stat_date <= v_end_date;

  SELECT COUNT(*)
  INTO v_scheduled_campaigns
  FROM public.campaigns_dispara_lead_saas_02
  WHERE tenant_id = p_tenant_id
    AND status = 'pending'
    AND (p_start_date IS NULL OR created_at >= p_start_date)
    AND (p_end_date IS NULL OR created_at <= p_end_date);

  SELECT COALESCE(SUM(total_messages), 0)
  INTO v_scheduled_messages
  FROM public.campaigns_dispara_lead_saas_02
  WHERE tenant_id = p_tenant_id
    AND status = 'pending'
    AND (p_start_date IS NULL OR created_at >= p_start_date)
    AND (p_end_date IS NULL OR created_at <= p_end_date);

  SELECT json_agg(t ORDER BY t.date)
  INTO v_daily_stats
  FROM (
    SELECT
      stat_date AS date,
      (total_sent + total_failed + total_queued) AS count,
      total_sent AS sent,
      total_responded AS responded
    FROM public.dashboard_daily_stats_mv
    WHERE tenant_id = p_tenant_id
      AND stat_date >= v_start_date
      AND stat_date <= v_end_date
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
$function$;
