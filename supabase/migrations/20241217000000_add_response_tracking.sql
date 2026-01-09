-- Add responded_at column to track campaign responses
ALTER TABLE message_logs_dispara_lead_saas_03
ADD COLUMN IF NOT EXISTS responded_at timestamp with time zone;

-- Index for faster lookup during webhook processing
CREATE INDEX IF NOT EXISTS idx_message_logs_03_phone_tenant_sent 
ON message_logs_dispara_lead_saas_03 (tenant_id, phone_number, sent_at DESC);
