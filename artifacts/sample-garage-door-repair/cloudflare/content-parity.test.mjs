import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import worker, { getPublicContent, publicSettings } from "./worker.mjs";

class D1Statement {
  constructor(database, sql, values = []) { this.database = database; this.sql = sql; this.values = values; }
  bind(...values) { return new D1Statement(this.database, this.sql, values); }
  first() { return this.database.prepare(this.sql).get(...this.values) ?? null; }
  all() { return { results: this.database.prepare(this.sql).all(...this.values) }; }
  run() {
    const result = this.database.prepare(this.sql).run(...this.values);
    return { meta: { changes: result.changes, last_row_id: Number(result.lastInsertRowid) } };
  }
}

async function fixture() {
  const database = new DatabaseSync(":memory:");
  for (const name of ["0001_garage_production.sql", "0002_garage_content.sql"]) {
    database.exec(await readFile(new URL(`./migrations/${name}`, import.meta.url), "utf8"));
  }
  return { database, env: { LOCAL_DEMO_ADMIN: "true", DB: { prepare: sql => new D1Statement(database, sql) } } };
}

test("D1 migrations seed the full safe content architecture", async () => {
  const { database, env } = await fixture();
  assert.equal(database.prepare("SELECT count(*) AS count FROM garage_content").get().count, 32);
  const publicRows = await getPublicContent(env);
  assert.ok(publicRows.some(row => row.slug === "home"));
  assert.equal(publicRows.some(row => row.kind === "trust"), false);
  assert.match(publicRows.find(row => row.kind === "location").body, /Coverage, scheduling, products, pricing/);
  assert.equal(publicRows.filter(row => row.kind === "service").length, 6);
  assert.deepEqual(new Set(publicRows.filter(row => row.kind === "service").map(row => row.serviceCode)), new Set(["springs", "opener", "repair", "installation", "maintenance"]));
  assert.deepEqual(publicRows.find(row => row.slug === "broken-spring").aliases, []);
});

test("content edits preserve detail aliases and reject core deletion", async () => {
  const { env } = await fixture();
  const current = (await env.DB.prepare("SELECT * FROM garage_content WHERE id='article-balance'").first());
  const body = {
    ...Object.fromEntries(Object.entries(current).filter(([key]) => !["id", "aliases_json", "updated_at"].includes(key))),
    kind: current.kind, slug: "door-balance-explained", aliases: [], title: current.title,
    imageUrl: current.image_url, imageAlt: current.image_alt, beforeImageUrl: current.before_image_url,
    seoTitle: current.seo_title, seoDescription: current.seo_description, parentId: current.parent_id,
    sortOrder: current.sort_order, verificationStatus: current.verification_status,
    featured: current.featured === 1, serviceCode: current.service_code,
  };
  for (const key of ["image_url", "image_alt", "before_image_url", "seo_title", "seo_description", "parent_id", "sort_order", "verification_status", "service_code"]) delete body[key];
  const updated = await worker.fetch(new Request("http://localhost/api/garage/admin/content/article-balance", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }), env, { waitUntil() {} });
  assert.equal(updated.status, 200);
  assert.deepEqual((await updated.json()).aliases, ["why-door-balance-matters"]);
  assert.equal((await getPublicContent(env)).some(item => item.id === "article-balance"), false);
  const deleted = await worker.fetch(new Request("http://localhost/api/garage/admin/content/page-home", { method: "DELETE" }), env, { waitUntil() {} });
  assert.equal(deleted.status, 409);
});

test("unverified public settings fail closed", () => {
  const result = publicSettings({ verified: 0, settings_json: JSON.stringify({ phone: "not-public", serviceArea: "Claimed area", trustProfile: { warranty: "Claimed" } }) });
  assert.equal(result.phone, "");
  assert.equal(result.serviceArea, "Service area awaiting verification");
  assert.equal(result.trustProfile.warranty, null);
});

