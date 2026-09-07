import assert from "node:assert/strict";
import test from "node:test";
import { requireTrustedStaffOrigin, trustedStaffOrigins } from "./staffOriginMiddleware.ts";

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
});