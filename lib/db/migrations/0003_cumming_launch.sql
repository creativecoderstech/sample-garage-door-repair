-- Additive Cumming launch upgrade. Content rows are updated by the versioned
-- seed script only while reviewed_seed remains true; owner edits are never reset.
ALTER TABLE garage_business_settings ADD COLUMN IF NOT EXISTS production_approved boolean NOT NULL DEFAULT false;
ALTER TABLE garage_business_settings ADD COLUMN IF NOT EXISTS hours text NOT NULL DEFAULT '';
ALTER TABLE garage_business_settings ADD COLUMN IF NOT EXISTS coverage text NOT NULL DEFAULT '';
ALTER TABLE garage_business_settings ADD COLUMN IF NOT EXISTS urgent_policy text NOT NULL DEFAULT '';
ALTER TABLE garage_business_settings ADD COLUMN IF NOT EXISTS domain_configured boolean NOT NULL DEFAULT false;
ALTER TABLE garage_business_settings ADD COLUMN IF NOT EXISTS auth_configured boolean NOT NULL DEFAULT false;
ALTER TABLE garage_business_settings ADD COLUMN IF NOT EXISTS claim_verification jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE garage_content ADD COLUMN IF NOT EXISTS navigation_label text NOT NULL DEFAULT '';
ALTER TABLE garage_content ADD COLUMN IF NOT EXISTS navigation_group text NOT NULL DEFAULT '';
ALTER TABLE garage_content ADD COLUMN IF NOT EXISTS symptoms jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE garage_content ADD COLUMN IF NOT EXISTS expectations jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE garage_content ADD COLUMN IF NOT EXISTS service_faqs jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE garage_content ADD COLUMN IF NOT EXISTS media_metadata jsonb NOT NULL DEFAULT '{"sourceUrl":"","license":"","attribution":"","representative":true}'::jsonb;

UPDATE garage_business_settings
SET trust_profile=jsonb_set(trust_profile, '{urgentPolicy}', 'null'::jsonb, true)
WHERE NOT (trust_profile ? 'urgentPolicy');

UPDATE garage_business_settings
SET business_name='Cumming Garage Door Service',
    phone='(470) 555-0147',
    email='service@cumminggaragedoor.example',
    service_area='Cumming and Forsyth County (provisional)',
    hours='Monday–Friday 8am–6pm; Saturday 9am–2pm; Sunday closed',
    coverage='Cumming and Forsyth County (provisional)',
    emergency_enabled=false,
    verification_status='unverified',
    production_approved=false,
    claim_verification='{"businessName":{"status":"verified","isExample":false,"verifiedAt":null},"phone":{"status":"unverified","isExample":true,"verifiedAt":null},"email":{"status":"unverified","isExample":true,"verifiedAt":null},"hours":{"status":"unverified","isExample":true,"verifiedAt":null},"coverage":{"status":"unverified","isExample":true,"verifiedAt":null}}'::jsonb
WHERE business_name='Summit Garage Door Co.'
  AND phone='(888) 555-0142'
  AND email='service@summitgaragedoor.com'
  AND verification_status='unverified';

INSERT INTO garage_seed_events(key) VALUES ('garage-content-cumming-v2-schema')
ON CONFLICT (key) DO NOTHING;