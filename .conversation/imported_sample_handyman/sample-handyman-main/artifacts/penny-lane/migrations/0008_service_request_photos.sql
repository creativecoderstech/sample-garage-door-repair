-- Photos attached to public service requests (stored in R2 via MEDIA binding).
CREATE TABLE IF NOT EXISTS service_request_photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_request_id INTEGER NOT NULL,
  image_key TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (service_request_id) REFERENCES service_requests(id)
);

CREATE INDEX IF NOT EXISTS idx_service_request_photos_request
  ON service_request_photos (service_request_id, sort_order, id);
