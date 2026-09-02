CREATE TABLE IF NOT EXISTS gallery_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT NOT NULL,
  alt TEXT NOT NULL,
  image_key TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS gallery_items_sort_order_idx
  ON gallery_items (sort_order ASC, created_at DESC);

CREATE INDEX IF NOT EXISTS gallery_items_published_idx
  ON gallery_items (published);

-- Seed current homepage Gallery photos (images uploaded to R2 via seed:gallery script).
INSERT OR IGNORE INTO gallery_items (id, label, alt, image_key, sort_order, published) VALUES
  (1, 'TV Mounting', 'TV mounted above fireplace with clean cable management', 'gallery/defaults/tv-mounting.jpg', 1, 1),
  (2, 'Plumbing Repair', 'Professional under-sink plumbing repair', 'gallery/defaults/plumbing-repair.jpg', 2, 1),
  (3, 'Furniture Assembly', 'Assembled modern bookshelf', 'gallery/defaults/furniture-assembly.jpg', 3, 1),
  (4, 'Cabinet Installation', 'Professional handyman installing cabinet hardware', 'gallery/defaults/hands-working.jpg', 4, 1),
  (5, 'Electrical Work', 'Light fixture installation', 'gallery/defaults/hero-light-fixture.jpg', 5, 1),
  (6, 'Ready for Any Job', 'Professional tools', 'gallery/defaults/tools-workbench.jpg', 6, 1);
