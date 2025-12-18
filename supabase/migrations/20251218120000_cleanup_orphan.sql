DO $$
DECLARE
    target_email text := 'design@escolapreach.com.br';
    target_user_id uuid;
BEGIN
    -- 1. Get User ID (from auth or public, preferably auth)
    SELECT id INTO target_user_id FROM auth.users WHERE email = target_email;

    -- If not found in auth, try public
    IF target_user_id IS NULL THEN
        SELECT id INTO target_user_id FROM public.users_dispara_lead_saas_02 WHERE email = target_email;
    END IF;

    IF target_user_id IS NOT NULL THEN
        -- 2. Delete owned tenants (Delete children first to avoid FK violations)
        DELETE FROM public.tenants_dispara_lead_saas_02 WHERE owner_id = target_user_id;

        -- 3. Delete from public users
        DELETE FROM public.users_dispara_lead_saas_02 WHERE id = target_user_id;

        -- 4. Delete from auth.users
        DELETE FROM auth.users WHERE id = target_user_id;
        
        RAISE NOTICE 'User % cleaned up successfully.', target_email;
    ELSE
        RAISE NOTICE 'User % not found.', target_email;
    END IF;
END $$;
