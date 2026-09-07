import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import worker from "./worker.mjs";

class D1Fixture {
  constructor() {
    this.sqlite = new DatabaseSync(":memory:");
  }
  prepare(sql) {
    const fixture = this;
    let values = [];
    return {
      bind(...next) { values = next; return this; },
      first() { return fixture.sqlite.prepare(sql).get(...values) ?? null; },
      all() { return { results: fixture.sqlite.prepare(sql).all(...values) }; },
      run() { const result = fixture.sqlite.prepare(sql).run(...values); return { meta: { changes: result.changes } }; },
    };
  }
  batch(statements) {
    this.sqlite.exec("BEGIN");
    try {
      const results = statements.map((statement, index) => {
        if (this.failBatchAt === index) throw new Error("injected D1 batch failure");
        return statement.run();
      });
      this.sqlite.exec("COMMIT");
      return results;
    } catch (error) {
      this.sqlite.exec("ROLLBACK");
      throw error;
    }
  }
}

class R2Fixture {
  objects = new Map();
  async put(key, bytes, options) {
    const value = bytes instanceof ArrayBuffer ? bytes : await new Response(bytes).arrayBuffer();
    this.objects.set(key, { value, contentType: options?.httpMetadata?.contentType });
  }
  async get(key) {
    const row = this.objects.get(key);
    if (!row) return null;
    return {
      body: row.value,
      size: row.value.byteLength,
      httpMetadata: { contentType: row.contentType },
      arrayBuffer: async () => row.value,
    };
  }
}

async function fixture() {
  const DB = new D1Fixture();
  DB.sqlite.exec(`
    PRAGMA foreign_keys=ON;
    CREATE TABLE service_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT, customer_name TEXT NOT NULL, phone TEXT NOT NULL,
      email TEXT NOT NULL, street_address TEXT NOT NULL, city TEXT NOT NULL, state TEXT NOT NULL,
      zip TEXT NOT NULL, service TEXT NOT NULL, urgency TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'new',
      preferred_date TEXT NOT NULL, preferred_time TEXT NOT NULL, details TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE rate_limits (rate_key TEXT NOT NULL, window_start INTEGER NOT NULL, count INTEGER NOT NULL, PRIMARY KEY(rate_key,window_start));
    CREATE TABLE analytics_events (id INTEGER PRIMARY KEY AUTOINCREMENT, event_name TEXT, path TEXT, created_at TEXT);
    CREATE TABLE garage_staff_access (id TEXT PRIMARY KEY, email TEXT, clerk_user_id TEXT, role TEXT, protected_owner INTEGER DEFAULT 0, redeemed_at TEXT);
    CREATE TABLE garage_auth_bootstrap (environment TEXT PRIMARY KEY, clerk_user_id TEXT, access_id TEXT, claimed_at TEXT);
    CREATE TABLE garage_auth_audit (id INTEGER PRIMARY KEY AUTOINCREMENT, actor_user_id TEXT, actor_role TEXT, action TEXT, resource_type TEXT, resource_id TEXT, changed_fields_json TEXT);
  `);
  DB.sqlite.exec(await readFile(new URL("./migrations/0005_request_delivery.sql", import.meta.url), "utf8"));
  DB.sqlite.exec(await readFile(new URL("./migrations/0007_request_upload_completion.sql", import.meta.url), "utf8"));
  DB.sqlite.prepare("INSERT INTO garage_staff_access(id,email,clerk_user_id,role) VALUES ('staff-1','staff@example.org','google:user-1','staff')").run();
  return { DB, MEDIA: new R2Fixture(), TURNSTILE_SECRET_KEY: "fixture-secret", CLOUDFLARE_ENV: "production", NOTIFICATION_ALLOWED_HOSTS: "receiver.testhost.com", GOOGLE_OAUTH_CLIENT_ID: "request-fixture.apps.googleusercontent.com" };
}

const requestBody = {
  customerName: "Fixture Customer", phone: "7705550100", email: "fixture@example.org",
  streetAddress: "1 Main St", city: "Cumming", state: "GA", zip: "30040",
  service: "repair", urgency: "flexible", preferredDate: "2030-01-01", preferredTime: "", details: "Door is noisy.",
};
const call = (env, path, init = {}) => worker.fetch(new Request(`https://garage.test${path}`, init), env, {});
const b64 = value => Buffer.from(value instanceof Uint8Array ? value : typeof value === "string" ? value : JSON.stringify(value)).toString("base64url");

