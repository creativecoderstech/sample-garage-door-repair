CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Display phone shown in the site header (editable in admin).
INSERT OR IGNORE INTO site_settings (key, value)
VALUES ('phone', '(512) 244-8550');
