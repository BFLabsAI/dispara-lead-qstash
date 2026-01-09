# Database Functions Documentation

The following PostgreSQL functions are essential for the "Dispara Lead" application, primarily for handling Multi-Tenancy and Role-Based Access Control (RBAC) within Row Level Security (RLS) policies.

## 1. `get_my_tenant_id()`

**Description:**
Retrieves the `tenant_id` associated with the currently authenticated user (`auth.uid()`). This is used in the codebase (frontend) to determine the user's active tenant context.

**Source Code:**
```sql
CREATE OR REPLACE FUNCTION public.get_my_tenant_id()
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
DECLARE
  tid UUID;
BEGIN
  SELECT tenant_id INTO tid
  FROM public.users_dispara_lead_saas_02
  WHERE id = auth.uid();
  RETURN tid;
END;
$function$
```

## 2. `is_super_admin()`

**Description:**
Checks if the currently authenticated user (`auth.uid()`) has the `is_super_admin` flag set to true in their user profile. Used for administrative privileges.

**Source Code:**
```sql
CREATE OR REPLACE FUNCTION public.is_super_admin()
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.users_dispara_lead_saas_02
    WHERE id = auth.uid() AND is_super_admin = true
  );
END;
$function$
```

## 3. `get_current_tenant_id()`

**Description:**
A helper function often used within RLS policies to cleanly fetch the current user's tenant ID. Mirrors the logic of `get_my_tenant_id`.

**Source Code:**
```sql
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN (
    SELECT tenant_id 
    FROM public.users_dispara_lead_saas_02 
    WHERE id = auth.uid()
  );
END;
$function$
```

## 4. `is_user_super_admin()`

**Description:**
Another helper function used in RLS policies, returning the `is_super_admin` boolean status directly.

**Source Code:**
```sql
CREATE OR REPLACE FUNCTION public.is_user_super_admin()
 RETURNS boolean
 LANGUAGE sql
AS $function$
  SELECT is_super_admin 
  FROM public.users_dispara_lead_saas_02 
  WHERE id = auth.uid();
$function$
```
