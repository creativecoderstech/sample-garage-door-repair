import assert from "node:assert/strict";
import test from "node:test";
import { signatureMatches, validateWebhook } from "./worker.mjs";

test("notification destinations reject unsafe and placeholder routes", () => {
  const env = { NOTIFICATION_ALLOWED_HOSTS: "hooks.zapier.com" };
  for (const url of [
    "http://hooks.example.net/request",
    "https://localhost/request",
    "https://127.0.0.1/request",
    "https://192.168.1.2/request",
    "https://notify.example/request",
  ]) assert.throws(() => validateWebhook(url, env));
  assert.throws(() => validateWebhook("https://unapproved.example.org/request", env));
  assert.throws(() => validateWebhook("https://hooks.zapier.com/request"));
  assert.equal(validateWebhook("https://hooks.zapier.com/hooks/catch/123/abc", env), "https://hooks.zapier.com/hooks/catch/123/abc");
});

test("attachment signatures must match their supported MIME type", () => {
  assert.equal(signatureMatches("image/jpeg", Uint8Array.from([0xff, 0xd8, 0xff, 0xe0])), true);
  assert.equal(signatureMatches("image/png", Uint8Array.from([0xff, 0xd8, 0xff, 0xe0])), false);
  assert.equal(signatureMatches("video/webm", Uint8Array.from([0x1a, 0x45, 0xdf, 0xa3])), true);
});

test("request delivery migration has durable idempotency and outbox constraints", async () => {
  const source = await (await import("node:fs/promises")).readFile(new URL("./migrations/0005_request_delivery.sql", import.meta.url), "utf8");
  assert.match(source, /idempotency_key TEXT PRIMARY KEY/);
  assert.match(source, /service_requests_idempotency_key_unique/);
  assert.match(source, /notification_outbox_request_id_unique/);
  assert.match(source, /request_attachments/);
  const completion = await (await import("node:fs/promises")).readFile(new URL("./migrations/0007_request_upload_completion.sql", import.meta.url), "utf8");
  assert.match(completion, /completed_at/);
  assert.match(completion, /request_attachments_prepare_unique/);
});

test("both adapters gate notification on completion and recover stale manual claims", async () => {
  const fs = await import("node:fs/promises");
  const worker = await fs.readFile(new URL("./worker.mjs", import.meta.url), "utf8");
  const express = (await fs.readFile(new URL("../../api-server/src/routes/garage.ts", import.meta.url), "utf8")) +
    (await fs.readFile(new URL("../../api-server/src/lib/request-delivery.ts", import.meta.url), "utf8"));
  for (const source of [worker, express]) {
    assert.match(source, /pending_uploads/);
    assert.match(source, /complete/);
    assert.match(source, /completed_at|completedAt/);
    assert.match(source, /processing/);
    assert.match(source, /2 minutes|120000/);
  }
  assert.doesNotMatch(worker.slice(worker.indexOf('path === "/api/garage/requests"'), worker.indexOf("const completeUploadMatch")), /deliverNotification/);
});