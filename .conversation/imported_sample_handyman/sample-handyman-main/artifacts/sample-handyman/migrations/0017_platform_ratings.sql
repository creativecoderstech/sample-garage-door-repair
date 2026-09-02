-- Seed platform rating settings so the homepage can display live values
-- managed by the owner via Admin → Settings, instead of hardcoded strings.
INSERT OR IGNORE INTO site_settings (key, value)
VALUES
  ('thumbtack_rating',        '4.9'),
  ('thumbtack_review_count',  '110'),
  ('taskrabbit_rating',       '5.0'),
  ('taskrabbit_review_count', '384');
