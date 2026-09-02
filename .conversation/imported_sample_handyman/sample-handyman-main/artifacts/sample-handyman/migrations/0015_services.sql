CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  benefit TEXT NOT NULL,
  description TEXT NOT NULL,
  icon_slug TEXT NOT NULL DEFAULT 'wrench',
  sort_order INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS services_sort_order_idx
  ON services (sort_order ASC, id ASC);

CREATE INDEX IF NOT EXISTS services_published_idx
  ON services (published);

-- Seed the five hardcoded homepage services so the site is not empty after migrate.
INSERT OR IGNORE INTO services (id, title, benefit, description, icon_slug, sort_order, published) VALUES
  (1, 'Electrical & Lighting', 'Fixtures replaced, fans hung, outlets fixed.', 'Stop squinting at dead bulbs or flickering switches. Light fixture installation, ceiling fans, outlet repairs, and switch replacements — done safely, done right.', 'zap', 1, 1),
  (2, 'TV Mounting & Shelving', 'Your TV on the wall, cables invisible.', 'Clean installs with no visible wiring. TV mounting, floating shelves, picture hanging, mirror installation, and full cable management.', 'wrench', 2, 1),
  (3, 'Plumbing Repairs', 'Stop the drip before it becomes a flood.', 'Leaky faucets, running toilets, slow drains — caught and fixed before a small annoyance becomes a costly problem.', 'droplet', 3, 1),
  (4, 'Furniture Assembly', 'IKEA boxes turned into finished rooms.', 'Skip the three-hour wrestling match with confusing instructions. Desks, shelves, beds, cabinets — assembled correctly the first time.', 'hammer', 4, 1),
  (5, 'Home Repairs & Maintenance', 'The punch-list that actually gets done.', 'Drywall patches, sticking doors, trim work, and general repairs — the to-do items that pile up. One call and they disappear.', 'home', 5, 1);
