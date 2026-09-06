-- Additive PostgreSQL schema reference. Replit production applies the equivalent
-- Drizzle diff during Publish; this file must not run at application startup.
ALTER TABLE garage_business_settings
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'unverified';

ALTER TABLE garage_business_settings
  ADD COLUMN IF NOT EXISTS trust_profile jsonb NOT NULL DEFAULT
    '{"hours":null,"ownerTeam":null,"yearsInBusiness":null,"brandsServiced":null,"paymentOptions":null,"financing":null,"licenseInsurance":null,"warranty":null}'::jsonb;

CREATE TABLE IF NOT EXISTS garage_content (
  id text PRIMARY KEY,
  kind text NOT NULL,
  slug text NOT NULL,
  aliases jsonb NOT NULL DEFAULT '[]'::jsonb,
  title text NOT NULL,
  summary text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  image_url text NOT NULL DEFAULT '',
  image_alt text NOT NULL DEFAULT '',
  before_image_url text NOT NULL DEFAULT '',
  seo_title text NOT NULL DEFAULT '',
  seo_description text NOT NULL DEFAULT '',
  parent_id text,
  sort_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  verification_status text NOT NULL DEFAULT 'unverified',
  featured boolean NOT NULL DEFAULT false,
  service_code text NOT NULL DEFAULT '',
  reviewed_seed boolean NOT NULL DEFAULT false,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS garage_content_kind_slug_unique
  ON garage_content (kind, slug);

CREATE TABLE IF NOT EXISTS garage_seed_events (
  key text PRIMARY KEY,
  applied_at timestamp with time zone NOT NULL DEFAULT now()
);