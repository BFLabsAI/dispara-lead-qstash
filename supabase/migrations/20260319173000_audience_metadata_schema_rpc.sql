-- Audience metadata schema helper for guarded file imports
-- Date: 2026-03-19

CREATE OR REPLACE FUNCTION public.get_audience_metadata_keys(
  p_audience_id uuid
)
RETURNS TABLE (
  key text
)
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $function$
  SELECT DISTINCT metadata_key AS key
  FROM public.audience_contacts_dispara_lead_saas_02 ac
  CROSS JOIN LATERAL jsonb_object_keys(coalesce(ac.metadata, '{}'::jsonb)) AS metadata_key
  WHERE ac.audience_id = p_audience_id
  ORDER BY metadata_key;
$function$;

GRANT EXECUTE ON FUNCTION public.get_audience_metadata_keys(uuid)
  TO authenticated, service_role;
