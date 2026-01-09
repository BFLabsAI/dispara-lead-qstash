-- Add notification_phones column to company_settings table
-- This column will store an array of phone numbers to be notified when a lead responds to a campaign.

ALTER TABLE company_settings_dispara_lead_saas_02
ADD COLUMN IF NOT EXISTS notification_phones text[] DEFAULT '{}';

COMMENT ON COLUMN company_settings_dispara_lead_saas_02.notification_phones IS 'List of admin phone numbers to receive WhatsApp notifications on campaign responses';
