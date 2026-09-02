-- Split pending client leads (service_requests) from confirmed schedule (bookings).

CREATE TABLE IF NOT EXISTS service_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  service TEXT NOT NULL,
  description TEXT NOT NULL,
  preferred_date TEXT,
  preferred_time TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS service_requests_created_at_idx ON service_requests (created_at DESC);
CREATE INDEX IF NOT EXISTS service_requests_status_idx ON service_requests (status);

-- Move pending leads out of the old bookings table.
INSERT INTO service_requests (
  name, email, phone, service, description, preferred_date, preferred_time, status, created_at, updated_at
)
SELECT
  name,
  email,
  phone,
  service,
  description,
  preferred_date,
  preferred_time,
  CASE
    WHEN status = 'contacted' THEN 'contacted'
    ELSE 'pending'
  END,
  created_at,
  created_at
FROM bookings
WHERE status IN ('new', 'contacted');

-- Rebuild bookings as confirmed appointments only.
CREATE TABLE bookings_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_request_id INTEGER,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  service TEXT NOT NULL,
  description TEXT NOT NULL,
  scheduled_date TEXT NOT NULL,
  scheduled_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (service_request_id) REFERENCES service_requests(id)
);

INSERT INTO bookings_new (
  name, email, phone, service, description,
  scheduled_date, scheduled_time, status, created_at, updated_at
)
SELECT
  name,
  email,
  phone,
  service,
  description,
  COALESCE(preferred_date, substr(created_at, 1, 10)),
  COALESCE(preferred_time, 'morning'),
  CASE
    WHEN status = 'completed' THEN 'completed'
    ELSE 'confirmed'
  END,
  created_at,
  created_at
FROM bookings
WHERE status IN ('scheduled', 'completed');

DROP TABLE bookings;
ALTER TABLE bookings_new RENAME TO bookings;

CREATE INDEX IF NOT EXISTS bookings_scheduled_date_idx ON bookings (scheduled_date DESC);
CREATE INDEX IF NOT EXISTS bookings_status_idx ON bookings (status);

-- Owner notification settings (optional until configured).
INSERT OR IGNORE INTO site_settings (key, value) VALUES ('owner_email', '');
INSERT OR IGNORE INTO site_settings (key, value) VALUES ('notify_from_email', '');
INSERT OR IGNORE INTO site_settings (key, value) VALUES ('notify_from_name', 'Penny Lane Home Solutions');