test("prefixed API and request-time HTML use the safe D1 projections", async () => {
  const { env } = await fixture();
  env.ASSETS = {
    fetch: () => new Response("<!doctype html><html><head><title>stale</title></head><body>app</body></html>", { headers: { "content-type": "text/html" } }),
  };
  const api = await worker.fetch(new Request("https://example.test/sample-garage-door-repair/api/garage/content"), env, { waitUntil() {} });
  assert.equal(api.status, 200);
  assert.ok((await api.json()).some(item => item.slug === "home"));
  const legacy = await worker.fetch(new Request("https://example.test/sample-garage-door-repair/services"), env, { waitUntil() {} });
  assert.equal(legacy.status, 301);
  assert.equal(legacy.headers.get("location"), "https://example.test/services");
  const html = await worker.fetch(new Request(legacy.headers.get("location")), env, { waitUntil() {} });
  assert.equal(html.status, 200);
  assert.match(await html.text(), /Garage Door Service Guides/);
  assert.equal(html.headers.get("x-robots-tag"), "noindex, nofollow, noarchive");
});

test("saved settings publish only after explicit verification acknowledgement", async () => {
  const { env } = await fixture();
  const rejected = await worker.fetch(new Request("http://localhost/api/garage/settings", { method: "PATCH", body: JSON.stringify({ businessName: "Verified Example", phone: "404-555-0100", verificationStatus: "verified" }) }), env, { waitUntil() {} });
  assert.equal(rejected.status, 400);
  const saved = await worker.fetch(new Request("http://localhost/api/garage/settings", { method: "PATCH", body: JSON.stringify({ businessName: "Verified Example", phone: "404-555-0100", verificationStatus: "verified", verificationAcknowledged: true }) }), env, { waitUntil() {} });
  assert.equal(saved.status, 200);
  const publicResponse = await worker.fetch(new Request("https://example.test/api/garage/site-settings"), env, { waitUntil() {} });
  const settings = await publicResponse.json();
  assert.equal(settings.businessName, "Verified Example");
  assert.equal(settings.phone, "404-555-0100");
  const themeOnly = await worker.fetch(new Request("http://localhost/api/garage/settings", { method: "PATCH", body: JSON.stringify({ theme: "classic" }) }), env, { waitUntil() {} });
  assert.equal((await themeOnly.json()).verificationStatus, "verified");
  const sensitiveWithoutAcknowledgement = await worker.fetch(new Request("http://localhost/api/garage/settings", { method: "PATCH", body: JSON.stringify({ phone: "404-555-0199" }) }), env, { waitUntil() {} });
  assert.equal((await sensitiveWithoutAcknowledgement.json()).verificationStatus, "unverified");
  const hidden = await worker.fetch(new Request("https://example.test/api/garage/site-settings"), env, { waitUntil() {} });
  assert.equal((await hidden.json()).phone, "");
  const reverification = await worker.fetch(new Request("http://localhost/api/garage/settings", { method: "PATCH", body: JSON.stringify({ verificationStatus: "verified", verificationAcknowledged: true }) }), env, { waitUntil() {} });
  assert.equal((await reverification.json()).verificationStatus, "verified");
});

test("public deployments deny staff reads and writes, even with a mistaken local-demo binding", async () => {
  const { env } = await fixture();
  for (const bindings of [env, { ...env, LOCAL_DEMO_ADMIN: undefined }]) {
    for (const [path, method] of [
      ["/admin/content", "GET"], ["/admin/content", "POST"],
      ["/admin/content/page-home", "PUT"], ["/admin/content/page-home", "DELETE"],
      ["/settings", "GET"], ["/settings", "PATCH"], ["/requests", "GET"],
      ["/requests/1", "PATCH"], ["/dashboard", "GET"], ["/media", "POST"],
    ]) {
      const response = await worker.fetch(new Request(`https://example.test/api/garage${path}`, { method }), bindings, { waitUntil() {} });
      assert.equal(response.status, 403, `${method} ${path}`);
    }
    const publicContent = await worker.fetch(new Request("https://example.test/api/garage/content"), bindings, { waitUntil() {} });
    assert.equal(publicContent.status, 200);
  }
});