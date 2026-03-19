DROP FUNCTION IF EXISTS public.get_instance_contacts(text);
DROP FUNCTION IF EXISTS public.get_instance_contacts(text, integer, integer);

CREATE OR REPLACE FUNCTION public.get_instance_contacts(
  p_instance_name text DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  name text,
  phone text,
  profile_pic_url text,
  last_message_at timestamptz,
  last_message_content text,
  last_message_type text,
  last_media_url text,
  instance_name text,
  metadata jsonb,
  uazapi_message_id text,
  tags jsonb
)
LANGUAGE sql
AS $$
  WITH latest_messages AS (
    SELECT DISTINCT ON (c.id, i.instance_name)
      c.id,
      c.name,
      c.phone,
      NULL::text AS profile_pic_url,
      m.sent_at AS last_message_at,
      m.content AS last_message_content,
      m.message_type AS last_message_type,
      m.media_url AS last_media_url,
      i.instance_name,
      NULL::jsonb AS metadata,
      m.uazapi_message_id,
      COALESCE(c.tags, '[]'::jsonb) AS tags
    FROM public.contacts_dispara_lead_saas_02 c
    JOIN public.messages_dispara_lead_saas_02 m ON m.contact_id = c.id
    JOIN public.instances_dispara_lead_saas_02 i ON m.instance_id = i.id
    WHERE (
      p_instance_name IS NULL
      OR i.instance_name = p_instance_name
    )
    ORDER BY c.id, i.instance_name, m.sent_at DESC
  )
  SELECT
    latest_messages.id,
    latest_messages.name,
    latest_messages.phone,
    latest_messages.profile_pic_url,
    latest_messages.last_message_at,
    latest_messages.last_message_content,
    latest_messages.last_message_type,
    latest_messages.last_media_url,
    latest_messages.instance_name,
    latest_messages.metadata,
    latest_messages.uazapi_message_id,
    latest_messages.tags
  FROM latest_messages
  ORDER BY latest_messages.last_message_at DESC NULLS LAST, latest_messages.id
  LIMIT GREATEST(COALESCE(p_limit, 50), 1)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
$$;
