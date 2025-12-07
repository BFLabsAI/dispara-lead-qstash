-- Add tenant_id to disparador_r7_treinamentos
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'disparador_r7_treinamentos' AND column_name = 'tenant_id') THEN
        ALTER TABLE public.disparador_r7_treinamentos ADD COLUMN tenant_id uuid;
    END IF;
END $$;

-- Enable RLS on main tables
ALTER TABLE public.disparador_r7_treinamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users_dispara_lead_saas_02 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns_dispara_lead_saas_02 ENABLE ROW LEVEL SECURITY;

-- Policy helper function to get current user's tenant_id
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS uuid AS $$
BEGIN
  RETURN (
    SELECT tenant_id 
    FROM public.users_dispara_lead_saas_02 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies for disparador_r7_treinamentos
CREATE POLICY "Users can view their own tenant's disparador data"
ON public.disparador_r7_treinamentos
FOR SELECT
USING (
  tenant_id = public.get_current_tenant_id()
);

CREATE POLICY "Users can insert their own tenant's disparador data"
ON public.disparador_r7_treinamentos
FOR INSERT
WITH CHECK (
  tenant_id = public.get_current_tenant_id()
);

-- Policies for campaigns_dispara_lead_saas_02
CREATE POLICY "Users can view their own tenant's campaigns"
ON public.campaigns_dispara_lead_saas_02
FOR SELECT
USING (
  tenant_id = public.get_current_tenant_id()
);

CREATE POLICY "Users can insert their own tenant's campaigns"
ON public.campaigns_dispara_lead_saas_02
FOR INSERT
WITH CHECK (
  tenant_id = public.get_current_tenant_id()
);

CREATE POLICY "Users can update their own tenant's campaigns"
ON public.campaigns_dispara_lead_saas_02
FOR UPDATE
USING (
  tenant_id = public.get_current_tenant_id()
);

-- Policies for users_dispara_lead_saas_02
CREATE POLICY "Users can view members of their own tenant"
ON public.users_dispara_lead_saas_02
FOR SELECT
USING (
  tenant_id = public.get_current_tenant_id()
);
