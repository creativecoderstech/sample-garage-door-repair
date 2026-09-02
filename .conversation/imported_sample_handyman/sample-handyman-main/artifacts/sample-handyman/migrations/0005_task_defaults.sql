-- Seed default Before & After transformations (images uploaded via seed:tasks script).
INSERT INTO tasks (title, location, description, before_key, after_key, sort_order, published)
SELECT
  'TV Mounting & Cable Management',
  'Canton, GA',
  'Wall-mounted the TV above the fireplace and cleaned up a tangle of visible cables for a finished look.',
  'tasks/defaults/before-tv-setup.jpg',
  'tasks/defaults/after-tv-mounted.jpg',
  1,
  1
WHERE NOT EXISTS (
  SELECT 1 FROM tasks WHERE before_key = 'tasks/defaults/before-tv-setup.jpg'
);

INSERT INTO tasks (title, location, description, before_key, after_key, sort_order, published)
SELECT
  'Drywall Repair',
  'Woodstock, GA',
  'Patched a punched drywall hole, texture-matched, and painted so the wall looks new again.',
  'tasks/defaults/before-drywall-repair.jpg',
  'tasks/defaults/after-drywall-repair.jpg',
  2,
  1
WHERE NOT EXISTS (
  SELECT 1 FROM tasks WHERE before_key = 'tasks/defaults/before-drywall-repair.jpg'
);

INSERT INTO tasks (title, location, description, before_key, after_key, sort_order, published)
SELECT
  'Ceiling Fan Installation',
  'Holly Springs, GA',
  'Swapped a basic flush-mount light for a modern ceiling fan with integrated lighting.',
  'tasks/defaults/before-ceiling-light.jpg',
  'tasks/defaults/after-ceiling-fan.jpg',
  3,
  1
WHERE NOT EXISTS (
  SELECT 1 FROM tasks WHERE before_key = 'tasks/defaults/before-ceiling-light.jpg'
);
