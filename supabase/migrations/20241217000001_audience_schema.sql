-- Database Schema for Audience Management System
-- Date: 2024-12-17

-- 1. Tags Table: Stores reusable tags for organizing audiences
CREATE TABLE IF NOT EXISTS tags_dispara_lead_saas_02 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#3b82f6', -- Default blue color for UI
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraint: Unique tag name per tenant
    CONSTRAINT unique_tag_name_per_tenant UNIQUE (tenant_id, name)
);

-- 2. Audiences Table: Stores metadata about contact lists
CREATE TABLE IF NOT EXISTS audiences_dispara_lead_saas_02 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    total_contacts INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Audience Tags Junction Table: Many-to-Many relationship between Audiences and Tags
CREATE TABLE IF NOT EXISTS audience_tags_dispara_lead_saas_02 (
    audience_id UUID REFERENCES audiences_dispara_lead_saas_02(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags_dispara_lead_saas_02(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (audience_id, tag_id)
);

-- 4. Audience Contacts Table: Stores the actual contacts belonging to an audience
-- Note: We store phone numbers directly. If you have a separate 'contacts' table, you could reference it,
-- but typically list uploads are raw data.
CREATE TABLE IF NOT EXISTS audience_contacts_dispara_lead_saas_02 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audience_id UUID REFERENCES audiences_dispara_lead_saas_02(id) ON DELETE CASCADE,
    phone_number TEXT NOT NULL,
    name TEXT, -- Optional contact name
    metadata JSONB DEFAULT '{}'::jsonb, -- Store extra columns from CSV
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_audiences_tenant ON audiences_dispara_lead_saas_02(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tags_tenant ON tags_dispara_lead_saas_02(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audience_contacts_audience_id ON audience_contacts_dispara_lead_saas_02(audience_id);


-- RLS Policies
-- Enable RLS on all tables
ALTER TABLE tags_dispara_lead_saas_02 ENABLE ROW LEVEL SECURITY;
ALTER TABLE audiences_dispara_lead_saas_02 ENABLE ROW LEVEL SECURITY;
ALTER TABLE audience_tags_dispara_lead_saas_02 ENABLE ROW LEVEL SECURITY;
ALTER TABLE audience_contacts_dispara_lead_saas_02 ENABLE ROW LEVEL SECURITY;


-- 1. Helper function to check tenant access (reusing existing pattern if available, or simple match)
-- Assuming standard pattern: tenant_id must match get_current_tenant_id() OR user is super admin

-- Policies for TAGS
CREATE POLICY "Tenant read access tags" ON tags_dispara_lead_saas_02
    FOR SELECT USING (tenant_id = get_current_tenant_id()::uuid OR is_user_super_admin());

CREATE POLICY "Tenant write access tags" ON tags_dispara_lead_saas_02
    FOR ALL USING (tenant_id = get_current_tenant_id()::uuid OR is_user_super_admin());

-- Policies for AUDIENCES
CREATE POLICY "Tenant read access audiences" ON audiences_dispara_lead_saas_02
    FOR SELECT USING (tenant_id = get_current_tenant_id()::uuid OR is_user_super_admin());

CREATE POLICY "Tenant write access audiences" ON audiences_dispara_lead_saas_02
    FOR ALL USING (tenant_id = get_current_tenant_id()::uuid OR is_user_super_admin());

-- Policies for AUDIENCE TAGS
-- We rely on the parent Audience's access check via join, or simply assume if you can see the audience/tag you can see the link.
-- Simplest approach: Allow if user has access to the linked Audience.
CREATE POLICY "Tenant access audience tags" ON audience_tags_dispara_lead_saas_02
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM audiences_dispara_lead_saas_02 a
            WHERE a.id = audience_tags_dispara_lead_saas_02.audience_id
            AND (a.tenant_id = get_current_tenant_id()::uuid OR is_user_super_admin())
        )
    );

-- Policies for AUDIENCE CONTACTS
CREATE POLICY "Tenant access audience contacts" ON audience_contacts_dispara_lead_saas_02
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM audiences_dispara_lead_saas_02 a
            WHERE a.id = audience_contacts_dispara_lead_saas_02.audience_id
            AND (a.tenant_id = get_current_tenant_id()::uuid OR is_user_super_admin())
        )
    );

-- Grant permissions to authenticated users
GRANT ALL ON tags_dispara_lead_saas_02 TO authenticated;
GRANT ALL ON audiences_dispara_lead_saas_02 TO authenticated;
GRANT ALL ON audience_tags_dispara_lead_saas_02 TO authenticated;
GRANT ALL ON audience_contacts_dispara_lead_saas_02 TO authenticated;
GRANT ALL ON tags_dispara_lead_saas_02 TO service_role;
GRANT ALL ON audiences_dispara_lead_saas_02 TO service_role;
GRANT ALL ON audience_tags_dispara_lead_saas_02 TO service_role;
GRANT ALL ON audience_contacts_dispara_lead_saas_02 TO service_role;
