-- Add qstash_message_id to message logs for debugging/tracking
ALTER TABLE message_logs_dispara_lead_saas_03
ADD COLUMN IF NOT EXISTS qstash_message_id text;

-- Add index on qstash_message_id for faster lookups if needed
CREATE INDEX IF NOT EXISTS idx_message_logs_qstash_id ON message_logs_dispara_lead_saas_03(qstash_message_id);
