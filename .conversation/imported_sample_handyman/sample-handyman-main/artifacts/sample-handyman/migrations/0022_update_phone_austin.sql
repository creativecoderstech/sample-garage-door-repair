-- Switch the business phone to an Austin, TX (512) number.
-- Updates rows still holding earlier placeholder/Georgia values.
UPDATE site_settings
SET value      = '(512) 244-8550',
    updated_at = CURRENT_TIMESTAMP
WHERE key = 'phone'
  AND value IN ('(706) 244-8550', '(770) 555-1234', '(512) 555-1234');
