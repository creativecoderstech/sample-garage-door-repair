import type { Context, Next } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import {
  activateUserFromGoogle,
  findUserByEmail,
  findUserById,
  serializeUser,
  type PublicUser,
  type UserRole,
  type UserRow,
} from "./users";

export type AuthEnv = {
  DB: D1Database;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  SESSION_SECRET?: string;
  ADMIN_ORIGIN?: string;
  ENVIRONMENT: string;
};

export type SessionPayload = {
  userId: number;
  email: string;
  role: UserRole;
  exp: number;
};

const SESSION_COOKIE = "pl_session";
const OAUTH_STATE_COOKIE = "pl_oauth_state";
const SESSION_TTL_SEC = 60 * 60 * 24 * 14; // 14 days

function adminOrigin(env: AuthEnv, requestUrl: string): string {
  if (env.ADMIN_ORIGIN) return env.ADMIN_ORIGIN.replace(/\/$/, "");
  const url = new URL(requestUrl);
  if (url.hostname === "admin.pennylanehomesolutions.com") {
    return "https://admin.pennylanehomesolutions.com";
  }
  return `${url.protocol}//${url.host}`;
}

function bytesToBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = "";
  for (const b of arr) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const bin = atob(padded + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacSign(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(data),
  );
  return bytesToBase64Url(sig);
}

async function hmacVerify(
  secret: string,
  data: string,
  signature: string,
): Promise<boolean> {
  const expected = await hmacSign(secret, data);
  if (expected.length !== signature.length) return false;
  let ok = 0;
  for (let i = 0; i < expected.length; i++) {
    ok |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return ok === 0;
}

export async function sealSession(
  secret: string,
  payload: SessionPayload,
): Promise<string> {
  const body = bytesToBase64Url(
    new TextEncoder().encode(JSON.stringify(payload)),
  );
  const sig = await hmacSign(secret, body);
  return `${body}.${sig}`;
}

export async function unsealSession(
  secret: string,
  token: string,
): Promise<SessionPayload | null> {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  if (!(await hmacVerify(secret, body, sig))) return null;
  try {
    const json = new TextDecoder().decode(base64UrlToBytes(body));
    const payload = JSON.parse(json) as SessionPayload;
    if (!payload.userId || !payload.email || !payload.role || !payload.exp) {
      return null;
    }
    if (payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function randomToken(bytes = 32): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return bytesToBase64Url(buf);
}

export function setSessionCookie(
  c: Context<{ Bindings: AuthEnv }>,
  token: string,
) {
  const secure = new URL(c.req.url).protocol === "https:";
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: "Lax",
    path: "/",
    maxAge: SESSION_TTL_SEC,
  });
}

export function clearSessionCookie(c: Context<{ Bindings: AuthEnv }>) {
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
}

export async function readSessionUser(
  c: Context<{ Bindings: AuthEnv }>,
): Promise<UserRow | null> {
  const secret = c.env.SESSION_SECRET;
  if (!secret) return null;
  const token = getCookie(c, SESSION_COOKIE);
  if (!token) return null;
  const payload = await unsealSession(secret, token);
  if (!payload) return null;
  const user = await findUserById(c.env.DB, payload.userId);
  if (!user || user.status === "disabled") return null;
  if (user.email.toLowerCase() !== payload.email.toLowerCase()) return null;
  return user;
}

export type AuthVariables = {
  user: UserRow;
};

export function requireRoles(...roles: UserRole[]) {
  return async (
    c: Context<{ Bindings: AuthEnv; Variables: AuthVariables }>,
    next: Next,
  ) => {
    const user = await readSessionUser(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    if (!roles.includes(user.role)) {
      return c.json({ error: "Forbidden" }, 403);
    }
    c.set("user", user);
    await next();
  };
}

export const requireStaff = requireRoles("super_admin", "admin", "member");
export const requireSuperAdmin = requireRoles("super_admin");
export const requireSettingsWrite = requireRoles("super_admin", "admin", "member");

export async function startGoogleOAuth(c: Context<{ Bindings: AuthEnv }>) {
  const clientId = c.env.GOOGLE_CLIENT_ID;
  if (!clientId || !c.env.GOOGLE_CLIENT_SECRET || !c.env.SESSION_SECRET) {
    return c.json(
      {
        error:
          "Google Sign-In is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and SESSION_SECRET.",
      },
      503,
    );
  }

  const state = randomToken(24);
  const secure = new URL(c.req.url).protocol === "https:";
  setCookie(c, OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure,
    sameSite: "Lax",
    path: "/",
    maxAge: 600,
  });

  const redirectUri = `${adminOrigin(c.env, c.req.url)}/api/auth/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    prompt: "select_account",
  });

  return c.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
  );
}

type GoogleTokenResponse = {
  access_token?: string;
  id_token?: string;
  error?: string;
};

type GoogleUserInfo = {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

export async function handleGoogleCallback(c: Context<{ Bindings: AuthEnv }>) {
  const origin = adminOrigin(c.env, c.req.url);
  const fail = (reason: string) =>
    c.redirect(`${origin}/?authError=${encodeURIComponent(reason)}`);

  const code = c.req.query("code");
  const state = c.req.query("state");
  const cookieState = getCookie(c, OAUTH_STATE_COOKIE);
  deleteCookie(c, OAUTH_STATE_COOKIE, { path: "/" });

  if (!code || !state || !cookieState || state !== cookieState) {
    return fail("invalid_state");
  }
  if (!c.env.GOOGLE_CLIENT_ID || !c.env.GOOGLE_CLIENT_SECRET || !c.env.SESSION_SECRET) {
    return fail("not_configured");
  }

  const redirectUri = `${origin}/api/auth/callback`;
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: c.env.GOOGLE_CLIENT_ID,
      client_secret: c.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const tokenJson = (await tokenRes.json()) as GoogleTokenResponse;
  if (!tokenRes.ok || !tokenJson.access_token) {
    return fail("token_exchange_failed");
  }

  const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
  });
  const profile = (await profileRes.json()) as GoogleUserInfo;
  if (!profileRes.ok || !profile.email || !profile.sub) {
    return fail("profile_failed");
  }
  if (profile.email_verified === false) {
    return fail("email_unverified");
  }

  const email = profile.email.trim().toLowerCase();
  const existing = await findUserByEmail(c.env.DB, email);
  if (!existing) {
    return fail("not_invited");
  }
  if (existing.status === "disabled") {
    return fail("disabled");
  }

  const user = await activateUserFromGoogle(c.env.DB, existing, {
    sub: profile.sub,
    name: profile.name,
    picture: profile.picture,
  });

  const token = await sealSession(c.env.SESSION_SECRET, {
    userId: user.id,
    email: user.email,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SEC,
  });
  setSessionCookie(c, token);
  return c.redirect(`${origin}/`);
}

export async function getMe(c: Context<{ Bindings: AuthEnv }>) {
  const user = await readSessionUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  return c.json({ user: serializeUser(user) });
}

export async function logout(c: Context<{ Bindings: AuthEnv }>) {
  clearSessionCookie(c);
  return c.json({ ok: true });
}

export function toPublicUser(user: UserRow): PublicUser {
  return serializeUser(user);
}
