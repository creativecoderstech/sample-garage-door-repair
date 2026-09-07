import assert from "node:assert/strict";
import test from "node:test";

process.env.DATABASE_URL = "postgres://fixture.invalid/fixture";
process.env.CLERK_SECRET_KEY = "sk_test_fixture";
process.env.CLERK_PUBLISHABLE_KEY = "pk_test_fixture";
process.env.GARAGE_BOOTSTRAP_EMAIL = "creativecoderstech@gmail.com";

const auth = await import("./garage-auth.ts");
const { pool } = await import("./index.ts");

const users = new Map();
const googleUser = (id, email, { google = true, verified = true } = {}) => ({
  id,
  primary_email_address_id: "primary",
  email_addresses: [{ id: "primary", email_address: email, verification: { status: verified ? "verified" : "unverified" } }],
  external_accounts: google ? [{ provider: "oauth_google", email_address: email, verification: { status: "verified" } }] : [],
});
const originalFetch = globalThis.fetch;
globalThis.fetch = async input => {
  const id = decodeURIComponent(String(input).split("/").pop());
  return users.has(id) ? Response.json(users.get(id)) : new Response("missing", { status: 404 });
};

class Store {
  constructor() {
    this.access = new Map();
    this.bootstrap = new Map();
    this.audit = [];
    this.lock = Promise.resolve();
  }
  client() {
    const state = this;
    let releaseLock;
    return {
      async query(sql, values = []) {
        const compact = sql.replace(/\s+/g, " ").trim();
        if (compact.startsWith("BEGIN")) return result();
        if (compact.includes("pg_advisory_xact_lock")) {
          const previous = state.lock;
          state.lock = new Promise(resolve => { releaseLock = resolve; });
          await previous;
          return result([{}]);
        }
        if (compact === "COMMIT" || compact === "ROLLBACK") {
          releaseLock?.();
          return result();
        }
        if (compact.startsWith("SELECT id, email, clerk_user_id, role FROM garage_staff_access")) {
          const [userId, email] = values;
          const row = [...state.access.values()].find(item => item.clerk_user_id === userId) ??
            [...state.access.values()].find(item => !item.clerk_user_id && item.email.toLowerCase() === email.toLowerCase());
          return result(row ? [row] : []);
        }
        if (compact.startsWith("SELECT 1 FROM garage_auth_bootstrap")) return result(state.bootstrap.has(values[0]) ? [{}] : []);
        if (compact.startsWith("INSERT INTO garage_staff_access") && compact.includes("'super_admin'")) {
          const [id, email, userId] = values;
          const row = { id, email, clerk_user_id: userId, role: "super_admin", protected_owner: true };
          state.access.set(id, row);
          return result([row]);
        }
        if (compact.startsWith("UPDATE garage_staff_access SET clerk_user_id=$1,role='super_admin'")) {
          const [userId, id] = values, row = state.access.get(id);
          Object.assign(row, { clerk_user_id: userId, role: "super_admin", protected_owner: true });
          return result([row]);
        }
        if (compact.startsWith("UPDATE garage_staff_access SET clerk_user_id=$1,redeemed_at=now()")) {
          const [userId, id] = values, row = state.access.get(id);
          if (!row || row.clerk_user_id) return result();
          row.clerk_user_id = userId;
          return result([row]);
        }
        if (compact.startsWith("INSERT INTO garage_auth_bootstrap")) {
          const [environment, userId, accessId] = values;
          if (state.bootstrap.has(environment)) throw new Error("duplicate bootstrap");
          state.bootstrap.set(environment, { userId, accessId });
          return result();
        }
        if (compact.startsWith("INSERT INTO garage_audit_logs")) {
          state.audit.push({ values, sql: compact });
          return result();
        }
        if (compact.startsWith("SELECT protected_owner FROM garage_staff_access")) {
          const row = [...state.access.values()].find(item => item.email.toLowerCase() === values[0].toLowerCase());
          return result(row ? [{ protected_owner: row.protected_owner }] : []);
        }
        if (compact.startsWith("INSERT INTO garage_staff_access(id,email,role,granted_by)")) {
          const [newId, email, role, grantedBy] = values;
          let row = [...state.access.values()].find(item => item.email.toLowerCase() === email.toLowerCase());
          if (row) Object.assign(row, { role, granted_by: grantedBy });
          else { row = { id: newId, email, role, clerk_user_id: null, protected_owner: false }; state.access.set(newId, row); }
          return result([{ ...row, redeemed: Boolean(row.clerk_user_id) }]);
        }
        if (compact.startsWith("SELECT id,protected_owner FROM garage_staff_access")) {
          const row = state.access.get(values[0]);
          return result(row ? [{ id: row.id, protected_owner: row.protected_owner }] : []);
        }
        if (compact.startsWith("DELETE FROM garage_staff_access")) {
          state.access.delete(values[0]);
          return result();
        }
        throw new Error(`Unhandled fixture SQL: ${compact}`);
      },
      release() {},
    };
  }
}
const result = (rows = []) => ({ rows, rowCount: rows.length });
let store;
pool.connect = async () => store.client();

