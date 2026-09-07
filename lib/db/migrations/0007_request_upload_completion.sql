ALTER TABLE garage_request_submissions ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE garage_request_attachments ADD COLUMN IF NOT EXISTS prepare_key text;
UPDATE garage_request_attachments SET prepare_key = id WHERE prepare_key IS NULL;
ALTER TABLE garage_request_attachments ALTER COLUMN prepare_key SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS garage_request_attachments_prepare_unique
  ON garage_request_attachments(request_id, prepare_key);