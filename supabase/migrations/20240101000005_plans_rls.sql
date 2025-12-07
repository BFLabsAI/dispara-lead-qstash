-- Enable RLS on plans table (if not already enabled, though policies exist so it likely is)
ALTER TABLE public.plans_dispara_lead_saas_02 ENABLE ROW LEVEL SECURITY;

-- Policy: Super Admins can INSERT plans
CREATE POLICY "Super admins can insert plans"
ON public.plans_dispara_lead_saas_02
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_super_admin()
);

-- Policy: Super Admins can UPDATE plans
CREATE POLICY "Super admins can update plans"
ON public.plans_dispara_lead_saas_02
FOR UPDATE
TO authenticated
USING (
  public.is_super_admin()
)
WITH CHECK (
  public.is_super_admin()
);

-- Policy: Super Admins can DELETE plans
CREATE POLICY "Super admins can delete plans"
ON public.plans_dispara_lead_saas_02
FOR DELETE
TO authenticated
USING (
  public.is_super_admin()
);
