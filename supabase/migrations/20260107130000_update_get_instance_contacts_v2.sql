-- Migration: Update get_instance_contacts to support ALL instances and correct grouping
-- Drops the old function signature first to avoid ambiguity if types change

DROP FUNCTION IF EXISTS get_instance_contacts(text);

CREATE OR REPLACE FUNCTION get_instance_contacts(p_instance_name text DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  name text,
  phone text,
  profile_pic_url text,
  last_message_at timestamptz,
  instance_name text,
  metadata jsonb
)
LANGUAGE sql
AS $$
  SELECT
    c.id,
    c.name,
    c.phone,
    c.profile_pic_url,
    MAX(m.sent_at) as last_message_at,
    i.instance_name,
    c.metadata
  FROM contacts_dispara_lead_saas_02 c
  JOIN messages_dispara_lead_saas_02 m ON m.contact_id = c.id
  JOIN instances_dispara_lead_saas_02 i ON m.instance_id = i.id
  WHERE
    (p_instance_name IS NULL OR i.instance_name = p_instance_name)
  GROUP BY c.id, c.name, c.phone, c.profile_pic_url, c.metadata, i.instance_name
  ORDER BY last_message_at DESC;
$$;
