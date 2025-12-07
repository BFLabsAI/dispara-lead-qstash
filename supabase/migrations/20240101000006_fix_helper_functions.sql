-- Fix helper functions to use the correct table (users_dispara_lead_saas_02)

CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN (
    SELECT tenant_id 
    FROM public.users_dispara_lead_saas_02 
    WHERE id = auth.uid()
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_my_tenant_id()
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  tid UUID;
BEGIN
  SELECT tenant_id INTO tid
  FROM public.users_dispara_lead_saas_02
  WHERE id = auth.uid();
  RETURN tid;
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.users_dispara_lead_saas_02
    WHERE id = auth.uid() AND is_super_admin = true
  );
END;
$function$;
