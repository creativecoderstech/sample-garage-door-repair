-- Migration: create google_reviews table for cron-synced Place API reviews
CREATE TABLE IF NOT EXISTS google_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  author_name TEXT NOT NULL,
  author_photo_url TEXT,
  rating INTEGER NOT NULL,
  text TEXT NOT NULL,
  google_time INTEGER NOT NULL,
  synced_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE(author_name, google_time)
);
