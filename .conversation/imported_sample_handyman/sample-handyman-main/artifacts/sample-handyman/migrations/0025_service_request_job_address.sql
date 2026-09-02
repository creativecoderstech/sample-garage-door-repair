-- Job location for service requests.
-- Stored as a single formatted string ("123 Oak St, Austin, TX 78701")
-- because Mike needs it for routing; city/ZIP are captured in the same field.
ALTER TABLE service_requests ADD COLUMN job_address TEXT;
