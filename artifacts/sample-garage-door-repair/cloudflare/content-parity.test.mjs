import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import worker, { getPublicContent, publicSettings } from "./worker.mjs";

class D1 {
  constructor() { this.sqlite = new DatabaseSync(":memory:"); this.tail = Promise.resolve(); }
  exec(sql) { this.sqlite.exec(sql); }
  prepare(sql) {
    const database = this.sqlite;
    return {
      values: [],
      bind(...values) { this.values = values; return this; },
      async first() { return database.prepare(sql).get(...this.values) ?? null; },
      async all() { return { results: database.prepare(sql).all(...this.values) }; },
      async run() {
        const result = database.prepare(sql).run(...this.values);
        return { meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) } };
      },
    };
  }
  async batch(statements) {
    const execute = async () => {
      this.sqlite.exec("BEGIN IMMEDIATE");
      try {
        const results = [];
        for (const statement of statements) results.push(await statement.run());
        this.sqlite.exec("COMMIT");
        return results;
      } catch (error) {
        this.sqlite.exec("ROLLBACK");
        throw error;
      }
    };
    const result = this.tail.then(execute, execute);
    this.tail = result.catch(() => {});
    return result;
  }
}

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwk = publicKey.export({ format: "jwk" });
Object.assign(jwk, { kid: "content-fixture", alg: "RS256" });
const publishableKey = `pk_test_${Buffer.from("content-auth.fixture$").toString("base64")}`;
const now = () => Math.floor(Date.now() / 1000);
const token = () => {
  const header = Buffer.from(JSON.stringify({ alg: "RS256", kid: jwk.kid, typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    iss: "https://content-auth.fixture", sub: "content_owner", exp: now() + 300,
    nbf: now() - 1, azp: "https://staff.fixture",
  })).toString("base64url");
  return `${header}.${payload}.${sign("RSA-SHA256", Buffer.from(`${header}.${payload}`), privateKey).toString("base64url")}`;
};
const owner = {
  id: "content_owner",
  primary_email_address_id: "primary",
  email_addresses: [{ id: "primary", email_address: "creativecoderstech@gmail.com", verification: { status: "verified" } }],
  external_accounts: [{ provider: "oauth_google", email_address: "creativecoderstech@gmail.com", verification: { status: "verified" } }],
};
const originalFetch = globalThis.fetch;
globalThis.fetch = async input => {
  const url = String(input);
  if (url.endsWith("/.well-known/jwks.json")) return Response.json({ keys: [jwk] });
  if (url.endsWith("/v1/users/content_owner")) return Response.json(owner);
  return new Response("missing", { status: 404 });
};
test.after(() => { globalThis.fetch = originalFetch; });

const migrationNames = (await readdir(new URL("./migrations/", import.meta.url)))
  .filter(name => /^\d{4}_.+\.sql$/.test(name)).sort();

async function fixture() {
  const DB = new D1();
  for (const name of migrationNames) DB.exec(await readFile(new URL(`./migrations/${name}`, import.meta.url), "utf8"));
  return {
    database: DB.sqlite,
    env: {
      DB,
      CLERK_SECRET_KEY: "sk_test_content_fixture",
      CLERK_PUBLISHABLE_KEY: publishableKey,
      GARAGE_BOOTSTRAP_EMAIL: "creativecoderstech@gmail.com",
      ENVIRONMENT: "development",
    },
  };
}
const context = { waitUntil() {} };
const adminRequest = (path, options = {}) => new Request(`https://staff.fixture${path}`, {
  ...options,
  headers: {
    ...(options.body ? { "content-type": "application/json" } : {}),
    cookie: `__session=${token()}`,
    origin: "https://staff.fixture",
    ...options.headers,
  },
});
const adminFetch = (env, path, options) => worker.fetch(adminRequest(path, options), env, context);

test("all D1 migrations expose the reviewed commercial catalog and verified-only locations", async () => {
  const { database, env } = await fixture();
  const publicRows = await getPublicContent(env);
  assert.equal(publicRows.filter(row => row.kind === "service").length, 7);
  assert.deepEqual(publicRows.filter(row => row.kind === "service").map(row => row.title), [
    "Garage Door Repair", "Broken Spring Replacement", "Cable, Roller & Off-Track Repair",
    "Garage Door Opener Repair & Installation", "New Garage Door Installation",
    "Garage Door Maintenance & Tune-Ups", "Commercial Garage Door Services",
  ]);
  assert.equal(publicRows.some(row => row.kind === "location"), false);
  assert.equal(publicRows.some(row => row.kind === "trust"), false);
  assert.ok(publicRows.some(row => row.slug === "privacy"));
  assert.ok(publicRows.some(row => row.slug === "request-terms"));
  assert.equal(database.prepare("SELECT count(*) count FROM garage_staff_access").get().count, 0);
});

