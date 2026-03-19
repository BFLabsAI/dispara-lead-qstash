ALTER TABLE public.message_logs_dispara_lead_saas_03
ADD COLUMN IF NOT EXISTS provider_message_id text,
ADD COLUMN IF NOT EXISTS provider_response jsonb,
ADD COLUMN IF NOT EXISTS message_type text,
ADD COLUMN IF NOT EXISTS media_url text;

ALTER TABLE public.contacts_dispara_lead_saas_02
ADD COLUMN IF NOT EXISTS first_message_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS last_message_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_message_logs_chat_projection
ON public.message_logs_dispara_lead_saas_03 (tenant_id, status, instance_name, sent_at DESC, created_at DESC);

DROP POLICY IF EXISTS "Tenant isolation for instances" ON public.instances_dispara_lead_saas_02;
CREATE POLICY "Tenant isolation for instances" ON public.instances_dispara_lead_saas_02
FOR ALL
USING (tenant_id = public.get_current_tenant_id() OR public.is_user_super_admin())
WITH CHECK (tenant_id = public.get_current_tenant_id() OR public.is_user_super_admin());

DROP POLICY IF EXISTS "Users view own tenant contacts" ON public.contacts_dispara_lead_saas_02;
DROP POLICY IF EXISTS "Tenant access contacts" ON public.contacts_dispara_lead_saas_02;
CREATE POLICY "Tenant access contacts" ON public.contacts_dispara_lead_saas_02
FOR ALL
USING (tenant_id = public.get_current_tenant_id() OR public.is_user_super_admin())
WITH CHECK (tenant_id = public.get_current_tenant_id() OR public.is_user_super_admin());

DROP POLICY IF EXISTS "Users view own tenant messages" ON public.messages_dispara_lead_saas_02;
DROP POLICY IF EXISTS "Tenant access messages" ON public.messages_dispara_lead_saas_02;
CREATE POLICY "Tenant access messages" ON public.messages_dispara_lead_saas_02
FOR ALL
USING (tenant_id = public.get_current_tenant_id() OR public.is_user_super_admin())
WITH CHECK (tenant_id = public.get_current_tenant_id() OR public.is_user_super_admin());

DROP POLICY IF EXISTS "Tenant isolation for message_logs" ON public.message_logs_dispara_lead_saas_03;
DROP POLICY IF EXISTS "Users view own tenant campaign logs" ON public.message_logs_dispara_lead_saas_03;
CREATE POLICY "Tenant isolation for message_logs" ON public.message_logs_dispara_lead_saas_03
FOR ALL
USING (tenant_id = public.get_current_tenant_id() OR public.is_user_super_admin())
WITH CHECK (tenant_id = public.get_current_tenant_id() OR public.is_user_super_admin());

CREATE OR REPLACE FUNCTION public.sync_campaign_log_to_chat_projection()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_phone text;
  v_contact_id uuid;
  v_instance_id uuid;
  v_message_id text;
  v_sent_at timestamptz;
BEGIN
  IF NEW.status IS DISTINCT FROM 'sent' THEN
    RETURN NEW;
  END IF;

  IF NEW.tenant_id IS NULL OR COALESCE(trim(NEW.phone_number), '') = '' OR COALESCE(trim(NEW.instance_name), '') = '' THEN
    RETURN NEW;
  END IF;

  v_phone := regexp_replace(COALESCE(NEW.phone_number, ''), '\D', '', 'g');
  IF v_phone = '' THEN
    RETURN NEW;
  END IF;

  SELECT i.id
    INTO v_instance_id
  FROM public.instances_dispara_lead_saas_02 i
  WHERE i.tenant_id = NEW.tenant_id
    AND i.instance_name = NEW.instance_name
  ORDER BY i.updated_at DESC NULLS LAST, i.created_at DESC NULLS LAST, i.id DESC
  LIMIT 1;

  IF v_instance_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_sent_at := COALESCE(NEW.sent_at, NEW.created_at, now());

  INSERT INTO public.contacts_dispara_lead_saas_02 (
    tenant_id,
    phone,
    name,
    first_message_at,
    last_message_at
  )
  VALUES (
    NEW.tenant_id,
    v_phone,
    NULL,
    v_sent_at,
    v_sent_at
  )
  ON CONFLICT (tenant_id, phone) DO UPDATE
  SET
    first_message_at = COALESCE(public.contacts_dispara_lead_saas_02.first_message_at, EXCLUDED.first_message_at),
    last_message_at = GREATEST(COALESCE(public.contacts_dispara_lead_saas_02.last_message_at, EXCLUDED.last_message_at), EXCLUDED.last_message_at)
  RETURNING id INTO v_contact_id;

  v_message_id := COALESCE(NULLIF(trim(NEW.provider_message_id), ''), 'campaign-log:' || NEW.id::text);

  INSERT INTO public.messages_dispara_lead_saas_02 (
    tenant_id,
    instance_id,
    contact_id,
    uazapi_message_id,
    direction,
    message_type,
    content,
    media_url,
    sent_at,
    sender_name
  )
  VALUES (
    NEW.tenant_id,
    v_instance_id,
    v_contact_id,
    v_message_id,
    'outbound',
    COALESCE(NULLIF(trim(NEW.message_type), ''), 'text'),
    NEW.message_content,
    NEW.media_url,
    v_sent_at,
    NULL
  )
  ON CONFLICT (uazapi_message_id) DO UPDATE
  SET
    tenant_id = EXCLUDED.tenant_id,
    instance_id = EXCLUDED.instance_id,
    contact_id = EXCLUDED.contact_id,
    direction = EXCLUDED.direction,
    message_type = EXCLUDED.message_type,
    content = EXCLUDED.content,
    media_url = EXCLUDED.media_url,
    sent_at = EXCLUDED.sent_at;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_sync_campaign_log_to_chat_projection
