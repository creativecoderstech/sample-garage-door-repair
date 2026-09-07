import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { DatabaseSync } from "node:sqlite";
import { clerkProxy, grantAccess, revokeAccess, staffActor } from "./garage-auth.mjs";

class D1 {
  constructor() {
    this.sqlite = new DatabaseSync(":memory:");
    this.tail = Promise.resolve();
  }
  exec(source) { this.sqlite.exec(source); }
  prepare(sql) {
    const db = this.sqlite;
    return {
      values: [],
      bind(...values) { this.values = values; return this; },
      async first() { return db.prepare(sql).get(...this.values) ?? null; },
      async all() { return { results: db.prepare(sql).all(...this.values) }; },
      async run() {
        const result = db.prepare(sql).run(...this.values);
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
jwk.kid = "fixture-key";
jwk.alg = "RS256";
const issuer = "https://auth.fixture";
const publishableKey = `pk_test_${Buffer.from("auth.fixture$").toString("base64")}`;
const now = () => Math.floor(Date.now() / 1000);
const token = claims => {
  const header = Buffer.from(JSON.stringify({ alg: "RS256", kid: "fixture-key", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ iss: issuer, sub: "user_owner", exp: now() + 300, nbf: now() - 1, azp: "https://staff.fixture", ...claims })).toString("base64url");
  return `${header}.${payload}.${sign("RSA-SHA256", Buffer.from(`${header}.${payload}`), privateKey).toString("base64url")}`;
};
const request = claims => new Request("https://staff.fixture/api/garage/admin/session", { headers: { cookie: `__session=${token(claims)}` } });
const users = new Map();
const googleUser = (id, address, { google = true, verified = true } = {}) => ({
  id,
  primary_email_address_id: "primary",
  email_addresses: [{ id: "primary", email_address: address, verification: { status: verified ? "verified" : "unverified" } }],
  external_accounts: google ? [{ provider: "oauth_google", email_address: address, verification: { status: "verified" } }] : [],
});

const originalFetch = globalThis.fetch;
globalThis.fetch = async input => {
  const url = String(input);
  if (url.endsWith("/.well-known/jwks.json")) return Response.json({ keys: [jwk] });
  const id = decodeURIComponent(url.slice(url.lastIndexOf("/") + 1));
  return users.has(id) ? Response.json(users.get(id)) : new Response("missing", { status: 404 });
};

async function fixture() {
  const DB = new D1();
  DB.exec(await readFile(new URL("./migrations/0004_staff_access.sql", import.meta.url), "utf8"));
  return {
    DB,
    CLERK_SECRET_KEY: "sk_test_fixture",
    CLERK_PUBLISHABLE_KEY: publishableKey,
    GARAGE_BOOTSTRAP_EMAIL: "creativecoderstech@gmail.com",
    ENVIRONMENT: "development",
  };
}

test.after(() => { globalThis.fetch = originalFetch; });

test("Pages authorization bootstraps only the exact verified Google owner", async () => {
  const env = await fixture();
  users.set("user_owner", googleUser("user_owner", "creativecoderstech@gmail.com"));
  const [owner, sameOwner] = await Promise.all([
    staffActor(request({}), env, "super_admin"),
    staffActor(request({}), env, "super_admin"),
  ]);
  assert.equal(owner.role, "super_admin");
  assert.equal(owner.accessId, sameOwner.accessId);
  assert.equal((await env.DB.prepare("SELECT count(*) count FROM garage_auth_bootstrap").first()).count, 1);
  assert.equal((await env.DB.prepare("SELECT count(*) count FROM garage_staff_access WHERE role='super_admin'").first()).count, 1);

  users.set("wrong", googleUser("wrong", "wrong@example.com"));
  await assert.rejects(() => staffActor(request({ sub: "wrong" }), env), error => error.status === 403);
  users.set("nongoogle", googleUser("nongoogle", "creativecoderstech@gmail.com", { google: false }));
  const nonGoogleEnv = await fixture();
  await assert.rejects(() => staffActor(request({ sub: "nongoogle" }), nonGoogleEnv), error => error.status === 401);
  users.set("unverified", googleUser("unverified", "creativecoderstech@gmail.com", { verified: false }));
  const unverifiedEnv = await fixture();
  await assert.rejects(() => staffActor(request({ sub: "unverified" }), unverifiedEnv), error => error.status === 401);
});

test("Pages pending redemption is one identity and remains immutable across email edits", async () => {
  const env = await fixture();
  await env.DB.prepare("INSERT INTO garage_staff_access(id,email,role) VALUES('pending','staff@example.com','staff')").run();
  users.set("staff_user", googleUser("staff_user", "staff@example.com"));
  const [first, second] = await Promise.all([
    staffActor(request({ sub: "staff_user" }), env),
    staffActor(request({ sub: "staff_user" }), env),
  ]);
  assert.equal(first.userId, second.userId);
  assert.equal((await env.DB.prepare("SELECT count(*) count FROM garage_staff_access WHERE clerk_user_id='staff_user'").first()).count, 1);
  users.set("staff_user", googleUser("staff_user", "renamed@example.com"));
  assert.equal((await staffActor(request({ sub: "staff_user" }), env)).accessId, "pending");
});

test("Pages roles block elevation and revocation applies on the next request", async () => {
  const env = await fixture();
  users.set("user_owner", googleUser("user_owner", "creativecoderstech@gmail.com"));
  const owner = await staffActor(request({}), env, "super_admin");
  const grant = await grantAccess(env, owner, { email: "operator@example.com", role: "staff" });
  users.set("operator", googleUser("operator", "operator@example.com"));
  const operatorRequest = request({ sub: "operator" });
  await staffActor(operatorRequest, env, "staff");
  await assert.rejects(() => staffActor(operatorRequest, env, "admin"), error => error.status === 403);
  await assert.rejects(async () => grantAccess(env, await staffActor(operatorRequest, env, "super_admin"), { email: "x@example.com", role: "admin" }), error => error.status === 403);
  await revokeAccess(env, owner, grant.id);
  await assert.rejects(() => staffActor(operatorRequest, env), error => error.status === 403);
  await assert.rejects(() => revokeAccess(env, owner, owner.accessId), /cannot be revoked/);
  await assert.rejects(() => grantAccess(env, owner, { email: "creativecoderstech@gmail.com", role: "staff" }), /cannot be changed/);
});

test("Pages JWT verification rejects missing, malformed, and invalid time claims", async () => {
  const env = await fixture();
  users.set("user_owner", googleUser("user_owner", "creativecoderstech@gmail.com"));
  for (const claims of [
    { exp: undefined },
    { exp: "tomorrow" },
    { exp: now() - 1 },
    { nbf: "later" },
    { nbf: now() + 120 },
    { sub: 42 },
    { iss: "https://attacker.invalid" },
    { azp: 42 },
  ]) {
    await assert.rejects(() => staffActor(request(claims), env), error => error.status === 401);
  }
  await assert.rejects(() => staffActor(new Request("https://staff.fixture/api"), env), error => error.status === 401);
  const valid = token({});
  await assert.rejects(
    () => staffActor(new Request("https://staff.fixture/api", { headers: { cookie: `__session=${valid.slice(0, -2)}xx` } }), env),
    error => error.status === 401,
  );
  const [header, , signature] = valid.split(".");
  await assert.rejects(
    () => staffActor(new Request("https://staff.fixture/api", { headers: { cookie: `__session=${header}.not-json.${signature}` } }), env),
    error => error.status === 401,
  );
});

test("Pages private APIs and Clerk proxy reject hostile Origin while same-origin and bearer clients work", async () => {
  const env = await fixture();
  users.set("user_owner", googleUser("user_owner", "creativecoderstech@gmail.com"));
  const signed = token({});
  const hostile = new Request("https://staff.fixture/api/garage/admin/session", {
    headers: { origin: "https://attacker.example", cookie: `__session=${signed}` },
  });
  await assert.rejects(() => staffActor(hostile, env), error => error.status === 403);
  const proxyResponse = await clerkProxy(hostile, env, "/api/__clerk/v1/client");
  assert.equal(proxyResponse.status, 403);
  const originlessProxyMutation = await clerkProxy(
    new Request("https://staff.fixture/api/__clerk/v1/client", { method: "POST", body: "{}" }),
    env,
    "/api/__clerk/v1/client",
  );
  assert.equal(originlessProxyMutation.status, 403);

  const legitimate = new Request("https://staff.fixture/api/garage/admin/session", {
    headers: { origin: "https://staff.fixture", cookie: `__session=${signed}` },
  });
  assert.equal((await staffActor(legitimate, env)).role, "super_admin");
  const bearer = new Request("https://staff.fixture/api/garage/admin/session", {
    headers: { authorization: `Bearer ${signed}` },
  });
  assert.equal((await staffActor(bearer, env)).role, "super_admin");
});