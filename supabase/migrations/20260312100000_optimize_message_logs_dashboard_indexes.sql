-- Low-risk indexes for the current dashboard/logs read paths.
-- Focus:
-- 1. tenant + date window scans
-- 2. tenant + status/date filters
-- 3. tenant + campaign/date filters

CREATE INDEX IF NOT EXISTS idx_message_logs_tenant_created_at_desc
ON public.message_logs_dispara_lead_saas_03 (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_message_logs_tenant_status_created_at_desc
ON public.message_logs_dispara_lead_saas_03 (tenant_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_message_logs_tenant_campaign_created_at_desc
ON public.message_logs_dispara_lead_saas_03 (tenant_id, campaign_name, created_at DESC)
WHERE campaign_name IS NOT NULL;
