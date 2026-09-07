import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { DatabaseSync } from "node:sqlite";
import { grantAccess, revokeAccess, staffActor } from "./garage-auth.mjs";

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
const clientId = "fixture-client.apps.googleusercontent.com";
const now = () => Math.floor(Date.now() / 1000);
const token = claims => {
  const header = Buffer.from(JSON.stringify({ alg: "RS256", kid: "fixture-key", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ iss: "https://accounts.google.com", aud: clientId, sub: "user_owner", email: "creativecoderstech@gmail.com", email_verified: true, exp: now() + 300, nbf: now() - 1, ...claims })).toString("base64url");
  return `${header}.${payload}.${sign("RSA-SHA256", Buffer.from(`${header}.${payload}`), privateKey).toString("base64url")}`;
};
const request = claims => new Request("https://staff.fixture/api/garage/admin/session", { headers: { authorization: `Bearer ${token(claims)}` } });

const originalFetch = globalThis.fetch;
globalThis.fetch = async input => {
  const url = String(input);
  if (url === "https://www.googleapis.com/oauth2/v3/certs") return Response.json({ keys: [jwk] });
  return new Response("missing", { status: 404 });
};

async function fixture() {
  const DB = new D1();
  DB.exec(await readFile(new URL("./migrations/0004_staff_access.sql", import.meta.url), "utf8"));
  return {
    DB,
    GOOGLE_OAUTH_CLIENT_ID: clientId,
    GARAGE_BOOTSTRAP_EMAIL: "creativecoderstech@gmail.com",
    ENVIRONMENT: "development",
  };
}

test.after(() => { globalThis.fetch = originalFetch; });

test("Pages authorization bootstraps only the exact verified Google owner", async () => {
  const env = await fixture();
  const [owner, sameOwner] = await Promise.all([
    staffActor(request({}), env, "super_admin"),
    staffActor(request({}), env, "super_admin"),
  ]);
  assert.equal(owner.role, "super_admin");
  assert.equal(owner.accessId, sameOwner.accessId);
  assert.equal((await env.DB.prepare("SELECT count(*) count FROM garage_auth_bootstrap").first()).count, 1);
  assert.equal((await env.DB.prepare("SELECT count(*) count FROM garage_staff_access WHERE role='super_admin'").first()).count, 1);

  await assert.rejects(() => staffActor(request({ sub: "wrong", email: "wrong@example.com" }), env), error => error.status === 403);
  const unverifiedEnv = await fixture();
  await assert.rejects(() => staffActor(request({ email_verified: false }), unverifiedEnv), error => error.status === 401);
});

test("Pages pending redemption is one identity and remains immutable across email edits", async () => {
  const env = await fixture();
  await env.DB.prepare("INSERT INTO garage_staff_access(id,email,role) VALUES('pending','staff@example.com','staff')").run();
  const [first, second] = await Promise.all([
    staffActor(request({ sub: "staff_user", email: "staff@example.com" }), env),
    staffActor(request({ sub: "staff_user", email: "staff@example.com" }), env),
  ]);
  assert.equal(first.userId, second.userId);
  assert.equal((await env.DB.prepare("SELECT count(*) count FROM garage_staff_access WHERE clerk_user_id='google:staff_user'").first()).count, 1);
  assert.equal((await staffActor(request({ sub: "staff_user", email: "renamed@example.com" }), env)).accessId, "pending");
});

test("Pages roles block elevation and revocation applies on the next request", async () => {
  const env = await fixture();
  const owner = await staffActor(request({}), env, "super_admin");
  const grant = await grantAccess(env, owner, { email: "operator@example.com", role: "staff" });
  const operatorRequest = request({ sub: "operator", email: "operator@example.com" });
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
  for (const claims of [
    { exp: undefined },
    { exp: "tomorrow" },
    { exp: now() - 1 },
    { nbf: "later" },
    { nbf: now() + 120 },
    { sub: 42 },
    { iss: "https://attacker.invalid" },
    { aud: "wrong-client" }, { email_verified: false },
  ]) {
    await assert.rejects(() => staffActor(request(claims), env), error => error.status === 401);
  }
  await assert.rejects(() => staffActor(new Request("https://staff.fixture/api"), env), error => error.status === 401);
  const valid = token({});
  await assert.rejects(
    () => staffActor(new Request("https://staff.fixture/api", { headers: { authorization: `Bearer ${valid.slice(0, -2)}xx` } }), env),
    error => error.status === 401,
  );
  const [header, , signature] = valid.split(".");
  await assert.rejects(
    () => staffActor(new Request("https://staff.fixture/api", { headers: { authorization: `Bearer ${header}.not-json.${signature}` } }), env),
    error => error.status === 401,
  );
});

test("Pages private APIs reject hostile Origin while same-origin and bearer clients work", async () => {
  const env = await fixture();
  const signed = token({});
  const hostile = new Request("https://staff.fixture/api/garage/admin/session", {
    headers: { origin: "https://attacker.example", authorization: `Bearer ${signed}` },
  });
  await assert.rejects(() => staffActor(hostile, env), error => error.status === 403);
  const legitimate = new Request("https://staff.fixture/api/garage/admin/session", {
    headers: { origin: "https://staff.fixture", authorization: `Bearer ${signed}` },
  });
  assert.equal((await staffActor(legitimate, env)).role, "super_admin");
  const bearer = new Request("https://staff.fixture/api/garage/admin/session", {
    headers: { authorization: `Bearer ${signed}` },
  });
  assert.equal((await staffActor(bearer, env)).role, "super_admin");
});