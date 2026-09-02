-- Migration: seed google_place_id key in site_settings
INSERT INTO site_settings (key, value, updated_at)
VALUES ('google_place_id', '', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
ON CONFLICT(key) DO NOTHING;
