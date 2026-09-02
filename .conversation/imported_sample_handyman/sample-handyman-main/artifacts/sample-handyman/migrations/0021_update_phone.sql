-- Migration: update placeholder phone to real business number.
-- Applies only when the old placeholder value is still present so
-- a manually-customised phone set by an admin is never overwritten.
UPDATE site_settings
SET value      = '(706) 244-8550',
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'phone'
  AND value IN ('(770) 555-1234', '(512) 555-1234');