test("signed Google admin performs edit, publish, unpublish, alias, and deletion boundaries", async () => {
  const { env } = await fixture();
  assert.equal((await adminFetch(env, "/api/garage/admin/session")).status, 200);
  const list = await adminFetch(env, "/api/garage/admin/content");
  assert.equal(list.status, 200);
  const article = (await list.json()).find(item => item.id === "article-balance");
  const editedInput = {
    ...article,
    slug: "door-balance-explained",
    title: "Owner-edited Door Balance",
    status: "published",
    verificationStatus: "verified",
    verificationAcknowledged: true,
  };
  delete editedInput.id; delete editedInput.reviewedSeed; delete editedInput.updatedAt;
  let response = await adminFetch(env, "/api/garage/admin/content/article-balance", {
    method: "PUT", body: JSON.stringify(editedInput),
  });
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).aliases, ["why-door-balance-matters"]);
  assert.ok((await getPublicContent(env)).some(item => item.id === "article-balance"));

  response = await adminFetch(env, "/api/garage/admin/content/article-balance", {
    method: "PUT", body: JSON.stringify({ ...editedInput, status: "draft" }),
  });
  assert.equal(response.status, 200);
  assert.equal((await getPublicContent(env)).some(item => item.id === "article-balance"), false);
  response = await adminFetch(env, "/api/garage/admin/content/article-balance", {
    method: "PUT", body: JSON.stringify(editedInput),
  });
  assert.equal(response.status, 200);

  assert.equal((await adminFetch(env, "/api/garage/admin/content/page-home", { method: "DELETE" })).status, 409);
  assert.equal((await adminFetch(env, "/api/garage/admin/content/article-balance", { method: "DELETE" })).status, 204);
  assert.equal((await adminFetch(env, "/api/garage/admin/content/article-balance", { method: "DELETE" })).status, 404);
});

test("claim projection publishes only genuine verified facts and keeps reserved examples non-actionable", async () => {
  const { env } = await fixture();
  const initial = await worker.fetch(new Request("https://staff.fixture/api/garage/site-settings"), env, context);
  const examples = await initial.json();
  assert.equal(examples.businessName, "Cumming Garage Door Service");
  assert.equal(examples.phone, "");
  assert.equal(examples.email, "");
  assert.equal(examples.exampleDetails.phone, "(470) 555-0147");
  assert.equal(examples.launchReady, false);

  const update = {
    phone: "(470) 123-4567",
    email: "service@cummingdoors.test",
    hours: "Monday-Friday 8am-6pm",
    coverage: "Cumming, Georgia",
    serviceArea: "Cumming, Georgia",
    claimVerification: {
      phone: { status: "verified", isExample: false, verifiedAt: null },
      email: { status: "verified", isExample: false, verifiedAt: null },
      hours: { status: "verified", isExample: false, verifiedAt: null },
      coverage: { status: "verified", isExample: false, verifiedAt: null },
    },
  };
  assert.equal((await adminFetch(env, "/api/garage/settings", { method: "PATCH", body: JSON.stringify(update) })).status, 200);
  const projected = await (await worker.fetch(new Request("https://staff.fixture/api/garage/site-settings"), env, context)).json();
  assert.equal(projected.phone, update.phone);
  assert.equal(projected.email, update.email);
  assert.equal(projected.hours, update.hours);
  assert.equal(projected.coverage, update.coverage);
  assert.equal(projected.launchReady, false);

  const reserved = publicSettings({ settings_json: JSON.stringify({
    ...update,
    businessName: "Cumming Garage Door Service",
    phone: "(470) 555-0147",
    email: "service@cumminggaragedoor.example",
    claimVerification: {
      phone: { status: "verified", isExample: false },
      email: { status: "verified", isExample: false },
    },
  }), verified: 1 });
  assert.equal(reserved.phone, "");
  assert.equal(reserved.email, "");
});

test("preview HTML and prefixed public API are noindex and use current projections", async () => {
  const { env } = await fixture();
  env.ASSETS = { fetch: () => new Response("<!doctype html><html><head><title>stale</title></head><body>app</body></html>", { headers: { "content-type": "text/html" } }) };
  const api = await worker.fetch(new Request("https://branch.pages.dev/sample-garage-door-repair/api/garage/content"), env, context);
  assert.equal(api.status, 200);
  assert.equal((await api.json()).filter(item => item.kind === "service").length, 7);
  const redirect = await worker.fetch(new Request("https://branch.pages.dev/sample-garage-door-repair/services"), env, context);
  assert.equal(redirect.status, 301);
  const html = await worker.fetch(new Request(redirect.headers.get("location")), env, context);
  assert.equal(html.status, 200);
  assert.equal(html.headers.get("x-robots-tag"), "noindex, nofollow, noarchive");
  const body = await html.text();
  assert.match(body, /noindex/);
  assert.match(body, /Cumming Garage Door Service/);
});

test("anonymous and missing-config private API states fail explicitly while public reads remain available", async () => {
  const { env } = await fixture();
  for (const [path, method] of [
    ["/api/garage/admin/content", "GET"],
    ["/api/garage/admin/content/page-home", "PUT"],
    ["/api/garage/settings", "GET"],
    ["/api/garage/requests", "GET"],
    ["/api/garage/dashboard", "GET"],
    ["/api/garage/media", "POST"],
  ]) {
    const anonymous = await worker.fetch(new Request(`https://staff.fixture${path}`, { method }), env, context);
    assert.equal(anonymous.status, 401, `${method} ${path}`);
    const missing = await worker.fetch(new Request(`https://staff.fixture${path}`, { method }), {
      ...env, CLERK_SECRET_KEY: undefined, CLERK_PUBLISHABLE_KEY: undefined,
    }, context);
    assert.equal(missing.status, 503, `missing config ${method} ${path}`);
  }
  assert.equal((await worker.fetch(new Request("https://staff.fixture/api/garage/content"), env, context)).status, 200);
  assert.equal((await worker.fetch(new Request("https://staff.fixture/api/garage/site-settings"), env, context)).status, 200);
});