const enc = new TextEncoder();
const decode = value => JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(value.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0))));
const email = value => String(value || "").trim().toLowerCase();
const production = env => env.CLOUDFLARE_ENV === "production" || env.ENVIRONMENT === "production" || env.CF_PAGES_BRANCH === "main";
const environment = env => production(env) ? "production" : "development";

function normalizedOrigin(value) {
  try { return value ? new URL(value.includes("://") ? value : `https://${value}`).origin : ""; }
  catch { return ""; }
}

export function assertTrustedPagesOrigin(request, env) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const allowed = new Set([
    new URL(request.url).origin,
    normalizedOrigin(env.PUBLIC_SITE_ORIGIN),
    normalizedOrigin(env.CF_PAGES_URL),
  ].filter(Boolean));
  let normalized;
  try { normalized = new URL(origin).origin; }
  catch { throw Object.assign(new Error("Untrusted staff request origin."), { status: 403 }); }
  if (!allowed.has(normalized)) throw Object.assign(new Error("Untrusted staff request origin."), { status: 403 });
}

function sessionToken(request) {
  return request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1] || "";
}

async function googleIdentity(request, env) {
  const clientId = String(env.GOOGLE_OAUTH_CLIENT_ID || "");
  if (!clientId) throw Object.assign(new Error("Pages staff authentication is not configured."), { status: 503 });
  const token = sessionToken(request), parts = token.split(".");
  if (parts.length !== 3) throw Object.assign(new Error("Sign in with Google to continue."), { status: 401 });
  let header, claims;
  try {
    header = decode(parts[0]);
    claims = decode(parts[1]);
  } catch {
    throw Object.assign(new Error("Malformed staff session."), { status: 401 });
  }
  const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (header.alg !== "RS256" || typeof header.kid !== "string" || !["https://accounts.google.com", "accounts.google.com"].includes(claims.iss) || !audience.includes(clientId) || typeof claims.sub !== "string" || !claims.sub || typeof claims.email !== "string" || claims.email_verified !== true) throw Object.assign(new Error("Invalid Google ID token."), { status: 401 });
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(claims.exp) || claims.exp <= now ||
      (claims.nbf !== undefined && (!Number.isFinite(claims.nbf) || claims.nbf > now + 30))) {
    throw Object.assign(new Error("Staff session expired."), { status: 401 });
  }
  const response = await fetch("https://www.googleapis.com/oauth2/v3/certs");
  if (!response.ok) throw Object.assign(new Error("Unable to verify Google ID token."), { status: 401 });
  const jwks = await response.json();
  const jwk = jwks.keys?.find(key => key.kid === header.kid && key.kty === "RSA");
  if (!jwk) throw Object.assign(new Error("Unable to verify staff session."), { status: 401 });
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  let signature;
  try {
    signature = Uint8Array.from(atob(parts[2].replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
  } catch {
    throw Object.assign(new Error("Malformed staff session signature."), { status: 401 });
  }
  if (!await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, signature, enc.encode(`${parts[0]}.${parts[1]}`))) {
    throw Object.assign(new Error("Invalid staff session signature."), { status: 401 });
  }
  return { userId: `google:${claims.sub}`, email: email(claims.email) };
}

