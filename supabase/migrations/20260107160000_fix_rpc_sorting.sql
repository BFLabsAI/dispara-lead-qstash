-- Migration: Fix sorting in get_instance_contacts RPC
-- The previous version ordered by ID first due to DISTINCT ON requirements.
-- This version wraps the DISTINCT logic in a subquery to allow sorting the final result by time.

DROP FUNCTION IF EXISTS get_instance_contacts(text);

CREATE OR REPLACE FUNCTION get_instance_contacts(p_instance_name text DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  name text,
  phone text,
  profile_pic_url text,
  last_message_at timestamptz,
  instance_name text,
  sender_name text,
  metadata jsonb
)
LANGUAGE sql
AS $$
  SELECT * FROM (
    SELECT DISTINCT ON (c.id, i.instance_name)
      c.id,
      c.name,
      c.phone,
      NULL::text as profile_pic_url,
      m.sent_at as last_message_at,
      i.instance_name,
      m.sender_name,
      NULL::jsonb as metadata
    FROM contacts_dispara_lead_saas_02 c
    JOIN messages_dispara_lead_saas_02 m ON m.contact_id = c.id
    JOIN instances_dispara_lead_saas_02 i ON m.instance_id = i.id
    WHERE
      (p_instance_name IS NULL OR i.instance_name = p_instance_name)
    ORDER BY c.id, i.instance_name, m.sent_at DESC
  ) sub
  ORDER BY last_message_at DESC;
$$;
