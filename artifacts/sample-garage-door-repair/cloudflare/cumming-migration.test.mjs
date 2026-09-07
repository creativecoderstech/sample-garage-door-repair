import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { publicSettings } from "./worker.mjs";

const migrations = (await readdir(new URL("./migrations/", import.meta.url)))
  .filter(name => /^\d{4}_.+\.sql$/.test(name)).sort();
const sql = async (name) => readFile(new URL(`./migrations/${name}`, import.meta.url), "utf8");

test("fresh D1 launch migration has seven commercial services and legal pages", async () => {
  const database = new DatabaseSync(":memory:");
  for (const migration of migrations) database.exec(await sql(migration));
  const services = database.prepare("SELECT slug,title FROM garage_content WHERE kind='service' AND status='published' ORDER BY sort_order").all();
  assert.equal(services.length, 7);
  assert.deepEqual(services.map((row) => row.title), [
    "Garage Door Repair",
    "Broken Spring Replacement",
    "Cable, Roller & Off-Track Repair",
    "Garage Door Opener Repair & Installation",
    "New Garage Door Installation",
    "Garage Door Maintenance & Tune-Ups",
    "Commercial Garage Door Services",
  ]);
  assert.ok(database.prepare("SELECT 1 FROM garage_content WHERE kind='page' AND slug='privacy'").get());
  assert.ok(database.prepare("SELECT 1 FROM garage_content WHERE kind='page' AND slug='request-terms'").get());
  const settingsRow = database.prepare("SELECT * FROM business_settings WHERE id=1").get();
  assert.equal(settingsRow.verified, 0);
  const projected = publicSettings(settingsRow);
  assert.equal(projected.businessName, "Cumming Garage Door Service");
  assert.equal(projected.phone, "");
  assert.equal(projected.email, "");
  assert.equal(projected.exampleDetails.phone, "(470) 555-0147");
  assert.equal(projected.launchReady, false);
});

test("existing D1 launch migration preserves owner edits, deletion, verification, and requests", async () => {
  const database = new DatabaseSync(":memory:");
  database.exec(await sql(migrations[0]));
  database.exec(await sql(migrations[1]));
  database.prepare("UPDATE garage_content SET title='Owner spring page',reviewed_seed=0,verification_status='verified' WHERE id='service-spring'").run();
  database.prepare("DELETE FROM garage_content WHERE id='article-sensors'").run();
  database.prepare("INSERT INTO service_requests(customer_name,phone,email,zip,service,urgency,preferred_date) VALUES ('Customer','4700000000','customer@example.net','30040','repair','soon','2030-01-01')").run();
  for (const migration of migrations.slice(2)) database.exec(await sql(migration));
  assert.equal(database.prepare("SELECT title FROM garage_content WHERE id='service-spring'").get().title, "Owner spring page");
  assert.equal(database.prepare("SELECT verification_status FROM garage_content WHERE id='service-spring'").get().verification_status, "verified");
  assert.equal(database.prepare("SELECT 1 FROM garage_content WHERE id='article-sensors'").get(), undefined);
  assert.equal(database.prepare("SELECT count(*) count FROM service_requests").get().count, 1);
});