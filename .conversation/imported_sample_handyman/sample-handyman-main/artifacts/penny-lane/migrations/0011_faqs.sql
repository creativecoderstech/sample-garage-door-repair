CREATE TABLE IF NOT EXISTS faqs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS faqs_sort_order_idx
  ON faqs (sort_order ASC, id ASC);

CREATE INDEX IF NOT EXISTS faqs_published_idx
  ON faqs (published);

-- Seed current homepage FAQs so the site does not go empty after migrate.
INSERT OR IGNORE INTO faqs (id, question, answer, sort_order, published) VALUES
  (1, 'What''s your service area?', 'I serve Canton, Woodstock, Holly Springs, Ball Ground, and surrounding Northern Atlanta Metro communities. If you''re within 20 miles of Canton, GA, I can help.', 1, 1),
  (2, 'How quickly can you respond?', 'I respond to requests in 41 minutes on average. Most messages get answered within an hour, even on weekends.', 2, 1),
  (3, 'Do you offer free estimates?', 'Yes! For larger projects I provide free, detailed estimates. Smaller jobs are typically quoted after a quick phone discussion.', 3, 1),
  (4, 'What payment methods do you accept?', 'I accept Apple Pay, cash, check, credit cards, PayPal, Square, Venmo, and Zelle. Payment is due upon completion.', 4, 1),
  (5, 'Are you licensed and insured?', 'Yes, I''m fully insured through Next Insurance and background-checked through both Thumbtack and TaskRabbit platforms.', 5, 1),
  (6, 'What if I need to reschedule?', 'Life happens — just let me know as soon as possible and we''ll find a time that works better.', 6, 1);
