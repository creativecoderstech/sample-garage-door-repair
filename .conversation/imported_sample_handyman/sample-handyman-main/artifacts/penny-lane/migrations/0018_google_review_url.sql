-- Migration: seed google_review_url key in site_settings
INSERT INTO site_settings (key, value, updated_at)
VALUES ('google_review_url', '', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
ON CONFLICT(key) DO NOTHING;
