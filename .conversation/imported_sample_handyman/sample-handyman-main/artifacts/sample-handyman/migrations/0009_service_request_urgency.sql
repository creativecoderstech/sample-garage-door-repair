-- Soft priority signal for service requests (not a true emergency dispatch).
-- Values: flexible | soon | urgent
ALTER TABLE service_requests ADD COLUMN urgency TEXT NOT NULL DEFAULT 'flexible';

CREATE INDEX IF NOT EXISTS idx_service_requests_urgency
  ON service_requests (urgency);