ON public.message_logs_dispara_lead_saas_03;

CREATE TRIGGER trg_sync_campaign_log_to_chat_projection
AFTER INSERT OR UPDATE OF status, sent_at, provider_message_id, message_content, message_type, media_url
ON public.message_logs_dispara_lead_saas_03
FOR EACH ROW
WHEN (NEW.status = 'sent')
EXECUTE FUNCTION public.sync_campaign_log_to_chat_projection();

WITH normalized_logs AS (
  SELECT
    l.id,
    l.tenant_id,
    regexp_replace(COALESCE(l.phone_number, ''), '\D', '', 'g') AS phone,
    COALESCE(l.sent_at, l.created_at, now()) AS effective_sent_at
  FROM public.message_logs_dispara_lead_saas_03 l
  WHERE l.status = 'sent'
    AND l.tenant_id IS NOT NULL
    AND COALESCE(trim(l.instance_name), '') <> ''
    AND COALESCE(trim(l.phone_number), '') <> ''
),
aggregated_contacts AS (
  SELECT
    tenant_id,
    phone,
    MIN(effective_sent_at) AS first_message_at,
    MAX(effective_sent_at) AS last_message_at
  FROM normalized_logs
  WHERE phone <> ''
  GROUP BY tenant_id, phone
)
INSERT INTO public.contacts_dispara_lead_saas_02 (
  tenant_id,
  phone,
  name,
  first_message_at,
  last_message_at
)
SELECT
  aggregated_contacts.tenant_id,
  aggregated_contacts.phone,
  NULL,
  aggregated_contacts.first_message_at,
  aggregated_contacts.last_message_at
FROM aggregated_contacts
ON CONFLICT (tenant_id, phone) DO UPDATE
SET
  first_message_at = LEAST(
    COALESCE(public.contacts_dispara_lead_saas_02.first_message_at, EXCLUDED.first_message_at),
    EXCLUDED.first_message_at
  ),
  last_message_at = GREATEST(
    COALESCE(public.contacts_dispara_lead_saas_02.last_message_at, EXCLUDED.last_message_at),
    EXCLUDED.last_message_at
  );

INSERT INTO public.messages_dispara_lead_saas_02 (
  tenant_id,
  instance_id,
  contact_id,
  uazapi_message_id,
  direction,
  message_type,
  content,
  media_url,
  sent_at,
  sender_name
)
SELECT
  logs.tenant_id,
  instance_match.id AS instance_id,
  contacts.id AS contact_id,
  COALESCE(NULLIF(trim(logs.provider_message_id), ''), 'campaign-log:' || logs.id::text) AS uazapi_message_id,
  'outbound' AS direction,
  COALESCE(NULLIF(trim(logs.message_type), ''), 'text') AS message_type,
  logs.message_content AS content,
  logs.media_url,
  COALESCE(logs.sent_at, logs.created_at, now()) AS sent_at,
  NULL AS sender_name
FROM public.message_logs_dispara_lead_saas_03 logs
JOIN LATERAL (
  SELECT i.id
  FROM public.instances_dispara_lead_saas_02 i
  WHERE i.tenant_id = logs.tenant_id
    AND i.instance_name = logs.instance_name
  ORDER BY i.updated_at DESC NULLS LAST, i.created_at DESC NULLS LAST, i.id DESC
  LIMIT 1
) instance_match ON TRUE
JOIN public.contacts_dispara_lead_saas_02 contacts
  ON contacts.tenant_id = logs.tenant_id
 AND contacts.phone = regexp_replace(COALESCE(logs.phone_number, ''), '\D', '', 'g')
WHERE logs.status = 'sent'
  AND logs.tenant_id IS NOT NULL
  AND COALESCE(trim(logs.instance_name), '') <> ''
  AND COALESCE(trim(logs.phone_number), '') <> ''
ON CONFLICT (uazapi_message_id) DO UPDATE
SET
  tenant_id = EXCLUDED.tenant_id,
  instance_id = EXCLUDED.instance_id,
  contact_id = EXCLUDED.contact_id,
  direction = EXCLUDED.direction,
  message_type = EXCLUDED.message_type,
  content = EXCLUDED.content,
  media_url = EXCLUDED.media_url,
  sent_at = EXCLUDED.sent_at;
