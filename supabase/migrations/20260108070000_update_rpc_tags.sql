
DROP FUNCTION IF EXISTS get_instance_contacts(text);

CREATE OR REPLACE FUNCTION get_instance_contacts(p_instance_name text DEFAULT NULL)
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
) AS $$
  SELECT * FROM (
    SELECT DISTINCT ON (c.id)
      c.id,
      c.name,
      c.phone,
      NULL::text as profile_pic_url,
      m.sent_at as last_message_at,
      m.content as last_message_content,
      m.message_type as last_message_type,
      m.media_url as last_media_url,
      i.instance_name,
      NULL::jsonb as metadata,
      m.uazapi_message_id,
      c.tags
    FROM contacts_dispara_lead_saas_02 c
    JOIN messages_dispara_lead_saas_02 m ON m.contact_id = c.id
    JOIN instances_dispara_lead_saas_02 i ON m.instance_id = i.id
    WHERE
      (p_instance_name IS NULL OR i.instance_name = p_instance_name)
    ORDER BY c.id, m.sent_at DESC
  ) t
  ORDER BY last_message_at DESC;
$$ LANGUAGE sql;
