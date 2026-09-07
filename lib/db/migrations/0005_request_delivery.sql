CREATE TABLE IF NOT EXISTS garage_request_submissions (
  idempotency_key text PRIMARY KEY,
  request_id integer NOT NULL REFERENCES garage_service_requests(id) ON DELETE CASCADE,
  upload_capability text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS garage_request_submissions_request_id_unique
  ON garage_request_submissions(request_id);

CREATE TABLE IF NOT EXISTS garage_request_attachments (
  id text PRIMARY KEY,
  request_id integer NOT NULL REFERENCES garage_service_requests(id) ON DELETE CASCADE,
  object_key text NOT NULL,
  original_name text NOT NULL,
  content_type text NOT NULL,
  byte_size integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS garage_request_attachments_object_key_unique
  ON garage_request_attachments(object_key);

CREATE TABLE IF NOT EXISTS garage_notification_settings (
  id integer PRIMARY KEY CHECK (id = 1),
  webhook_url text,
  enabled boolean NOT NULL DEFAULT false,
  destination_verified boolean NOT NULL DEFAULT false,
  tested_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS garage_notification_outbox (
  id text PRIMARY KEY,
  request_id integer NOT NULL REFERENCES garage_service_requests(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'unconfigured',
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  delivered_at timestamptz,
  next_attempt_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS garage_notification_outbox_request_id_unique
  ON garage_notification_outbox(request_id);

CREATE TABLE IF NOT EXISTS garage_persistent_rate_limits (
  rate_key text NOT NULL,
  window_start integer NOT NULL,
  count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (rate_key, window_start)
);