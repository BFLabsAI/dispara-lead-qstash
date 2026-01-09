-- Fix Realtime RLS and Replica Identity
BEGIN;

-- 1. Set Replica Identity to FULL (Important for Realtime + RLS)
ALTER TABLE messages_dispara_lead_saas_02 REPLICA IDENTITY FULL;

-- 2. Drop existing policy if it exists to clean up
DROP POLICY IF EXISTS "Users view own tenant messages" ON messages_dispara_lead_saas_02;

-- 3. Recreate Policy with Explicit Permissions
CREATE POLICY "Users view own tenant messages" ON messages_dispara_lead_saas_02
FOR SELECT TO authenticated
USING (
  tenant_id = (SELECT tenant_id FROM users_dispara_lead_saas_02 WHERE id = auth.uid())
);

-- 4. Ensure Permissions
GRANT SELECT ON messages_dispara_lead_saas_02 TO authenticated;
GRANT SELECT ON messages_dispara_lead_saas_02 TO service_role;

-- 5. Force Refresh Publication (just in case)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'messages_dispara_lead_saas_02'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages_dispara_lead_saas_02;
  END IF;
END $$;

COMMIT;
