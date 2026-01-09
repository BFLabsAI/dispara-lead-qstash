-- Rename existing column to be specific for RESPONSES (User request: separate response vs report)
ALTER TABLE public.company_settings_dispara_lead_saas_02 
RENAME COLUMN notification_phones TO response_notification_phones;

-- Add new column for REPORTS
ALTER TABLE public.company_settings_dispara_lead_saas_02 
ADD COLUMN report_notification_phones text[];

-- Comment on columns for clarity
COMMENT ON COLUMN public.company_settings_dispara_lead_saas_02.response_notification_phones IS 'Phones that receive alerts when leads respond';
COMMENT ON COLUMN public.company_settings_dispara_lead_saas_02.report_notification_phones IS 'Phones that receive campaign completion reports';
