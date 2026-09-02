/**
 * Auth flow integration tests.
 * Runs inside the Miniflare Workers sandbox via @cloudflare/vitest-pool-workers.
 * Uses SELF.fetch() which routes through the real Worker fetch handler.
 *
 * DB schema is applied automatically by vitest.global-setup.ts +
 * worker/vitest-setup.ts (reads all migrations from ./migrations/).
 *
 * Covers:
 *  - /api/auth/env returns environment
 *  - /api/auth/google → 302 to Google with state cookie (credentials present)
 *  - /api/auth/callback → invalid_state on missing state cookie
 *  - /api/auth/callback → invalid_state when state param doesn't match cookie
 *  - /api/auth/callback → happy-path: valid code + state → session cookie
 *  - /api/auth/callback → not_invited when email not in allowlist
 *  - /api/auth/dev-login → 302 + session cookie in dev environment
 */
import { env, SELF } from "cloudflare:test";
import { describe, it, expect, afterEach, vi } from "vitest";

// ---------------------------------------------------------------------------
// Per-test cleanup
// ---------------------------------------------------------------------------

afterEach(async () => {
  // Remove all non-system users so each test starts with a clean slate.
  await env.DB.prepare("DELETE FROM users WHERE is_system = 0").run();
  // Restore the real fetch if any test replaced it with a stub.
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function req(path: string, opts: RequestInit = {}) {
  return new Request(`http://localhost${path}`, opts);
}

/** Parse Set-Cookie headers from a Response into a name→value Map. */
function parseCookies(res: Response): Map<string, string> {
  const map = new Map<string, string>();
  const raw = res.headers as unknown as { getSetCookie?: () => string[] };
  const lines: string[] =
    typeof raw.getSetCookie === "function"
      ? raw.getSetCookie()
      : (res.headers.get("set-cookie") ?? "").split(/,(?=[^;])/);
  for (const line of lines) {
    const [pair] = line.split(";");
    const eq = pair.indexOf("=");
    if (eq === -1) continue;
    map.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
  }
  return map;
}

/** Build a Cookie header string from a map. */
function cookieHeader(cookies: Map<string, string>): string {
  return [...cookies.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

/** Extract authError query param from a redirect Location header. */
function authError(res: Response): string | null {
  const loc = res.headers.get("location") ?? "";
  try {
    return new URL(loc, "http://localhost").searchParams.get("authError");
  } catch {
    return null;
  }
}

/**
 * Stub globalThis.fetch so the worker's outbound requests to Google are
 * intercepted.  Test files and worker handlers run in the same workerd JS
 * isolate, so a global stub here is visible to worker code dispatched via
 * SELF.fetch().
 */
function stubGoogleFetch(opts: { email: string; sub: string; emailVerified?: boolean }) {
  const originalFetch = globalThis.fetch.bind(globalThis);
  vi.stubGlobal(
    "fetch",
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url =
        input instanceof Request
          ? input.url
          : typeof input === "string"
            ? input
            : input.toString();

      if (url === "https://oauth2.googleapis.com/token") {
        return new Response(JSON.stringify({ access_token: "mock-access-token" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (url === "https://www.googleapis.com/oauth2/v3/userinfo") {
        return new Response(
          JSON.stringify({
            sub: opts.sub,
            email: opts.email,
            email_verified: opts.emailVerified ?? true,
            name: "Test User",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      return originalFetch(input, init);
    },
  );
}

// ---------------------------------------------------------------------------
// /api/auth/env
// ---------------------------------------------------------------------------

describe("GET /api/auth/env", () => {
  it("returns the dev environment", async () => {
    const res = await SELF.fetch(req("/api/auth/env"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { environment: string };
    expect(body.environment).toBe("dev");
  });
});

// ---------------------------------------------------------------------------
// /api/auth/google — OAuth entry
// ---------------------------------------------------------------------------

describe("GET /api/auth/google", () => {
  it("redirects to Google OAuth when credentials are configured", async () => {
    const res = await SELF.fetch(req("/api/auth/google"), { redirect: "manual" });
    expect(res.status).toBe(302);
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("accounts.google.com/o/oauth2/v2/auth");
    expect(location).toContain("client_id=");
    // State cookie should be set.
    const cookies = parseCookies(res);
    expect(cookies.has("pl_oauth_state")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// /api/auth/callback — state validation & full happy path
// ---------------------------------------------------------------------------

describe("GET /api/auth/callback", () => {
  /**
   * Build a valid OAuth state + cookie without calling /api/auth/google.
   * The callback handler does a plain string comparison (no signing), so we
   * can construct the pl_oauth_state cookie directly in tests.
   */
  function startOAuth(): { state: string; cookies: Map<string, string> } {
    const state = "test-oauth-state-value-for-vitest";
    const cookies = new Map([["pl_oauth_state", state]]);
    return { state, cookies };
  }

  it("rejects callback with no state cookie", async () => {
    const res = await SELF.fetch(
      req("/api/auth/callback?code=fake_code&state=any_state"),
      { redirect: "manual" },
    );
    expect(res.status).toBe(302);
    expect(authError(res)).toBe("invalid_state");
  });

  it("rejects callback when state cookie does not match query param", async () => {
    const { cookies } = await startOAuth();
    const res = await SELF.fetch(
      req("/api/auth/callback?code=some-code&state=totally-wrong-state", {
        headers: { Cookie: cookieHeader(cookies) },
      }),
      { redirect: "manual" },
    );
    expect(res.status).toBe(302);
    expect(authError(res)).toBe("invalid_state");
    expect(parseCookies(res).has("pl_session")).toBe(false);
  });

  it("creates a session for an invited user when code and state are valid", async () => {
    await env.DB
      .prepare(
        "INSERT INTO users (email, role, status, is_system, created_at, updated_at) VALUES (?, 'admin', 'active', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z')",
      )
      .bind("invited@example.com")
      .run();
    stubGoogleFetch({ email: "invited@example.com", sub: "google-sub-123" });
    const { state, cookies } = await startOAuth();
    const callbackRes = await SELF.fetch(
      req(
        `/api/auth/callback?code=auth-code-abc&state=${encodeURIComponent(state)}`,
        { headers: { Cookie: cookieHeader(cookies) } },
      ),
      { redirect: "manual" },
    );
    expect(callbackRes.status).toBe(302);
    expect(callbackRes.headers.get("location")).not.toContain("authError");
    const responseCookies = parseCookies(callbackRes);
    expect(responseCookies.has("pl_session")).toBe(true);
    expect((responseCookies.get("pl_session") ?? "").length).toBeGreaterThan(20);
  });

  it("rejects Google users whose email is not in the allowlist", async () => {
    stubGoogleFetch({ email: "stranger@example.com", sub: "google-sub-999" });
    const { state, cookies } = await startOAuth();
    const callbackRes = await SELF.fetch(
      req(
        `/api/auth/callback?code=auth-code-xyz&state=${encodeURIComponent(state)}`,
        { headers: { Cookie: cookieHeader(cookies) } },
      ),
      { redirect: "manual" },
    );
    expect(callbackRes.status).toBe(302);
    expect(authError(callbackRes)).toBe("not_invited");
    expect(parseCookies(callbackRes).has("pl_session")).toBe(false);
  });

  it("unknown Google account cannot call staff APIs after a forged sign-in attempt", async () => {
    // Simulate what would happen if an unknown account somehow obtained a
    // pl_session cookie — the user row must not exist in the DB, so
    // readSessionUser returns null and the API gate returns 401.
    const res = await SELF.fetch(
      req("/api/service-requests", {
        headers: { Cookie: "pl_session=forged-token-for-unknown-account" },
      }),
    );
    // /api/service-requests is staff-only; must reject without a valid session.
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// /api/auth/dev-login — dev bypass
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// GET /admin — dev auto-login cookie behavior
// ---------------------------------------------------------------------------

describe("GET /admin (dev auto-login)", () => {
  /** All Set-Cookie lines for pl_session on a response. */
  function sessionSetCookies(res: Response): string[] {
    const raw = res.headers as unknown as { getSetCookie?: () => string[] };
    const lines: string[] =
      typeof raw.getSetCookie === "function"
        ? raw.getSetCookie()
        : (res.headers.get("set-cookie") ?? "").split(/,(?=[^;])/).filter(Boolean);
    return lines.filter((l) => l.trim().startsWith("pl_session="));
  }

  it("stamps a dev auto-login cookie when no session exists", async () => {
    // With DEMO_USER fallback removed, readSessionUser() returns null for
    // unauthenticated requests. serveAdminSpa sees !existing && SESSION_SECRET
    // and auto-stamps a super_admin session cookie in dev mode.
    const res = await SELF.fetch(req("/admin"), { redirect: "manual" });
    expect(res.status).toBe(200);

    // A session cookie IS stamped so the admin SPA loads authenticated.
    const lines = sessionSetCookies(res);
    expect(lines.length).toBeGreaterThan(0);

    // /api/auth/me returns 401 when there is no cookie (no DEMO_USER fallback).
    const me = await SELF.fetch(req("/api/auth/me"));
    expect(me.status).toBe(401);
  });

  it("does not replace an existing valid session cookie", async () => {
    const login = await SELF.fetch(req("/api/auth/dev-login"), { redirect: "manual" });
    const session = parseCookies(login).get("pl_session")!;
    expect(session.length).toBeGreaterThan(20);

    const res = await SELF.fetch(
      req("/admin", { headers: { Cookie: `pl_session=${session}` } }),
      { redirect: "manual" },
    );
    expect(res.status).toBe(200);
    expect(sessionSetCookies(res)).toHaveLength(0);
  });

  it("stamps a fresh auto-login cookie when given an invalid session cookie", async () => {
    // An invalid cookie makes readSessionUser return null; serveAdminSpa
    // treats this the same as no cookie and auto-stamps a new dev session.
    const res = await SELF.fetch(
      req("/admin", { headers: { Cookie: "pl_session=garbage-token" } }),
      { redirect: "manual" },
    );
    expect(res.status).toBe(200);
    expect(sessionSetCookies(res).length).toBeGreaterThan(0);
  });

  it("sets no auto-login cookie in the production environment", async () => {
    const { default: worker } = await import("./index");
    const { createExecutionContext, waitOnExecutionContext } = await import(
      "cloudflare:test"
    );
    const ctx = createExecutionContext();
    const prodEnv = { ...env, ENVIRONMENT: "production" } as typeof env;
    // localhost keeps path-based /admin even in production, so the SPA is
    // served — but no dev auto-login cookie may be stamped.
    const res = await worker.fetch(
      new Request("http://localhost/admin"),
      prodEnv,
      ctx,
    );
    await waitOnExecutionContext(ctx);
    expect(res.status).toBe(200);
    expect(sessionSetCookies(res)).toHaveLength(0);
  });

  it("redirects /admin on the production marketing host to the admin subdomain", async () => {
    const { default: worker } = await import("./index");
    const { createExecutionContext, waitOnExecutionContext } = await import(
      "cloudflare:test"
    );
    const ctx = createExecutionContext();
    const prodEnv = { ...env, ENVIRONMENT: "production" } as typeof env;
    const res = await worker.fetch(
      new Request("https://sample-handyman.samples.creativecoders.tech/admin"),
      prodEnv,
      ctx,
    );
    await waitOnExecutionContext(ctx);
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(
      "https://admin.sample-handyman.samples.creativecoders.tech/",
    );
    expect(sessionSetCookies(res)).toHaveLength(0);
  });
});

describe("GET /api/auth/dev-login", () => {
  it("returns 302 to /admin and sets a signed session cookie", async () => {
    // The migrations seed a system super_admin (is_system=1) that dev-login
    // picks up automatically — no extra seeding needed here.
    const res = await SELF.fetch(req("/api/auth/dev-login"), { redirect: "manual" });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/admin?ok=1");
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("pl_session=");
    expect(cookie).toContain("HttpOnly");
  });
});
