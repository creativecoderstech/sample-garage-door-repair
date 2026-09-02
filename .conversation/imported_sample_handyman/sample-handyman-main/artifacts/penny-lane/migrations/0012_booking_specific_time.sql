-- Add optional specific arrival time to confirmed bookings.
-- NULL means the admin only chose a window (morning/afternoon/evening).
ALTER TABLE bookings ADD COLUMN scheduled_specific_time TEXT;