test.beforeEach(() => { store = new Store(); users.clear(); });
test.after(() => { globalThis.fetch = originalFetch; void pool.end(); });

test("PostgreSQL path requires exact verified Google bootstrap and binds its audit actor", async () => {
  users.set("owner", googleUser("owner", "creativecoderstech@gmail.com"));
  const [owner, sameOwner] = await Promise.all([
    auth.authorizeGarageUser("owner", "super_admin"),
    auth.authorizeGarageUser("owner", "super_admin"),
  ]);
  assert.equal(owner.role, "super_admin");
  assert.equal(owner.accessId, sameOwner.accessId);
  assert.equal(store.bootstrap.size, 1);
  assert.equal(store.audit[0].values[0], "owner");

  users.set("wrong", googleUser("wrong", "wrong@example.com"));
  await assert.rejects(() => auth.authorizeGarageUser("wrong"), error => error.status === 403);
  users.set("nongoogle", googleUser("nongoogle", "creativecoderstech@gmail.com", { google: false }));
  await assert.rejects(() => auth.authorizeGarageUser("nongoogle"), /verified primary email/);
  users.set("unverified", googleUser("unverified", "creativecoderstech@gmail.com", { verified: false }));
  await assert.rejects(() => auth.authorizeGarageUser("unverified"), /verified primary email/);
});

test("PostgreSQL concurrent pending redemption keeps one immutable identity", async () => {
  store.access.set("pending", { id: "pending", email: "staff@example.com", clerk_user_id: null, role: "staff", protected_owner: false });
  users.set("staff", googleUser("staff", "staff@example.com"));
  const actors = await Promise.all([auth.authorizeGarageUser("staff"), auth.authorizeGarageUser("staff")]);
  assert.equal(actors[0].accessId, actors[1].accessId);
  users.set("staff", googleUser("staff", "changed@example.com"));
  assert.equal((await auth.authorizeGarageUser("staff")).accessId, "pending");
});

test("PostgreSQL role checks, protected owner, and next-request revocation are enforced", async () => {
  users.set("owner", googleUser("owner", "creativecoderstech@gmail.com"));
  const owner = await auth.authorizeGarageUser("owner", "super_admin");
  const grant = await auth.grantGarageAccess(owner, "operator@example.com", "staff");
  users.set("operator", googleUser("operator", "operator@example.com"));
  await auth.authorizeGarageUser("operator", "staff");
  await assert.rejects(() => auth.authorizeGarageUser("operator", "admin"), error => error.status === 403);
  await assert.rejects(() => auth.revokeGarageAccess(owner, owner.accessId), /cannot be revoked/);
  await assert.rejects(() => auth.grantGarageAccess(owner, "creativecoderstech@gmail.com", "staff"), /cannot be changed/);
  await auth.revokeGarageAccess(owner, grant.id);
  await assert.rejects(() => auth.authorizeGarageUser("operator"), error => error.status === 403);
});