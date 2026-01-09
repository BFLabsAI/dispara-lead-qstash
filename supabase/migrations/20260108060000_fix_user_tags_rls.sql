
-- Drop existing policies that rely on JWT tenant_id
DROP POLICY IF EXISTS "Users can view tags for their tenant" ON user_tags_dispara_lead_saas_02;
DROP POLICY IF EXISTS "Users can insert tags for their tenant" ON user_tags_dispara_lead_saas_02;
DROP POLICY IF EXISTS "Users can update tags for their tenant" ON user_tags_dispara_lead_saas_02;
DROP POLICY IF EXISTS "Users can delete tags for their tenant" ON user_tags_dispara_lead_saas_02;

-- Create new policies using users table lookup for robustness

-- SELECT: View tags where tenant_id matches user's tenant_id
CREATE POLICY "Users can view tags for their tenant"
ON user_tags_dispara_lead_saas_02
FOR SELECT
USING (
    tenant_id IN (
        SELECT tenant_id 
        FROM users_dispara_lead_saas_02 
        WHERE id = auth.uid()
    )
);

-- INSERT: Insert tags where tenant_id matches user's tenant_id
CREATE POLICY "Users can insert tags for their tenant"
ON user_tags_dispara_lead_saas_02
FOR INSERT
WITH CHECK (
    tenant_id IN (
        SELECT tenant_id 
        FROM users_dispara_lead_saas_02 
        WHERE id = auth.uid()
    )
);

-- UPDATE: Update tags where tenant_id matches user's tenant_id
CREATE POLICY "Users can update tags for their tenant"
ON user_tags_dispara_lead_saas_02
FOR UPDATE
USING (
    tenant_id IN (
        SELECT tenant_id 
        FROM users_dispara_lead_saas_02 
        WHERE id = auth.uid()
    )
);

-- DELETE: Delete tags where tenant_id matches user's tenant_id
CREATE POLICY "Users can delete tags for their tenant"
ON user_tags_dispara_lead_saas_02
FOR DELETE
USING (
    tenant_id IN (
        SELECT tenant_id 
        FROM users_dispara_lead_saas_02 
        WHERE id = auth.uid()
    )
);
