-- Consolidated Migration for Dispara Lead
-- Generated on 2026-01-06
-- Includes: Plans, Tenants, Users, Instances, Campaigns, Audiences, Chat, Logs, Email Templates

-- Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- --------------------------------------------------------------------------------
-- 1. FUNCTIONS (Required for RLS)
-- --------------------------------------------------------------------------------

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
$function$;

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
$function$;

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
$function$;

CREATE OR REPLACE FUNCTION public.is_user_super_admin()
 RETURNS boolean
 LANGUAGE sql
AS $function$
  SELECT is_super_admin 
  FROM public.users_dispara_lead_saas_02 
  WHERE id = auth.uid();
$function$;

-- --------------------------------------------------------------------------------
-- 2. TABLES
-- --------------------------------------------------------------------------------

-- PLANS
CREATE TABLE IF NOT EXISTS public.plans_dispara_lead_saas_02 (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    description text,
    price numeric,
    limits jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- TENANTS
CREATE TABLE IF NOT EXISTS public.tenants_dispara_lead_saas_02 (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    plan_id uuid REFERENCES public.plans_dispara_lead_saas_02(id),
    status text DEFAULT 'active',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- USERS
CREATE TABLE IF NOT EXISTS public.users_dispara_lead_saas_02 (
    id uuid NOT NULL PRIMARY KEY, -- Linked to auth.users usually
    tenant_id uuid REFERENCES public.tenants_dispara_lead_saas_02(id),
    email text,
    full_name text,
    avatar_url text,
    role text DEFAULT 'member',
    is_super_admin boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- COMPANY SETTINGS
CREATE TABLE IF NOT EXISTS public.company_settings_dispara_lead_saas_02 (
    tenant_id uuid PRIMARY KEY REFERENCES public.tenants_dispara_lead_saas_02(id),
    company_name text,
    market_segment text,
    company_size text,
    brand_voice text,
    brand_personality text,
    preferred_language text,
    main_products text,
    average_ticket text,
    sales_cycle text,
    seasonality text,
    main_persona text,
    age_range text,
    social_class text,
    primary_goal text,
    secondary_goals text[],
    main_competitors text,
    whatsapp_guidelines jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- INSTANCES
CREATE TABLE IF NOT EXISTS public.instances_dispara_lead_saas_02 (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid REFERENCES public.tenants_dispara_lead_saas_02(id),
    instance_name text NOT NULL,
    status text DEFAULT 'disconnected',
    qrcode text,
    qrcode_generated_at timestamp with time zone,
    metadata jsonb,
    uazapi_instance_id text,
    last_connected_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- CAMPAIGNS
CREATE TABLE IF NOT EXISTS public.campaigns_dispara_lead_saas_02 (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid REFERENCES public.tenants_dispara_lead_saas_02(id),
    user_id uuid REFERENCES public.users_dispara_lead_saas_02(id),
    name text NOT NULL,
    status text DEFAULT 'draft', -- draft, pending, processing, completed, failed
    target_audience text,
    creative text,
    total_messages integer DEFAULT 0,
    instances text[], -- Array of instance names
    delay_min integer,
    delay_max integer,
    is_scheduled boolean DEFAULT false,
    scheduled_for timestamp with time zone,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- AUDIENCES
CREATE TABLE IF NOT EXISTS public.audiences_dispara_lead_saas_02 (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid REFERENCES public.tenants_dispara_lead_saas_02(id),
    name text NOT NULL,
    description text,
    total_contacts integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- TAGS
CREATE TABLE IF NOT EXISTS public.tags_dispara_lead_saas_02 (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid REFERENCES public.tenants_dispara_lead_saas_02(id),
    name text NOT NULL,
    color text,
    created_at timestamp with time zone DEFAULT now()
);

-- AUDIENCE TAGS (Join Table)
CREATE TABLE IF NOT EXISTS public.audience_tags_dispara_lead_saas_02 (
    audience_id uuid REFERENCES public.audiences_dispara_lead_saas_02(id) ON DELETE CASCADE,
    tag_id uuid REFERENCES public.tags_dispara_lead_saas_02(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (audience_id, tag_id)
);

-- AUDIENCE CONTACTS
CREATE TABLE IF NOT EXISTS public.audience_contacts_dispara_lead_saas_02 (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    audience_id uuid REFERENCES public.audiences_dispara_lead_saas_02(id) ON DELETE CASCADE,
    phone_number text NOT NULL,
    name text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);

-- CHAT SESSIONS
CREATE TABLE IF NOT EXISTS public.chat_sessions_dispara_lead_saas_02 (
    id text PRIMARY KEY, -- Using text ID (uuidv4 string) from frontend
    tenant_id uuid REFERENCES public.tenants_dispara_lead_saas_02(id), -- Nullable if not strictly enforced yet
    user_id uuid REFERENCES public.users_dispara_lead_saas_02(id),
    session_name text,
    template_used text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- CHAT MESSAGES
CREATE TABLE IF NOT EXISTS public.chat_messages_dispara_lead_saas_02 (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id text REFERENCES public.chat_sessions_dispara_lead_saas_02(id) ON DELETE CASCADE,
    role text NOT NULL, -- user, assistant
    content text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now()
);

-- MESSAGE LOGS (v03)
CREATE TABLE IF NOT EXISTS public.message_logs_dispara_lead_saas_03 (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid REFERENCES public.tenants_dispara_lead_saas_02(id),
    campaign_id uuid REFERENCES public.campaigns_dispara_lead_saas_02(id),
    instance_name text,
    phone_number text,
    message_content text,
    status text, -- queued, sent, failed, delivered
    campaign_name text,
    campaign_type text,
    error_message text,
    metadata jsonb,
    scheduled_for timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    queued_at timestamp with time zone,
    sent_at timestamp with time zone
);

-- EMAIL TEMPLATES
CREATE TABLE IF NOT EXISTS public.email_templates_dispara_lead_saas (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    type text NOT NULL UNIQUE, -- invite, recovery
    subject text,
    html_content text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- --------------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY
-- --------------------------------------------------------------------------------

-- Helper: Enable RLS on all tables
ALTER TABLE public.plans_dispara_lead_saas_02 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants_dispara_lead_saas_02 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users_dispara_lead_saas_02 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings_dispara_lead_saas_02 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instances_dispara_lead_saas_02 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns_dispara_lead_saas_02 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audiences_dispara_lead_saas_02 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags_dispara_lead_saas_02 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audience_tags_dispara_lead_saas_02 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audience_contacts_dispara_lead_saas_02 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions_dispara_lead_saas_02 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages_dispara_lead_saas_02 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_logs_dispara_lead_saas_03 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates_dispara_lead_saas ENABLE ROW LEVEL SECURITY;

-- Note: Simple policies for brevity. Production should be more granular.

-- Users: View own profile
CREATE POLICY "Users view own profile" ON public.users_dispara_lead_saas_02
FOR SELECT USING (auth.uid() = id);

-- Tenants: Users view their own tenant
CREATE POLICY "Users view own tenant" ON public.tenants_dispara_lead_saas_02
FOR SELECT USING (id = (SELECT tenant_id FROM public.users_dispara_lead_saas_02 WHERE id = auth.uid()));

-- Generic Policy for Tenant-scoped tables
-- (Applies to: instances, campaigns, audiences, tags, logs, settings)
CREATE POLICY "Tenant isolation for instances" ON public.instances_dispara_lead_saas_02
FOR ALL USING (tenant_id = (SELECT tenant_id FROM public.users_dispara_lead_saas_02 WHERE id = auth.uid()));

CREATE POLICY "Tenant isolation for campaigns" ON public.campaigns_dispara_lead_saas_02
FOR ALL USING (tenant_id = (SELECT tenant_id FROM public.users_dispara_lead_saas_02 WHERE id = auth.uid()));

CREATE POLICY "Tenant isolation for audiences" ON public.audiences_dispara_lead_saas_02
FOR ALL USING (tenant_id = (SELECT tenant_id FROM public.users_dispara_lead_saas_02 WHERE id = auth.uid()));

CREATE POLICY "Tenant isolation for tags" ON public.tags_dispara_lead_saas_02
FOR ALL USING (tenant_id = (SELECT tenant_id FROM public.users_dispara_lead_saas_02 WHERE id = auth.uid()));

CREATE POLICY "Tenant isolation for company_settings" ON public.company_settings_dispara_lead_saas_02
FOR ALL USING (tenant_id = (SELECT tenant_id FROM public.users_dispara_lead_saas_02 WHERE id = auth.uid()));

CREATE POLICY "Tenant isolation for message_logs" ON public.message_logs_dispara_lead_saas_03
FOR ALL USING (tenant_id = (SELECT tenant_id FROM public.users_dispara_lead_saas_02 WHERE id = auth.uid()));

-- Indirect Policies (via Parent)
CREATE POLICY "Tenant isolation for audience_contacts" ON public.audience_contacts_dispara_lead_saas_02
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.audiences_dispara_lead_saas_02 a
    WHERE a.id = audience_id
    AND a.tenant_id = (SELECT tenant_id FROM public.users_dispara_lead_saas_02 WHERE id = auth.uid())
  )
);

CREATE POLICY "Tenant isolation for audience_tags" ON public.audience_tags_dispara_lead_saas_02
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.audiences_dispara_lead_saas_02 a
    WHERE a.id = audience_id
    AND a.tenant_id = (SELECT tenant_id FROM public.users_dispara_lead_saas_02 WHERE id = auth.uid())
  )
);

-- Super Admin Bypass (Example)
-- In a real scenario, you'd add "OR public.is_super_admin()" to the USING clauses above.

-- Public Read for Email Templates (or authenticated only)
CREATE POLICY "Public read email templates" ON public.email_templates_dispara_lead_saas
FOR SELECT TO authenticated USING (true);
