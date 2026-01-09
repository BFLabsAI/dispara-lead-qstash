-- Add notes column to contacts table
ALTER TABLE IF EXISTS public.contacts_dispara_lead_saas_02
ADD COLUMN IF NOT EXISTS notes text;
