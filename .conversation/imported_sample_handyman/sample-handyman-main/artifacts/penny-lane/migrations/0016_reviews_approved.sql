-- Add moderation column to reviews.
-- DEFAULT 1 grandfathers all existing rows as already approved so the homepage
-- stays intact. New rows inserted via POST /api/reviews explicitly pass 0.
ALTER TABLE reviews ADD COLUMN approved INTEGER NOT NULL DEFAULT 1;
