-- Migration: Create RPC for fetching contacts by instance
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION get_instance_contacts(p_instance_name text)
RETURNS SETOF contacts_dispara_lead_saas_02
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT c.*
  FROM contacts_dispara_lead_saas_02 c
  JOIN messages_dispara_lead_saas_02 m 
    ON m.contact_id = c.id
  JOIN instances_dispara_lead_saas_02 i 
    ON m.instance_id = i.id
  WHERE i.instance_name = p_instance_name
  ORDER BY c.last_message_at DESC;
$$;