export async function staffActor(request, env, minimum = "staff") {
  assertTrustedPagesOrigin(request, env);
  if (!env.DB) throw Object.assign(new Error("Staff database is not configured."), { status: 503 });
  const identity = await googleIdentity(request, env);
  let row = await env.DB.prepare("SELECT * FROM garage_staff_access WHERE clerk_user_id=? OR (clerk_user_id IS NULL AND email=? COLLATE NOCASE) ORDER BY clerk_user_id IS NULL LIMIT 1").bind(identity.userId, identity.email).first();
  const claimed = await env.DB.prepare("SELECT 1 claimed FROM garage_auth_bootstrap WHERE environment=?").bind(environment(env)).first();
  if (!claimed && email(env.GARAGE_BOOTSTRAP_EMAIL) === identity.email) {
    const id = row?.id || crypto.randomUUID(), now = new Date().toISOString();
    const access = row
      ? env.DB.prepare("UPDATE garage_staff_access SET clerk_user_id=?,role='super_admin',protected_owner=1,redeemed_at=? WHERE id=?").bind(identity.userId, now, id)
      : env.DB.prepare("INSERT INTO garage_staff_access(id,email,clerk_user_id,role,protected_owner,redeemed_at) SELECT ?,?,?,'super_admin',1,? WHERE NOT EXISTS(SELECT 1 FROM garage_auth_bootstrap WHERE environment=?)").bind(id, identity.email, identity.userId, now, environment(env));
    const bootstrap = env.DB.prepare("INSERT OR IGNORE INTO garage_auth_bootstrap(environment,clerk_user_id,access_id,claimed_at) VALUES(?,?,?,?)").bind(environment(env), identity.userId, id, now);
    const audit = env.DB.prepare("INSERT INTO garage_auth_audit(actor_user_id,actor_role,action,resource_type,resource_id,changed_fields_json) SELECT ?,'super_admin','staff_access.bootstrap','staff_access',?,'[\"email\",\"role\"]' WHERE changes()>0").bind(identity.userId, id);
    await env.DB.batch([access, bootstrap, audit]);
    row = await env.DB.prepare("SELECT * FROM garage_staff_access WHERE clerk_user_id=?").bind(identity.userId).first();
  } else if (row && !row.clerk_user_id) {
    const now = new Date().toISOString();
    await env.DB.batch([
      env.DB.prepare("UPDATE garage_staff_access SET clerk_user_id=?,redeemed_at=? WHERE id=? AND clerk_user_id IS NULL").bind(identity.userId, now, row.id),
      env.DB.prepare("INSERT INTO garage_auth_audit(actor_user_id,actor_role,action,resource_type,resource_id,changed_fields_json) VALUES(?,?,'staff_access.redeemed','staff_access',?,'[\"clerk_user_id\"]')").bind(identity.userId, row.role, row.id),
    ]);
    row = await env.DB.prepare("SELECT * FROM garage_staff_access WHERE clerk_user_id=?").bind(identity.userId).first();
  }
  if (!row) throw Object.assign(new Error("This Google account has not been granted staff access."), { status: 403 });
  const rank = { staff: 1, admin: 2, super_admin: 3 };
  if (rank[row.role] < rank[minimum]) throw Object.assign(new Error("Your staff role cannot perform this action."), { status: 403 });
  return { accessId: row.id, userId: identity.userId, email: row.email, role: row.role };
}

export async function listAccess(env) {
  const result = await env.DB.prepare("SELECT id,email,role,clerk_user_id IS NOT NULL redeemed,protected_owner,created_at,redeemed_at FROM garage_staff_access ORDER BY protected_owner DESC,created_at").all();
  return result.results.map(row => ({ id: row.id, email: row.email, role: row.role, status: row.redeemed ? "active" : "pending", protectedOwner: !!row.protected_owner, createdAt: row.created_at, redeemedAt: row.redeemed_at }));
}

export async function grantAccess(env, actor, value) {
  const target = email(value.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target) || !["admin", "staff"].includes(value.role)) throw Object.assign(new Error("Provide a valid email and either the admin or staff role."), { status: 400 });
  const existing = await env.DB.prepare("SELECT id,protected_owner FROM garage_staff_access WHERE email=? COLLATE NOCASE").bind(target).first();
  if (existing?.protected_owner) throw Object.assign(new Error("The bootstrap owner's role cannot be changed."), { status: 409 });
  const id = existing?.id || crypto.randomUUID();
  await env.DB.batch([
    env.DB.prepare("INSERT INTO garage_staff_access(id,email,role,granted_by) VALUES(?,?,?,?) ON CONFLICT(email) DO UPDATE SET role=excluded.role,granted_by=excluded.granted_by").bind(id, target, value.role, actor.userId),
    env.DB.prepare("INSERT INTO garage_auth_audit(actor_user_id,actor_role,action,resource_type,resource_id,changed_fields_json) VALUES(?,?,'staff_access.granted','staff_access',?,'[\"email\",\"role\"]')").bind(actor.userId, actor.role, id),
  ]);
  const row = await env.DB.prepare("SELECT id,email,role,clerk_user_id IS NOT NULL redeemed FROM garage_staff_access WHERE id=?").bind(id).first();
  return { id: row.id, email: row.email, role: row.role, status: row.redeemed ? "active" : "pending" };
}

export async function revokeAccess(env, actor, id) {
  const row = await env.DB.prepare("SELECT * FROM garage_staff_access WHERE id=?").bind(id).first();
  if (!row) throw Object.assign(new Error("Access record not found."), { status: 404 });
  if (row.protected_owner) throw Object.assign(new Error("The bootstrap owner cannot be revoked."), { status: 409 });
  await env.DB.batch([
    env.DB.prepare("DELETE FROM garage_staff_access WHERE id=?").bind(id),
    env.DB.prepare("INSERT INTO garage_auth_audit(actor_user_id,actor_role,action,resource_type,resource_id,changed_fields_json) VALUES(?,?,'staff_access.revoked','staff_access',?,'[]')").bind(actor.userId, actor.role, id),
  ]);
}

export async function audit(env, actor, action, resourceType, resourceId, fields = []) {
  await env.DB.prepare("INSERT INTO garage_auth_audit(actor_user_id,actor_role,action,resource_type,resource_id,changed_fields_json) VALUES(?,?,?,?,?,?)").bind(actor.userId, actor.role, action, resourceType, resourceId, JSON.stringify(fields)).run();
}
