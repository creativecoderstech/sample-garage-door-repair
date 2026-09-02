/**
 * Review moderation integration tests.
 * Regression coverage for the approve/unapprove endpoints: the id must be
 * bound as a query parameter (a previous bug passed it to D1's .first(),
 * which treats its argument as a column name — every approval failed).
 * Covers the full flow: submit → approve → appears in public list → unapprove.
 */
import { env, SELF } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";

function req(path: string, opts: RequestInit = {}) {
  return new Request(`http://localhost${path}`, opts);
}

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

async function adminSession(): Promise<string> {
  const res = await SELF.fetch(req("/api/auth/dev-login"), { redirect: "manual" });
  const session = parseCookies(res).get("pl_session");
  if (!session) throw new Error("dev-login did not return a session cookie");
  return session;
}

function db() {
  return (env as unknown as { DB: D1Database }).DB;
}

async function seedPendingReview(name = "Reg Test"): Promise<number> {
  const row = await db()
    .prepare(
      `INSERT INTO reviews (name, rating, text, approved)
       VALUES (?, 5, 'Fantastic work, fixed our leaking faucet fast.', 0)
       RETURNING id`,
    )
    .bind(name)
    .first<{ id: number }>();
  if (!row) throw new Error("seed insert failed");
  return row.id;
}

describe("review approval flow", () => {
  beforeEach(async () => {
    await db().prepare("DELETE FROM reviews").run();
  });

  it("approve publishes the review to the public list (regression: id binding)", async () => {
    const id = await seedPendingReview();
    const session = await adminSession();

    // Pending review must not be public yet
    let pub = (await (await SELF.fetch(req("/api/reviews"))).json()) as Array<{ id: number }>;
    expect(pub.find((r) => r.id === id)).toBeUndefined();

    const res = await SELF.fetch(
      req(`/api/admin/reviews/${id}/approve`, {
        method: "PUT",
        headers: { Cookie: `pl_session=${session}` },
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { review: { id: number; approved: boolean } };
    expect(body.review.id).toBe(id);
    expect(body.review.approved).toBe(true);

    // Persisted in the DB…
    const row = await db()
      .prepare("SELECT approved FROM reviews WHERE id = ?")
      .bind(id)
      .first<{ approved: number }>();
    expect(row?.approved).toBe(1);

    // …and visible on the public site
    pub = (await (await SELF.fetch(req("/api/reviews"))).json()) as Array<{ id: number }>;
    expect(pub.find((r) => r.id === id)).toBeDefined();
  });

  it("unapprove removes the review from the public list", async () => {
    const id = await seedPendingReview();
    const session = await adminSession();

    await SELF.fetch(
      req(`/api/admin/reviews/${id}/approve`, {
        method: "PUT",
        headers: { Cookie: `pl_session=${session}` },
      }),
    );

    const res = await SELF.fetch(
      req(`/api/admin/reviews/${id}/unapprove`, {
        method: "PUT",
        headers: { Cookie: `pl_session=${session}` },
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { review: { approved: boolean } };
    expect(body.review.approved).toBe(false);

    const pub = (await (await SELF.fetch(req("/api/reviews"))).json()) as Array<{ id: number }>;
    expect(pub.find((r) => r.id === id)).toBeUndefined();
  });

  it("returns 404 for a nonexistent review id", async () => {
    const session = await adminSession();
    const res = await SELF.fetch(
      req(`/api/admin/reviews/999999/approve`, {
        method: "PUT",
        headers: { Cookie: `pl_session=${session}` },
      }),
    );
    expect(res.status).toBe(404);
  });

  it("rejects unauthenticated approve requests with 401", async () => {
    // DEMO_USER fallback is removed; unauthenticated requests must be rejected.
    const id = await seedPendingReview();
    const res = await SELF.fetch(
      req(`/api/admin/reviews/${id}/approve`, { method: "PUT" }),
    );
    expect(res.status).toBe(401);
  });
});
