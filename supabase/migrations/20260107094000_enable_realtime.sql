-- Enable Realtime for messages table
begin;
  -- Check if table is already in publication to avoid error
  do $$
  begin
    if not exists (
      select 1 from pg_publication_tables 
      where pubname = 'supabase_realtime' 
      and tablename = 'messages_dispara_lead_saas_02'
    ) then
      alter publication supabase_realtime add table messages_dispara_lead_saas_02;
    end if;
  end $$;
commit;
