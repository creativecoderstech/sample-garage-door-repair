import assert from "node:assert/strict";
import test from "node:test";
import { requireTrustedClerkProxyOrigin, requireTrustedStaffOrigin, trustedStaffOrigins } from "./staffOriginMiddleware.ts";
import { getClerkProxyHost } from "./clerkProxyMiddleware.ts";

function invoke(origin, authorization = "") {
  let status = 200, body, next = false;
  const req = { headers: { ...(origin ? { origin } : {}), ...(authorization ? { authorization } : {}) } };
  const res = {
    status(value) { status = value; return this; },
    json(value) { body = value; return this; },
  };
  requireTrustedStaffOrigin(req, res, () => { next = true; });
  return { status, body, next };
}

function invokeProxy(method, origin) {
  let status = 200, next = false;
  const req = { method, headers: origin ? { origin } : {} };
  const res = { status(value) { status = value; return this; }, json() { return this; } };
  requireTrustedClerkProxyOrigin(req, res, () => { next = true; });
  return { status, next };
}

test("authenticated hostile browser origins cannot reach private read or mutation handlers", () => {
  process.env.PUBLIC_SITE_ORIGIN = "https://garage.example";
  process.env.REPLIT_DEV_DOMAIN = "garage-dev.replit.dev";
  for (const origin of ["https://attacker.example", "null", "https://garage.example.attacker.test"]) {
    const result = invoke(origin, "Bearer authenticated-fixture");
    assert.equal(result.status, 403);
    assert.equal(result.next, false);
  }
});

test("configured production/development origins and origin-less bearer clients continue", () => {
  process.env.PUBLIC_SITE_ORIGIN = "https://garage.example/path-is-normalized";
  process.env.REPLIT_DEV_DOMAIN = "garage-dev.replit.dev";
  assert.deepEqual([...trustedStaffOrigins()].sort(), ["https://garage-dev.replit.dev", "https://garage.example"]);
  assert.equal(invoke("https://garage.example").next, true);
  assert.equal(invoke("https://garage-dev.replit.dev").next, true);
  assert.equal(invoke(undefined, "Bearer authenticated-fixture").next, true);
});

test("forwarded and Host headers never add trusted origins", () => {
  process.env.PUBLIC_SITE_ORIGIN = "https://garage.example";
  const result = invoke("https://spoofed.example");
  assert.equal(result.status, 403);
  assert.equal(trustedStaffOrigins().has("https://spoofed.example"), false);
  assert.equal(getClerkProxyHost({ headers: { host: "spoofed.example", "x-forwarded-host": "spoofed.example" } }), undefined);
  assert.equal(getClerkProxyHost({ headers: { host: "internal", "x-forwarded-host": "garage.example" } }), "garage.example");
});

test("Clerk proxy permits origin-less assets but not origin-less mutations", () => {
  process.env.PUBLIC_SITE_ORIGIN = "https://garage.example";
  assert.equal(invokeProxy("GET", undefined).next, true);
  assert.equal(invokeProxy("POST", undefined).status, 403);
  assert.equal(invokeProxy("POST", "https://garage.example").next, true);
  assert.equal(invokeProxy("POST", "https://attacker.example").status, 403);
});