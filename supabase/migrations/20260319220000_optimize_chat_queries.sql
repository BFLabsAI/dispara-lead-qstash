CREATE INDEX IF NOT EXISTS idx_instances_tenant_instance_name
ON public.instances_dispara_lead_saas_02 (tenant_id, instance_name);

CREATE INDEX IF NOT EXISTS idx_contacts_tenant_phone
ON public.contacts_dispara_lead_saas_02 (tenant_id, phone);

CREATE INDEX IF NOT EXISTS idx_contacts_tenant_last_message
ON public.contacts_dispara_lead_saas_02 (tenant_id, last_message_at DESC, id);

CREATE INDEX IF NOT EXISTS idx_messages_contact_sent_at_desc
ON public.messages_dispara_lead_saas_02 (contact_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_instance_contact_sent_at_desc
ON public.messages_dispara_lead_saas_02 (instance_id, contact_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_tenant_contact_sent_at_desc
ON public.messages_dispara_lead_saas_02 (tenant_id, contact_id, sent_at DESC);
