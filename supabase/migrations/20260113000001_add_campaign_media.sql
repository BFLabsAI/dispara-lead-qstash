-- Add media columns to campaigns for centralized content management
ALTER TABLE campaigns_dispara_lead_saas_02
ADD COLUMN IF NOT EXISTS media_url text,
ADD COLUMN IF NOT EXISTS media_type text;
