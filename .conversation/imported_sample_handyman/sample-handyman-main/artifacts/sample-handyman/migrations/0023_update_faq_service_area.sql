-- Update FAQ #1 service area from Georgia cities to Greater Austin Area
UPDATE faqs
SET
  answer     = 'I serve Austin, Round Rock, Cedar Park, Georgetown, Pflugerville, and surrounding Greater Austin Area communities. If you''re within 20 miles of Austin, TX, I can help.',
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE id = 1;
