import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import pg from "../../../../lib/db/node_modules/pg/lib/index.js";

test("development Express API persists idempotent request and private upload lifecycle", async t => {
  const schema = `request_lifecycle_${randomUUID().replaceAll("-", "")}`;
  const admin = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  await admin.query(`CREATE SCHEMA ${schema}`);
  t.after(async () => {
    await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await admin.end();
  });
  const scoped = new URL(process.env.DATABASE_URL);
  scoped.searchParams.set("options", `-csearch_path=${schema}`);
  process.env.DATABASE_URL = scoped.toString();
  process.env.NODE_ENV = "development";
  delete process.env.TURNSTILE_SECRET_KEY;
  process.env.PRIVATE_OBJECT_DIR = "/fixture/private";

  await admin.query(`
    CREATE TABLE ${schema}.garage_service_requests (
      id serial PRIMARY KEY, customer_name text NOT NULL, phone text NOT NULL, email text NOT NULL,
      street_address text NOT NULL DEFAULT '', city text NOT NULL DEFAULT '', state text NOT NULL DEFAULT 'GA',
      zip text NOT NULL, service text NOT NULL, urgency text NOT NULL, status text NOT NULL DEFAULT 'new',
      preferred_date text NOT NULL, preferred_time text NOT NULL DEFAULT '', details text NOT NULL DEFAULT '',
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE ${schema}.garage_request_submissions (
      idempotency_key text PRIMARY KEY, request_id integer NOT NULL UNIQUE,
      upload_capability text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz
    );
    CREATE TABLE ${schema}.garage_request_attachments (
      id text PRIMARY KEY, request_id integer NOT NULL, object_key text NOT NULL UNIQUE,
      original_name text NOT NULL, content_type text NOT NULL, byte_size integer NOT NULL,
      prepare_key text NOT NULL, status text NOT NULL DEFAULT 'pending', created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(request_id,prepare_key)
    );
    CREATE TABLE ${schema}.garage_notification_settings (
      id integer PRIMARY KEY, webhook_url text, enabled boolean NOT NULL DEFAULT false,
      destination_verified boolean NOT NULL DEFAULT false, tested_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE ${schema}.garage_notification_outbox (
      id text PRIMARY KEY, request_id integer NOT NULL UNIQUE, status text NOT NULL, attempts integer NOT NULL DEFAULT 0,
      last_error text, delivered_at timestamptz, next_attempt_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE ${schema}.garage_persistent_rate_limits (
      rate_key text NOT NULL, window_start integer NOT NULL, count integer NOT NULL DEFAULT 0, PRIMARY KEY(rate_key,window_start)
    );
  `);

  const originalFetch = globalThis.fetch;
  const objects = new Map();
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    if (url === "http://127.0.0.1:1106/object-storage/signed-object-url") {
      const body = JSON.parse(init.body);
      return Response.json({ signed_url: `https://storage.fixture/${encodeURIComponent(body.object_name)}?method=${body.method}` });
    }
    if (url.startsWith("https://storage.fixture/")) {
      const parsed = new URL(url), key = decodeURIComponent(parsed.pathname.slice(1)), method = init.method || parsed.searchParams.get("method");
      if (method === "PUT") {
        const bytes = await new Response(init.body).arrayBuffer();
        objects.set(key, { bytes, type: new Headers(init.headers).get("content-type") });
        return new Response(null, { status: 200 });
      }
      const object = objects.get(key);
      if (!object) return new Response(null, { status: 404 });
      if (method === "HEAD") return new Response(null, { headers: { "content-length": String(object.bytes.byteLength), "content-type": object.type } });
      if (new Headers(init.headers).get("range") === "bytes=0-15") {
        const bytes = object.bytes.slice(0, 16);
        return new Response(bytes, { status: 206, headers: {
          "content-type": object.type,
          "content-length": String(bytes.byteLength),
          "content-range": `bytes 0-${bytes.byteLength - 1}/${object.bytes.byteLength}`,
        } });
      }
      return new Response(object.bytes, { headers: { "content-type": object.type } });
    }
    return originalFetch(input, init);
  };
  t.after(() => { globalThis.fetch = originalFetch; });

  const { default: app } = await import("../app.ts");
  const server = await new Promise(resolve => {
    const listening = app.listen(0, () => resolve(listening));
  });
  t.after(() => server.close());
  const base = `http://127.0.0.1:${server.address().port}`;
  const body = {
    customerName: "Fixture Customer", phone: "7705550100", email: "fixture@example.org",
    streetAddress: "1 Main St", city: "Cumming", state: "GA", zip: "30040",
    service: "repair", urgency: "flexible", preferredDate: "2030-01-01", preferredTime: "", details: "Door is noisy.",
  };
  const submit = () => originalFetch(`${base}/api/garage/requests`, {
    method: "POST", headers: { "content-type": "application/json", "idempotency-key": "express_request_fixture_0001" }, body: JSON.stringify(body),
  });
  const createdResponse = await submit();
  assert.equal(createdResponse.status, 201);
  const created = await createdResponse.json();
  assert.equal((await submit()).status, 200);
  assert.equal((await admin.query(`SELECT count(*) count FROM ${schema}.garage_service_requests`)).rows[0].count, "1");
  assert.equal((await admin.query(`SELECT status FROM ${schema}.garage_notification_outbox`)).rows[0].status, "pending_uploads");

  const metadata = { originalName: "door.jpg", contentType: "image/jpeg", byteSize: 4 };
  const prepare = () => originalFetch(`${base}/api/garage/request-uploads/${created.id}/prepare`, {
    method: "POST", headers: { "content-type": "application/json", "x-upload-capability": created.uploadCapability, "idempotency-key": "express_selected_photo_01" }, body: JSON.stringify(metadata),
  });
  const prepared = await (await prepare()).json();
  assert.equal((await (await prepare()).json()).attachmentId, prepared.attachmentId);
  assert.equal((await originalFetch(`${base}/api/garage/request-uploads/${created.id}/complete`, { method: "POST", headers: { "x-upload-capability": created.uploadCapability } })).status, 409);
  await globalThis.fetch(prepared.uploadUrl, { method: "PUT", headers: prepared.headers, body: Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]) });
  assert.equal((await originalFetch(`${base}/api/garage/request-uploads/${created.id}/attachments/${prepared.attachmentId}/finalize`, { method: "POST", headers: { "x-upload-capability": created.uploadCapability } })).status, 200);
  assert.equal((await originalFetch(`${base}/api/garage/request-uploads/${created.id}/complete`, { method: "POST", headers: { "x-upload-capability": created.uploadCapability } })).status, 200);
  const inbox = await admin.query(`SELECT s.completed_at,o.status,a.status attachment_status FROM ${schema}.garage_request_submissions s JOIN ${schema}.garage_notification_outbox o ON o.request_id=s.request_id JOIN ${schema}.garage_request_attachments a ON a.request_id=s.request_id`);
  assert.ok(inbox.rows[0].completed_at);
  assert.equal(inbox.rows[0].status, "unconfigured");
  assert.equal(inbox.rows[0].attachment_status, "uploaded");

  const submitWithoutEmail = () => originalFetch(`${base}/api/garage/requests`, {
    method: "POST", headers: { "content-type": "application/json", "idempotency-key": "express_request_without_email_01" },
    body: JSON.stringify({ ...body, email: "" }),
  });
  const withoutEmailResponse = await submitWithoutEmail();
  assert.equal(withoutEmailResponse.status, 201);
  const withoutEmail = await withoutEmailResponse.json();
  assert.equal(withoutEmail.email, "");
  const withoutEmailReplay = await submitWithoutEmail();
  assert.equal(withoutEmailReplay.status, 200);
  assert.equal((await withoutEmailReplay.json()).id, withoutEmail.id);
  assert.equal((await originalFetch(`${base}/api/garage/request-uploads/${withoutEmail.id}/complete`, {
    method: "POST", headers: { "x-upload-capability": withoutEmail.uploadCapability },
  })).status, 200);
  const blankEmailInbox = await admin.query(`SELECT r.email,s.completed_at,o.status FROM ${schema}.garage_service_requests r JOIN ${schema}.garage_request_submissions s ON s.request_id=r.id JOIN ${schema}.garage_notification_outbox o ON o.request_id=r.id WHERE r.id=$1`, [withoutEmail.id]);
  assert.equal(blankEmailInbox.rows.length, 1);
  assert.equal(blankEmailInbox.rows[0].email, "");
  assert.ok(blankEmailInbox.rows[0].completed_at);
  assert.equal(blankEmailInbox.rows[0].status, "unconfigured");
});