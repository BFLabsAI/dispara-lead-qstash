-- Force refresh verification of Realtime
BEGIN;
  -- Try to drop first (ignore if not exists)
  DO $$
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE messages_dispara_lead_saas_02;
  EXCEPTION WHEN OTHERS THEN
    -- Ignore error if table wasn't in publication
  END $$;

  -- Add it back explicitly
  ALTER PUBLICATION supabase_realtime ADD TABLE messages_dispara_lead_saas_02;
  
  -- Explicitly Grant Select to Authenticated just in case RLS is weird (though Policy should handle it)
  GRANT SELECT ON messages_dispara_lead_saas_02 TO authenticated;

COMMIT;