test("Pages persists and completes a request with blank optional email", async t => {
  const env = await fixture();
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; env.DB.sqlite.close(); });
  globalThis.fetch = async (input, init) => {
    assert.ok(String(input).includes("turnstile"));
    return Response.json({ success: init.body.get("response") === "valid", action: "booking", hostname: "garage.test" });
  };
  const submit = (email = "", key = "request_without_email_0001") => call(env, "/api/garage/requests", {
    method: "POST", headers: { "content-type": "application/json", "idempotency-key": key },
    body: JSON.stringify({ ...requestBody, email, turnstileToken: "valid" }),
  });
  const response = await submit();
  assert.equal(response.status, 201);
  const created = await response.json();
  assert.equal(created.email, "");
  const replay = await submit();
  assert.equal(replay.status, 200);
  assert.equal((await replay.json()).id, created.id);
  assert.equal((await call(env, `/api/garage/request-uploads/${created.id}/complete`, {
    method: "POST", headers: { "x-upload-capability": created.uploadCapability },
  })).status, 200);
  assert.equal(env.DB.sqlite.prepare("SELECT email FROM service_requests WHERE id=?").get(created.id).email, "");
  assert.ok(env.DB.sqlite.prepare("SELECT completed_at FROM request_submissions WHERE request_id=?").get(created.id).completed_at);
  assert.equal(env.DB.sqlite.prepare("SELECT status FROM notification_outbox WHERE request_id=?").get(created.id).status, "unconfigured");
  assert.equal((await submit(null, "request_null_email_000001")).status, 400);
  assert.equal((await submit(123, "request_number_email_001")).status, 400);
  assert.equal(env.DB.sqlite.prepare("SELECT count(*) count FROM service_requests").get().count, 1);
});

