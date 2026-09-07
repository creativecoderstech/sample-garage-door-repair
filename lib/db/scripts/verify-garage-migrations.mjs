import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { projectGarageBusinessSettings } from "../src/garage-publication.ts";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
if (process.env.NODE_ENV === "production" || process.env.CLOUDFLARE_ENV === "production") {
  throw new Error("Migration fixtures refuse to run in a production environment.");
}

const run = promisify(execFile);
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const migrationRoot = resolve(packageRoot, "migrations");
const files = (await readdir(migrationRoot)).filter((name) => /^\d{4}_.+\.sql$/.test(name)).sort();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const admin = await pool.connect();

async function runInSchema(schema, script) {
  await run(process.execPath, [script], {
    cwd: packageRoot,
    env: { ...process.env, PGOPTIONS: `-c search_path=${schema}` },
  });
}

async function freshFixture() {
  const schema = `garage_fresh_${randomUUID().replaceAll("-", "")}`;
  await admin.query(`CREATE SCHEMA ${schema}`);
  await runInSchema(schema, "./scripts/migrate-garage.mjs");
  await run(process.execPath, ["--experimental-strip-types", "./scripts/seed-garage-content.mjs"], {
    cwd: packageRoot,
    env: { ...process.env, PGOPTIONS: `-c search_path=${schema}` },
  });
  const client = await pool.connect();
  try {
    await client.query(`SET search_path TO ${schema}`);
    const services = await client.query("SELECT title FROM garage_content WHERE kind='service' AND status='published' ORDER BY sort_order");
    assert.deepEqual(services.rows.map((row) => row.title), [
      "Garage Door Repair",
      "Broken Spring Replacement",
      "Cable, Roller & Off-Track Repair",
      "Garage Door Opener Repair & Installation",
      "New Garage Door Installation",
      "Garage Door Maintenance & Tune-Ups",
      "Commercial Garage Door Services",
    ]);
    const settings = (await client.query("SELECT * FROM garage_business_settings WHERE id=1")).rows[0];
    const projected = projectGarageBusinessSettings({
      businessName: settings.business_name,
      phone: settings.phone,
      email: settings.email,
      serviceArea: settings.service_area,
      hours: settings.hours,
      coverage: settings.coverage,
      urgentPolicy: settings.urgent_policy,
      theme: settings.theme,
      emergencyEnabled: settings.emergency_enabled,
      heroImage: settings.hero_image,
      galleryImages: settings.gallery_images,
      productionApproved: settings.production_approved,
      domainConfigured: settings.domain_configured,
      authConfigured: settings.auth_configured,
      claimVerification: settings.claim_verification,
      trustProfile: settings.trust_profile,
    });
    assert.equal(projected.businessName, "Cumming Garage Door Service");
    assert.equal(projected.phone, "");
    assert.equal(projected.email, "");
    assert.equal(projected.exampleDetails.phone, "(470) 555-0147");
    assert.equal(projected.launchReady, false);
  } finally {
    client.release();
    await admin.query(`DROP SCHEMA ${schema} CASCADE`);
  }
}

async function existingFixture() {
  const schema = `garage_existing_${randomUUID().replaceAll("-", "")}`;
  await admin.query(`CREATE SCHEMA ${schema}`);
  const client = await pool.connect();
  try {
    await client.query(`SET search_path TO ${schema}`);
    await client.query(await readFile(resolve(migrationRoot, "0001_garage_content_architecture.sql"), "utf8"));
    await client.query("INSERT INTO garage_seed_events(key) VALUES ('garage-content-v1')");
    await client.query(`INSERT INTO garage_content(id,kind,slug,title,summary,body,status,verification_status,reviewed_seed)
      VALUES
      ('service-spring','service','broken-spring','Broken Spring Safety Guide','old summary','old body','published','unverified',true),
      ('service-opener','service','opener-sensors','Opener and Sensor Diagnostics','old summary','old body','published','unverified',true),
      ('service-track','service','track-roller','Track and Roller Alignment','old summary','old body','published','unverified',true),
      ('service-hardware','service','hardware','Hardware Inspection','old summary','old body','published','unverified',true),
      ('service-replacement','service','replacement','Replacement Planning','old summary','old body','published','unverified',true),
      ('service-maintenance','service','maintenance','Maintenance','old summary','old body','published','unverified',true),
      ('article-balance','article','why-door-balance-matters','Owner-edited balance article','owner summary','owner body','published','verified',false),
      ('owner-custom','article','owner-custom','Owner custom content','custom','custom body','published','verified',false)`);
    await client.query(`INSERT INTO garage_service_requests(customer_name,phone,email,zip,service,urgency,preferred_date)
      VALUES ('Fixture Customer','4700000000','customer@example.net','30040','repair','soon','2030-01-01')`);
  } finally {
    client.release();
  }

  await runInSchema(schema, "./scripts/migrate-garage.mjs");
  await run(process.execPath, ["--experimental-strip-types", "./scripts/seed-garage-content.mjs"], {
    cwd: packageRoot,
    env: { ...process.env, PGOPTIONS: `-c search_path=${schema}` },
  });
  const check = await pool.connect();
  try {
    await check.query(`SET search_path TO ${schema}`);
    assert.equal((await check.query("SELECT title FROM garage_content WHERE id='article-balance'")).rows[0].title, "Owner-edited balance article");
    assert.equal((await check.query("SELECT verification_status FROM garage_content WHERE id='article-balance'")).rows[0].verification_status, "verified");
    assert.equal((await check.query("SELECT title FROM garage_content WHERE id='owner-custom'")).rows[0].title, "Owner custom content");
    assert.equal((await check.query("SELECT 1 FROM garage_content WHERE id='article-sensors'")).rowCount, 0);
    assert.equal((await check.query("SELECT count(*)::int count FROM garage_service_requests")).rows[0].count, 1);
    assert.equal((await check.query("SELECT title FROM garage_content WHERE id='service-spring'")).rows[0].title, "Broken Spring Replacement");
    assert.equal((await check.query("SELECT count(*)::int count FROM garage_content WHERE kind='service' AND status='published'")).rows[0].count, 7);
    const before = await check.query("SELECT version,checksum FROM garage_schema_migrations ORDER BY version");
    await runInSchema(schema, "./scripts/migrate-garage.mjs");
    await runInSchema(schema, "./scripts/migrate-garage.mjs");
    const after = await check.query("SELECT version,checksum FROM garage_schema_migrations ORDER BY version");
    assert.deepEqual(after.rows, before.rows);
  } finally {
    check.release();
    await admin.query(`DROP SCHEMA ${schema} CASCADE`);
  }
}

try {
  await freshFixture();
  await existingFixture();
} finally {
  admin.release();
  await pool.end();
}