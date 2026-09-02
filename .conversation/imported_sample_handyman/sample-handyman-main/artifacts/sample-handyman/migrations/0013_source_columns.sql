-- Add source column to track whether a service request / booking came from
-- the public web form or was recorded by the admin during a phone call.
ALTER TABLE service_requests ADD COLUMN source TEXT NOT NULL DEFAULT 'web';
ALTER TABLE bookings ADD COLUMN source TEXT NOT NULL DEFAULT 'web';