async function staffToken() {
  const pair = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: Uint8Array.from([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
  const jwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
  const header = b64({ alg: "RS256", kid: "fixture-key" });
  const claims = b64({ iss: "https://accounts.google.com", aud: "request-fixture.apps.googleusercontent.com", sub: "user-1", email: "staff@example.org", email_verified: true, exp: Math.floor(Date.now() / 1000) + 600 });
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", pair.privateKey, new TextEncoder().encode(`${header}.${claims}`));
  return { token: `${header}.${claims}.${b64(new Uint8Array(signature))}`, jwk: { ...jwk, kid: "fixture-key", alg: "RS256", use: "sig" } };
}

test("Pages handler persists idempotent request and completes attachments before one delivery", async () => {
  const env = await fixture();
  const identity = await staffToken();
  const deliveries = [];
  let receiverFails = false;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.includes("turnstile")) {
      const token = init.body.get("response");
      return Response.json({ success: token === "valid", action: "booking", hostname: "garage.test" });
    }
    if (url === "https://www.googleapis.com/oauth2/v3/certs") return Response.json({ keys: [identity.jwk] });
    if (url.startsWith("https://receiver.testhost.com/")) {
      if (receiverFails) return new Response("fixture failure", { status: 503 });
      deliveries.push(JSON.parse(init.body));
      return new Response(null, { status: 204 });
    }
    throw new Error(`Unexpected external request: ${url}`);
  };
  try {
    const submit = token => call(env, "/api/garage/requests", {
      method: "POST", headers: { "content-type": "application/json", "idempotency-key": "request_fixture_key_0001" },
      body: JSON.stringify({ ...requestBody, ...(token ? { turnstileToken: token } : {}) }),
    });
    assert.equal((await submit()).status, 403);
    assert.equal((await submit("invalid")).status, 403);
    env.DB.failBatchAt = 1;
    assert.equal((await submit("valid")).status, 400);
    assert.equal(env.DB.sqlite.prepare("SELECT count(*) count FROM service_requests").get().count, 0);
    env.DB.failBatchAt = undefined;
    const createdResponse = await submit("valid");
    assert.equal(createdResponse.status, 201);
    const created = await createdResponse.json();
    assert.equal((await submit("valid")).status, 200);
    assert.equal(env.DB.sqlite.prepare("SELECT count(*) count FROM service_requests").get().count, 1);
    assert.equal(env.DB.sqlite.prepare("SELECT count(*) count FROM request_submissions").get().count, 1);
    assert.equal(env.DB.sqlite.prepare("SELECT count(*) count FROM notification_outbox").get().count, 1);
    assert.equal(deliveries.length, 0);

    const prepareHeaders = { "content-type": "application/json", "x-upload-capability": created.uploadCapability, "idempotency-key": "selected_photo_key_0001" };
    const metadata = JSON.stringify({ originalName: "door.jpg", contentType: "image/jpeg", byteSize: 4 });
    const preparedResponse = await call(env, `/api/garage/request-uploads/${created.id}/prepare`, { method: "POST", headers: prepareHeaders, body: metadata });
    const prepared = await preparedResponse.json();
    const replay = await (await call(env, `/api/garage/request-uploads/${created.id}/prepare`, { method: "POST", headers: prepareHeaders, body: metadata })).json();
    assert.equal(replay.attachmentId, prepared.attachmentId);
    assert.equal((await call(env, `/api/garage/request-uploads/${created.id}/complete`, { method: "POST", headers: { "x-upload-capability": created.uploadCapability } })).status, 409);
    assert.equal(deliveries.length, 0);

    const bytes = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]);
    const uploaded = await call(env, prepared.uploadUrl, { method: "PUT", headers: { ...prepared.headers, "content-length": "4" }, body: bytes });
    assert.equal(uploaded.status, 200);
    const replayUploaded = await (await call(env, `/api/garage/request-uploads/${created.id}/prepare`, { method: "POST", headers: prepareHeaders, body: metadata })).json();
    assert.equal(replayUploaded.status, "uploaded");

    env.DB.sqlite.prepare("INSERT INTO notification_settings (id,webhook_url,enabled,destination_verified) VALUES (1,?,1,1)").run("https://receiver.testhost.com/request");
    assert.equal((await call(env, `/api/garage/request-uploads/${created.id}/complete`, { method: "POST", headers: { "x-upload-capability": created.uploadCapability } })).status, 200);
    assert.equal(deliveries.length, 1);
    assert.equal(deliveries[0].request.attachments.length, 1);
    await call(env, `/api/garage/request-uploads/${created.id}/complete`, { method: "POST", headers: { "x-upload-capability": created.uploadCapability } });
    assert.equal(deliveries.length, 1);
    assert.equal((await call(env, `/api/garage/request-uploads/${created.id}/prepare`, { method: "POST", headers: { ...prepareHeaders, "idempotency-key": "selected_photo_key_0002" }, body: metadata })).status, 403);

    const auth = { authorization: `Bearer ${identity.token}` };
    env.DB.sqlite.prepare("UPDATE notification_outbox SET status='failed' WHERE request_id=?").run(created.id);
    receiverFails = true;
    assert.equal((await call(env, `/api/garage/requests/${created.id}/notify`, { method: "POST", headers: auth })).status, 200);
    assert.equal(env.DB.sqlite.prepare("SELECT status FROM notification_outbox WHERE request_id=?").get(created.id).status, "failed");
    receiverFails = false;
    const concurrent = await Promise.all([
      call(env, `/api/garage/requests/${created.id}/notify`, { method: "POST", headers: auth }),
      call(env, `/api/garage/requests/${created.id}/notify`, { method: "POST", headers: auth }),
    ]);
    assert.deepEqual(concurrent.map(response => response.status).sort(), [200, 409]);
    env.DB.sqlite.prepare("UPDATE notification_outbox SET status='processing',updated_at=? WHERE request_id=?").run(new Date(Date.now() - 180000).toISOString(), created.id);
    assert.equal((await call(env, `/api/garage/requests/${created.id}/notify`, { method: "POST", headers: auth })).status, 200);

    env.DB.sqlite.prepare("UPDATE request_submissions SET created_at=? WHERE request_id=?").run(new Date(Date.now() - 3600001).toISOString(), created.id);
    assert.equal((await call(env, `/api/garage/request-uploads/${created.id}/complete`, { method: "POST", headers: { "x-upload-capability": created.uploadCapability } })).status, 403);

    const raceResponse = await call(env, "/api/garage/requests", {
      method: "POST", headers: { "content-type": "application/json", "idempotency-key": "request_fixture_key_0002", "cf-connecting-ip": "203.0.113.22" },
      body: JSON.stringify({ ...requestBody, turnstileToken: "valid" }),
    });
    const raceRequest = await raceResponse.json();
    const [racePrepare, raceComplete] = await Promise.all([
      call(env, `/api/garage/request-uploads/${raceRequest.id}/prepare`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-upload-capability": raceRequest.uploadCapability, "idempotency-key": "race_photo_prepare_key_01" },
        body: metadata,
      }),
      call(env, `/api/garage/request-uploads/${raceRequest.id}/complete`, { method: "POST", headers: { "x-upload-capability": raceRequest.uploadCapability } }),
    ]);
    assert.ok((racePrepare.status === 201 && raceComplete.status === 409) || ([403, 409].includes(racePrepare.status) && raceComplete.status === 200), `prepare=${racePrepare.status} complete=${raceComplete.status}`);
    const raceState = env.DB.sqlite.prepare("SELECT completed_at FROM request_submissions WHERE request_id=?").get(raceRequest.id);
    const racePending = env.DB.sqlite.prepare("SELECT count(*) count FROM request_attachments WHERE request_id=? AND status='pending'").get(raceRequest.id).count;
    assert.ok(!raceState.completed_at || racePending === 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});