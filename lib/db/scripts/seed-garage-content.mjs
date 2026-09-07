import pg from "pg";
import { garageContentSeed } from "../src/garage-content.ts";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();
try {
  await client.query("BEGIN");
  const previousMarkers = await client.query(
    "SELECT key FROM garage_seed_events WHERE key IN ($1,$2,$3)",
    ["garage-content-v1", "garage-content-cumming-v2", "garage-content-cumming-v3"],
  );
  const previousKeys = new Set(previousMarkers.rows.map((row) => row.key));
  const legacySeedIds = new Set([
    "page-home", "page-services", "page-service-area", "page-about", "page-blog", "page-contact",
    "page-gallery", "page-faqs", "service-spring", "service-opener", "service-track",
    "service-hardware", "service-replacement", "service-maintenance", "location-atlanta",
    "location-marietta", "location-decatur", "location-alpharetta", "article-balance",
    "article-sensors", "article-request", "faq-heavy", "faq-reverses", "faq-manual",
    "faq-price", "project-insulated", "project-opener", "project-hardware",
    "trust-identity", "trust-credentials", "trust-warranty", "trust-hours",
  ]);
  await client.query(
    `INSERT INTO garage_business_settings
      (id,business_name,phone,email,service_area,theme,service_id,emergency_enabled,hero_image,
       gallery_images,verification_status,production_approved,hours,coverage,urgent_policy,
       domain_configured,auth_configured,claim_verification,trust_profile)
     VALUES
      (1,'Cumming Garage Door Service','(470) 555-0147','service@cumminggaragedoor.example',
       'Cumming and Forsyth County (provisional)','industrial','garage-door-repair',FALSE,
       '/images/curated/hero-elegant-home.jpg',
       '["/images/curated/gallery-modern-home.jpg","/images/curated/gallery-classic-garage.jpg","/images/curated/gallery-wood-garage.jpg"]'::jsonb,
       'unverified',FALSE,'Monday–Friday 8am–6pm; Saturday 9am–2pm; Sunday closed',
       'Cumming and Forsyth County (provisional)','',FALSE,FALSE,
       '{"businessName":{"status":"verified","isExample":false,"verifiedAt":null},"phone":{"status":"unverified","isExample":true,"verifiedAt":null},"email":{"status":"unverified","isExample":true,"verifiedAt":null},"hours":{"status":"unverified","isExample":true,"verifiedAt":null},"coverage":{"status":"unverified","isExample":true,"verifiedAt":null}}'::jsonb,
       '{"hours":null,"ownerTeam":null,"yearsInBusiness":null,"brandsServiced":null,"paymentOptions":null,"financing":null,"licenseInsurance":null,"warranty":null,"urgentPolicy":null}'::jsonb)
     ON CONFLICT (id) DO NOTHING`,
  );
  const marker = await client.query(
    "INSERT INTO garage_seed_events (key) VALUES ($1) ON CONFLICT (key) DO NOTHING RETURNING key",
    ["garage-content-cumming-v4"],
  );
  if (marker.rowCount === 0) {
    await client.query("ROLLBACK");
    process.exitCode = 0;
  } else {
  for (const item of garageContentSeed) {
    const preserveMissing = previousKeys.has("garage-content-cumming-v2")
      || previousKeys.has("garage-content-cumming-v3")
      || (previousKeys.has("garage-content-v1") && legacySeedIds.has(item.id));
    if (preserveMissing) {
      const existing = await client.query("SELECT 1 FROM garage_content WHERE id=$1", [item.id]);
      if (existing.rowCount === 0) continue;
    }
    const routeOwner = await client.query(
      "SELECT id FROM garage_content WHERE kind=$1 AND slug=$2 LIMIT 1",
      [item.kind, item.slug],
    );
    if (routeOwner.rows[0] && routeOwner.rows[0].id !== item.id) continue;
    await client.query(
      `INSERT INTO garage_content
       (id, kind, slug, aliases, title, navigation_label, navigation_group, summary, body,
         symptoms, expectations, service_faqs, image_url, image_alt, media_metadata, before_image_url,
         seo_title, seo_description, parent_id, sort_order, status, verification_status, featured,
         service_code, reviewed_seed, updated_at)
        VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb,$12::jsonb,$13,$14,$15::jsonb,$16,$17,$18,$19,$20,$21,$22,$23,$24,TRUE,NOW())
        ON CONFLICT (id) DO UPDATE SET
          kind=EXCLUDED.kind, slug=EXCLUDED.slug, aliases=EXCLUDED.aliases, title=EXCLUDED.title,
          navigation_label=EXCLUDED.navigation_label, navigation_group=EXCLUDED.navigation_group,
          summary=EXCLUDED.summary, body=EXCLUDED.body, symptoms=EXCLUDED.symptoms,
          expectations=EXCLUDED.expectations, service_faqs=EXCLUDED.service_faqs,
          image_url=EXCLUDED.image_url, image_alt=EXCLUDED.image_alt,
          media_metadata=EXCLUDED.media_metadata, before_image_url=EXCLUDED.before_image_url,
          seo_title=EXCLUDED.seo_title, seo_description=EXCLUDED.seo_description,
          parent_id=EXCLUDED.parent_id, sort_order=EXCLUDED.sort_order, status=EXCLUDED.status,
          verification_status=EXCLUDED.verification_status, featured=EXCLUDED.featured,
          service_code=EXCLUDED.service_code, updated_at=NOW()
        WHERE garage_content.reviewed_seed=TRUE`,
      [
        item.id, item.kind, item.slug, JSON.stringify(item.aliases), item.title,
        item.navigationLabel, item.navigationGroup, item.summary, item.body,
        JSON.stringify(item.symptoms), JSON.stringify(item.expectations), JSON.stringify(item.serviceFaqs),
        item.imageUrl, item.imageAlt, JSON.stringify(item.mediaMetadata), item.beforeImageUrl,
        item.seoTitle, item.seoDescription, item.parentId, item.sortOrder, item.status,
        item.verificationStatus, item.featured, item.serviceCode,
      ],
    );
  }
  await client.query(
    `UPDATE garage_content SET status='draft'
     WHERE id = ANY($1::text[]) AND reviewed_seed=TRUE`,
    [[
      "service-track", "service-hardware", "service-replacement",
      "location-atlanta", "location-marietta", "location-decatur", "location-alpharetta",
    ]],
  );
  await client.query("COMMIT");
  }
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}