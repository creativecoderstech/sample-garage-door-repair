CREATE TABLE IF NOT EXISTS business_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  settings_json TEXT NOT NULL,
  verified INTEGER NOT NULL DEFAULT 0 CHECK (verified IN (0, 1)),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  starting_price INTEGER NOT NULL,
  duration TEXT NOT NULL,
  emergency INTEGER NOT NULL DEFAULT 0 CHECK (emergency IN (0, 1)),
  verified INTEGER NOT NULL DEFAULT 0 CHECK (verified IN (0, 1))
);
INSERT OR IGNORE INTO services (id, slug, name, description, starting_price, duration, emergency, verified) VALUES
  (1, 'broken-spring', 'Broken Spring Repair', 'High-cycle spring replacement with a complete safety inspection.', 189, '60–90 min', 1, 0),
  (2, 'opener-repair', 'Opener Repair & Installation', 'Quiet smart openers, remotes, keypads, sensors, gears, and motor diagnostics.', 149, '60–120 min', 0, 0),
  (3, 'off-track-door', 'Off-Track Door Rescue', 'Safe realignment of rollers, tracks, and cables before more damage occurs.', 169, '60–90 min', 1, 0),
  (4, 'new-door', 'New Garage Door Installation', 'Insulated steel, carriage-house, and modern glass doors measured and installed precisely.', 1299, '4–6 hours', 0, 0),
  (5, 'cable-roller', 'Cable, Roller & Hinge Repair', 'Restore smooth, quiet travel with matched hardware and professional balancing.', 129, '45–90 min', 1, 0),
  (6, 'maintenance', 'Safety Tune-Up', 'A 25-point inspection, balance test, lubrication, and safety-reversal verification.', 89, '45 min', 0, 0);

CREATE TABLE IF NOT EXISTS service_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  street_address TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT 'GA',
  zip TEXT NOT NULL,
  service TEXT NOT NULL,
  urgency TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  preferred_date TEXT NOT NULL,
  preferred_time TEXT NOT NULL DEFAULT '',
  details TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS service_requests_created_at ON service_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS service_requests_status ON service_requests(status);

CREATE TABLE IF NOT EXISTS rate_limits (
  rate_key TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (rate_key, window_start)
);
CREATE INDEX IF NOT EXISTS rate_limits_expiry ON rate_limits(window_start);

CREATE TABLE IF NOT EXISTS analytics_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_name TEXT NOT NULL,
  path TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS analytics_events_created_at ON analytics_events(created_at DESC);