CREATE OR REPLACE FUNCTION public.complete_campaign_if_finished(
  p_campaign_id uuid,
  p_current_message_id uuid,
  p_completed_at timestamp with time zone DEFAULT now()
)
RETURNS boolean
LANGUAGE plpgsql
AS $function$
DECLARE
  v_pending_count integer;
  v_updated_count integer;
BEGIN
  SELECT COUNT(*)
  INTO v_pending_count
  FROM public.message_logs_dispara_lead_saas_03
  WHERE campaign_id = p_campaign_id
    AND id <> p_current_message_id
    AND status IN ('queued', 'pending');

  IF v_pending_count > 0 THEN
    RETURN false;
  END IF;

  UPDATE public.campaigns_dispara_lead_saas_02
  SET completed_at = p_completed_at,
      status = 'completed',
      updated_at = now()
  WHERE id = p_campaign_id
    AND completed_at IS NULL;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RETURN v_updated_count > 0;
END;
$function$;
