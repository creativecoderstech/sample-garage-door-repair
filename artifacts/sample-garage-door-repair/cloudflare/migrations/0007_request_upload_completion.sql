ALTER TABLE request_submissions ADD COLUMN completed_at TEXT;
ALTER TABLE request_attachments ADD COLUMN prepare_key TEXT;
UPDATE request_attachments SET prepare_key = id WHERE prepare_key IS NULL;
CREATE UNIQUE INDEX request_attachments_prepare_unique
  ON request_attachments(request_id, prepare_key);