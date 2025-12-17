-- 1. Reset Instances (Clean Start)
TRUNCATE TABLE instances_dispara_lead_saas_02 CASCADE;

-- 2. Alter Instances Table to support UazAPI
ALTER TABLE instances_dispara_lead_saas_02
ADD COLUMN IF NOT EXISTS qrcode text,
ADD COLUMN IF NOT EXISTS qrcode_generated_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS metadata jsonb,
ADD COLUMN IF NOT EXISTS uazapi_instance_id text,
ADD COLUMN IF NOT EXISTS last_connected_at timestamp with time zone;

-- 3. Create Contacts Table
CREATE TABLE IF NOT EXISTS contacts_dispara_lead_saas_02 (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    tenant_id uuid NOT NULL,
    phone text NOT NULL,
    name text,
    first_message_at timestamp with time zone,
    last_message_at timestamp with time zone,
    UNIQUE(tenant_id, phone)
);

-- 4. Create Chat History Table (Webhooks)
CREATE TABLE IF NOT EXISTS messages_dispara_lead_saas_02 (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    tenant_id uuid NOT NULL,
    instance_id uuid REFERENCES instances_dispara_lead_saas_02(id),
    contact_id uuid REFERENCES contacts_dispara_lead_saas_02(id),
    uazapi_message_id text UNIQUE,
    direction text CHECK (direction IN ('inbound', 'outbound')),
    message_type text,
    content text,
    media_url text,
    sent_at timestamp with time zone,
    is_read boolean DEFAULT false,
    sender_name text,
    user_id uuid
);

-- 5. Create Proxy Logs Table
CREATE TABLE IF NOT EXISTS uazapi_logs_dispara_lead_saas_02 (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    tenant_id uuid,
    instance_id uuid,
    action text,
    request_payload jsonb,
    response_payload jsonb,
    status_code integer
);

-- 6. Create NEW Campaign Logs Table (_03) for Clean Start
-- Copying structure from message_logs_dispara_lead_saas_02
CREATE TABLE IF NOT EXISTS message_logs_dispara_lead_saas_03 (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    tenant_id uuid,
    campaign_id uuid,
    campaign_name text,
    campaign_type text,
    phone_number text,
    message_content text,
    status text,
    instance_name text,
    error_message text,
    metadata jsonb,
    evolution_key text,
    evolution_response jsonb,
    queued_at timestamp with time zone,
    sent_at timestamp with time zone,
    retry_count integer DEFAULT 0
);

-- 7. RLS Policies for new tables (Basic)
ALTER TABLE contacts_dispara_lead_saas_02 ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages_dispara_lead_saas_02 ENABLE ROW LEVEL SECURITY;
ALTER TABLE uazapi_logs_dispara_lead_saas_02 ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_logs_dispara_lead_saas_03 ENABLE ROW LEVEL SECURITY;

-- Allow service_role full access (for Edge Functions)
CREATE POLICY "Service role full access contacts" ON contacts_dispara_lead_saas_02 FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Service role full access messages" ON messages_dispara_lead_saas_02 FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Service role full access logs" ON uazapi_logs_dispara_lead_saas_02 FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Service role full access campaign logs" ON message_logs_dispara_lead_saas_03 FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Allow authenticated users to view data for their tenant
-- Assuming 'users_dispara_lead_saas_02' links auth.uid() to tenant_id
-- For brevity, implementing a generic "Users can view own tenant data" policy
-- NOTE: Correct implementation requires joining with users table, but dynamic policies are safer.
-- Here we use a USING clause that checks against the user's metadata or a lookup.
-- For now, letting Super Admin access everything and Tenant members access their tenant_id.

CREATE POLICY "Users view own tenant contacts" ON contacts_dispara_lead_saas_02 FOR SELECT USING (
    tenant_id IN (
        SELECT tenant_id FROM users_dispara_lead_saas_02 WHERE id = auth.uid()
    )
);

CREATE POLICY "Users view own tenant messages" ON messages_dispara_lead_saas_02 FOR SELECT USING (
    tenant_id IN (
        SELECT tenant_id FROM users_dispara_lead_saas_02 WHERE id = auth.uid()
    )
);

CREATE POLICY "Users view own tenant campaign logs" ON message_logs_dispara_lead_saas_03 FOR SELECT USING (
    tenant_id IN (
        SELECT tenant_id FROM users_dispara_lead_saas_02 WHERE id = auth.uid()
    )
);
