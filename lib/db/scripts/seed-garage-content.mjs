import pg from "pg";
import { garageContentSeed } from "../src/garage-content.ts";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();
try {
  await client.query("BEGIN");
  const marker = await client.query(
    "INSERT INTO garage_seed_events (key) VALUES ($1) ON CONFLICT (key) DO NOTHING RETURNING key",
    ["garage-content-v1"],
  );
  if (marker.rowCount === 0) {
    await client.query("ROLLBACK");
    process.exitCode = 0;
  } else {
  for (const item of garageContentSeed) {
    await client.query(
      `INSERT INTO garage_content
       (id, kind, slug, aliases, title, summary, body, image_url, image_alt, before_image_url,
        seo_title, seo_description, parent_id, sort_order, status, verification_status, featured, service_code, reviewed_seed, updated_at)
       VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,TRUE,NOW())
       ON CONFLICT (id) DO NOTHING`,
      [
        item.id, item.kind, item.slug, JSON.stringify(item.aliases), item.title, item.summary,
        item.body, item.imageUrl, item.imageAlt, item.beforeImageUrl, item.seoTitle,
        item.seoDescription, item.parentId, item.sortOrder, item.status,
        item.verificationStatus, item.featured, item.serviceCode,
      ],
    );
  }
  await client.query("COMMIT");
  }
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}