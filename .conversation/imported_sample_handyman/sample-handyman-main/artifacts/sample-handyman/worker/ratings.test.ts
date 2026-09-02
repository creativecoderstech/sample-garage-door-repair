/**
 * Ratings settings integration tests.
 * Covers:
 *  - GET /api/settings/ratings returns per-platform counts and computed aggregate
 *  - PUT /api/settings/ratings validates and normalizes inputs
 *  - PUT /api/settings/ratings rejects out-of-range ratings and negative counts
 *  - PUT /api/settings (main settings) validates rating fields and normalizes them
 *  - PUT /api/settings (main settings) rejects out-of-range rating values
 *  - HTML injection: homepage JSON-LD reflects the current DB values
 */
import { env, SELF } from "cloudflare:test";
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import worker from "./index";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

/** Obtain a super_admin session cookie via the dev-login bypass. */
async function adminSession(): Promise<string> {
  const res = await SELF.fetch(req("/api/auth/dev-login"), { redirect: "manual" });
  const session = parseCookies(res).get("pl_session");
  if (!session) throw new Error("dev-login did not return a session cookie");
  return session;
}

/** Seed specific rating values directly into site_settings. */
async function seedRatings(opts: {
  thumbtackRating?: string;
  thumbtackReviewCount?: string;
  taskrabbitRating?: string;
  taskrabbitReviewCount?: string;
}) {
  const db = (env as unknown as { DB: D1Database }).DB;
  const pairs: [string, string][] = [
    ["thumbtack_rating", opts.thumbtackRating ?? "4.9"],
    ["thumbtack_review_count", opts.thumbtackReviewCount ?? "110"],
    ["taskrabbit_rating", opts.taskrabbitRating ?? "5.0"],
    ["taskrabbit_review_count", opts.taskrabbitReviewCount ?? "384"],
  ];
  for (const [key, value] of pairs) {
    await db
      .prepare(
        `INSERT INTO site_settings (key, value, updated_at)
         VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      )
      .bind(key, value)
      .run();
  }
}

// ---------------------------------------------------------------------------
// GET /api/settings/ratings  (public)
// ---------------------------------------------------------------------------

describe("GET /api/settings/ratings", () => {
  beforeEach(async () => {
    await seedRatings({ thumbtackRating: "4.9", thumbtackReviewCount: "110", taskrabbitRating: "5.0", taskrabbitReviewCount: "384" });
  });

  it("returns per-platform values and computed aggregate without auth", async () => {
    const res = await SELF.fetch(req("/api/settings/ratings"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.thumbtackRatingValue).toBe(4.9);
    expect(body.thumbtackReviewCount).toBe(110);
    expect(body.taskrabbitRatingValue).toBe(5);
    expect(body.taskrabbitReviewCount).toBe(384);
    // Aggregate: (110*4.9 + 384*5.0) / 494 ≈ 4.977… → rounds to 5.0
    expect(body.aggregateReviewCount).toBe(494);
    expect(typeof body.aggregateRatingValue).toBe("number");
  });

  it("computes weighted aggregate correctly", async () => {
    await seedRatings({ thumbtackRating: "4.0", thumbtackReviewCount: "100", taskrabbitRating: "5.0", taskrabbitReviewCount: "100" });
    const res = await SELF.fetch(req("/api/settings/ratings"));
    const body = (await res.json()) as Record<string, number>;
    expect(body.aggregateReviewCount).toBe(200);
    // (100*4.0 + 100*5.0) / 200 = 4.5
    expect(body.aggregateRatingValue).toBe(4.5);
  });
});

// ---------------------------------------------------------------------------
// PUT /api/settings/ratings  (staff-only)
// ---------------------------------------------------------------------------

describe("PUT /api/settings/ratings", () => {
  it("rejects unauthenticated requests with 401", async () => {
    // DEMO_USER fallback is removed; unauthenticated requests must be rejected.
    const res = await SELF.fetch(
      req("/api/settings/ratings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thumbtackReviewCount: 100, thumbtackRatingValue: 4.9, taskrabbitReviewCount: 50, taskrabbitRatingValue: 5.0 }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it("accepts valid inputs and returns normalized aggregate", async () => {
    const session = await adminSession();
    const res = await SELF.fetch(
      req("/api/settings/ratings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Cookie: `pl_session=${session}` },
        body: JSON.stringify({ thumbtackReviewCount: 200, thumbtackRatingValue: 4.8, taskrabbitReviewCount: 80, taskrabbitRatingValue: 5.0 }),
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, number>;
    expect(body.thumbtackReviewCount).toBe(200);
    expect(body.thumbtackRatingValue).toBeCloseTo(4.8);
    expect(body.taskrabbitReviewCount).toBe(80);
    expect(body.aggregateReviewCount).toBe(280);
  });

  it("rejects rating value above 5", async () => {
    const session = await adminSession();
    const res = await SELF.fetch(
      req("/api/settings/ratings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Cookie: `pl_session=${session}` },
        body: JSON.stringify({ thumbtackReviewCount: 100, thumbtackRatingValue: 5.5, taskrabbitReviewCount: 50, taskrabbitRatingValue: 5.0 }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects rating value below 1", async () => {
    const session = await adminSession();
    const res = await SELF.fetch(
      req("/api/settings/ratings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Cookie: `pl_session=${session}` },
        body: JSON.stringify({ thumbtackReviewCount: 100, thumbtackRatingValue: 0.5, taskrabbitReviewCount: 50, taskrabbitRatingValue: 5.0 }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects negative review count", async () => {
    const session = await adminSession();
    const res = await SELF.fetch(
      req("/api/settings/ratings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Cookie: `pl_session=${session}` },
        body: JSON.stringify({ thumbtackReviewCount: -10, thumbtackRatingValue: 4.9, taskrabbitReviewCount: 50, taskrabbitRatingValue: 5.0 }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects fractional review count (e.g. 100.6)", async () => {
    const session = await adminSession();
    const res = await SELF.fetch(
      req("/api/settings/ratings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Cookie: `pl_session=${session}` },
        body: JSON.stringify({ thumbtackReviewCount: 100.6, thumbtackRatingValue: 4.9, taskrabbitReviewCount: 50, taskrabbitRatingValue: 5.0 }),
      }),
    );
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// PUT /api/settings  (main settings — rating field validation)
// ---------------------------------------------------------------------------

describe("PUT /api/settings — rating field validation", () => {
  it("accepts valid rating strings and normalizes them", async () => {
    const session = await adminSession();
    const res = await SELF.fetch(
      req("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Cookie: `pl_session=${session}` },
        body: JSON.stringify({
          phone: "(770) 244-8550",
          thumbtackRating: "4.9",
          thumbtackReviewCount: "150",
          taskrabbitRating: "5.0",
          taskrabbitReviewCount: "50",
        }),
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, string>;
    // Normalized: stored as "4.9" not raw string
    expect(body.thumbtackRating).toBe("4.9");
    expect(body.thumbtackReviewCount).toBe("150");
    expect(body.taskrabbitRating).toBe("5.0");
    expect(body.taskrabbitReviewCount).toBe("50");
  });

  it("rejects thumbtackRating above 5", async () => {
    const session = await adminSession();
    const res = await SELF.fetch(
      req("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Cookie: `pl_session=${session}` },
        body: JSON.stringify({ phone: "(770) 244-8550", thumbtackRating: "6" }),
      }),
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/thumbtackRating/);
  });

  it("rejects non-numeric taskrabbitRating", async () => {
    const session = await adminSession();
    const res = await SELF.fetch(
      req("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Cookie: `pl_session=${session}` },
        body: JSON.stringify({ phone: "(770) 244-8550", taskrabbitRating: "great" }),
      }),
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/taskrabbitRating/);
  });

  it("rejects negative thumbtackReviewCount", async () => {
    const session = await adminSession();
    const res = await SELF.fetch(
      req("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Cookie: `pl_session=${session}` },
        body: JSON.stringify({ phone: "(770) 244-8550", thumbtackReviewCount: "-5" }),
      }),
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/thumbtackReviewCount/);
  });

  it("rejects trailing-junk rating strings like '4.9junk'", async () => {
    const session = await adminSession();
    const res = await SELF.fetch(
      req("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Cookie: `pl_session=${session}` },
        body: JSON.stringify({ phone: "(770) 244-8550", thumbtackRating: "4.9junk" }),
      }),
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/thumbtackRating/);
  });

  it("rejects fractional review count string like '100.6'", async () => {
    const session = await adminSession();
    const res = await SELF.fetch(
      req("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Cookie: `pl_session=${session}` },
        body: JSON.stringify({ phone: "(770) 244-8550", thumbtackReviewCount: "100.6" }),
      }),
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/thumbtackReviewCount/);
  });

  it("does not persist any rating when a later field is invalid (atomicity)", async () => {
    const session = await adminSession();
    // Set known good starting values
    await seedRatings({ thumbtackRating: "4.9", thumbtackReviewCount: "110", taskrabbitRating: "5.0", taskrabbitReviewCount: "384" });

    // Valid thumbtackReviewCount="999" but invalid taskrabbitRating="9.9"
    const res = await SELF.fetch(
      req("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Cookie: `pl_session=${session}` },
        body: JSON.stringify({
          phone: "(770) 244-8550",
          thumbtackReviewCount: "999",
          taskrabbitRating: "9.9",
        }),
      }),
    );
    expect(res.status).toBe(400);

    // thumbtackReviewCount must NOT have changed — the failed save is all-or-nothing
    const check = await SELF.fetch(req("/api/settings/ratings"));
    const data = (await check.json()) as Record<string, number>;
    expect(data.thumbtackReviewCount).toBe(110);
  });
});

// ---------------------------------------------------------------------------
// PUT /api/settings — googleReviewUrl validation
// ---------------------------------------------------------------------------

describe("PUT /api/settings — googleReviewUrl validation", () => {
  const BASE = { phone: "(770) 244-8550" };

  it("accepts an empty string (clears the link)", async () => {
    const session = await adminSession();
    const res = await SELF.fetch(
      req("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Cookie: `pl_session=${session}` },
        body: JSON.stringify({ ...BASE, googleReviewUrl: "" }),
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, string>;
    expect(body.googleReviewUrl).toBe("");
  });

  it("accepts a valid g.page HTTPS shortlink", async () => {
    const session = await adminSession();
    const res = await SELF.fetch(
      req("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Cookie: `pl_session=${session}` },
        body: JSON.stringify({ ...BASE, googleReviewUrl: "https://g.page/r/CdABC123/review" }),
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, string>;
    expect(body.googleReviewUrl).toBe("https://g.page/r/CdABC123/review");
  });

  it("accepts a valid google.com review link", async () => {
    const session = await adminSession();
    const res = await SELF.fetch(
      req("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Cookie: `pl_session=${session}` },
        body: JSON.stringify({ ...BASE, googleReviewUrl: "https://www.google.com/maps/place/Penny+Lane/@0,0,17z/data=!4m8!3m7!1s0x0:0xABC" }),
      }),
    );
    expect(res.status).toBe(200);
  });

  it("accepts a maps.app.goo.gl shortlink", async () => {
    const session = await adminSession();
    const res = await SELF.fetch(
      req("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Cookie: `pl_session=${session}` },
        body: JSON.stringify({ ...BASE, googleReviewUrl: "https://maps.app.goo.gl/abc123" }),
      }),
    );
    expect(res.status).toBe(200);
  });

  it("rejects a non-HTTPS URL (http://)", async () => {
    const session = await adminSession();
    const res = await SELF.fetch(
      req("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Cookie: `pl_session=${session}` },
        body: JSON.stringify({ ...BASE, googleReviewUrl: "http://g.page/r/CdABC123/review" }),
      }),
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/HTTPS/i);
  });

  it("rejects a javascript: scheme", async () => {
    const session = await adminSession();
    const res = await SELF.fetch(
      req("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Cookie: `pl_session=${session}` },
        body: JSON.stringify({ ...BASE, googleReviewUrl: "javascript:alert(1)" }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects a non-Google HTTPS URL", async () => {
    const session = await adminSession();
    const res = await SELF.fetch(
      req("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Cookie: `pl_session=${session}` },
        body: JSON.stringify({ ...BASE, googleReviewUrl: "https://phishing.com/fake-google-review" }),
      }),
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/Google/i);
  });

  it("rejects a relative URL (no scheme or host)", async () => {
    const session = await adminSession();
    const res = await SELF.fetch(
      req("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Cookie: `pl_session=${session}` },
        body: JSON.stringify({ ...BASE, googleReviewUrl: "/fake-path" }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects a malformed string that is not a URL", async () => {
    const session = await adminSession();
    const res = await SELF.fetch(
      req("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Cookie: `pl_session=${session}` },
        body: JSON.stringify({ ...BASE, googleReviewUrl: "not a url at all!!" }),
      }),
    );
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// GET /api/google-reviews — public list route
// ---------------------------------------------------------------------------

describe("GET /api/google-reviews", () => {
  beforeEach(async () => {
    const db = (env as unknown as { DB: D1Database }).DB;
    await db.prepare("DELETE FROM google_reviews").run();
  });

  it("returns an empty array when no reviews are synced", async () => {
    const res = await SELF.fetch(req("/api/google-reviews"));
    expect(res.status).toBe(200);
    const body = await res.json() as unknown[];
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(0);
  });

  it("returns synced reviews ordered by google_time DESC", async () => {
    const db = (env as unknown as { DB: D1Database }).DB;
    await db.prepare(
      `INSERT INTO google_reviews (author_name, author_photo_url, rating, text, google_time, synced_at) VALUES
       ('Alice', null, 5, 'Great work!', 1700000000, '2024-01-01T00:00:00.000Z'),
       ('Bob', 'https://example.com/b.jpg', 4, 'Good job.', 1710000000, '2024-01-02T00:00:00.000Z')`,
    ).run();

    const res = await SELF.fetch(req("/api/google-reviews"));
    expect(res.status).toBe(200);
    const body = await res.json() as Array<{
      id: number; authorName: string; authorPhotoUrl: string | null;
      rating: number; text: string; googleTime: number; syncedAt: string;
    }>;
    expect(body).toHaveLength(2);
    // Bob has the later google_time so comes first
    expect(body[0].authorName).toBe("Bob");
    expect(body[0].rating).toBe(4);
    expect(body[0].authorPhotoUrl).toBe("https://example.com/b.jpg");
    expect(body[1].authorName).toBe("Alice");
    expect(body[1].authorPhotoUrl).toBeNull();
  });

  it("filters out rows with empty text", async () => {
    const db = (env as unknown as { DB: D1Database }).DB;
    await db.prepare(
      `INSERT INTO google_reviews (author_name, author_photo_url, rating, text, google_time, synced_at) VALUES
       ('Carol', null, 5, '', 1700000000, '2024-01-01T00:00:00.000Z'),
       ('Dave', null, 5, 'Amazing!', 1700000001, '2024-01-01T00:00:00.000Z')`,
    ).run();

    const res = await SELF.fetch(req("/api/google-reviews"));
    const body = await res.json() as unknown[];
    // Only Dave should appear (Carol has empty text)
    expect(body).toHaveLength(1);
    expect((body[0] as { authorName: string }).authorName).toBe("Dave");
  });

  it("is accessible without authentication", async () => {
    // Public route — no session cookie
    const res = await SELF.fetch(req("/api/google-reviews"));
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Cron sync — scheduled handler integration tests
// ---------------------------------------------------------------------------

/** Mock Places API response factory */
function makePlacesResponse(reviews: Array<{
  author_name: string;
  profile_photo_url?: string;
  rating: number;
  text?: string;
  time: number;
}>) {
  return {
    status: "OK",
    result: { rating: 4.9, user_ratings_total: 100, reviews },
  };
}

function mockFetchWith(body: unknown) {
  vi.stubGlobal("fetch", (_url: string) =>
    Promise.resolve(
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    ),
  );
}

const NOOP_CONTROLLER = {
  scheduledTime: 0,
  cron: "0 6 * * *",
  noRetry() {},
};
const NOOP_CTX = { waitUntil: (_p: Promise<unknown>) => void 0, passThroughOnException() {} };

describe("Scheduled cron — Google reviews sync", () => {
  beforeEach(async () => {
    const db = (env as unknown as { DB: D1Database }).DB;
    await db.prepare("DELETE FROM google_reviews").run();
    await db.prepare("UPDATE site_settings SET value = '' WHERE key = 'google_place_id'").run();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("skips sync and leaves DB empty when google_place_id is not configured", async () => {
    // google_place_id is empty (set in beforeEach); GOOGLE_PLACES_API_KEY is present in test env
    await worker.scheduled(NOOP_CONTROLLER, env as never, NOOP_CTX as never);
    const db = (env as unknown as { DB: D1Database }).DB;
    const { results } = await db.prepare("SELECT * FROM google_reviews").all();
    expect((results ?? []).length).toBe(0);
  });

  it("inserts synced reviews into DB when place_id and API key are both set", async () => {
    const db = (env as unknown as { DB: D1Database }).DB;
    await db.prepare("UPDATE site_settings SET value = 'ChIJtest' WHERE key = 'google_place_id'").run();
    mockFetchWith(makePlacesResponse([
      { author_name: "Alice", profile_photo_url: "https://example.com/a.jpg", rating: 5, text: "Excellent work!", time: 1700000001 },
      { author_name: "Bob", rating: 4, text: "Very professional.", time: 1700000002 },
    ]));

    await worker.scheduled(NOOP_CONTROLLER, env as never, NOOP_CTX as never);

    const { results } = await db.prepare(
      "SELECT author_name, rating, text, author_photo_url FROM google_reviews ORDER BY google_time",
    ).all<{ author_name: string; rating: number; text: string; author_photo_url: string | null }>();
    expect(results).toHaveLength(2);
    expect(results[0].author_name).toBe("Alice");
    expect(results[0].rating).toBe(5);
    expect(results[0].text).toBe("Excellent work!");
    expect(results[0].author_photo_url).toBe("https://example.com/a.jpg");
    expect(results[1].author_name).toBe("Bob");
    expect(results[1].author_photo_url).toBeNull();
  });

  it("filters out reviews with empty or missing text", async () => {
    const db = (env as unknown as { DB: D1Database }).DB;
    await db.prepare("UPDATE site_settings SET value = 'ChIJtest' WHERE key = 'google_place_id'").run();
    mockFetchWith(makePlacesResponse([
      { author_name: "Carol", rating: 5, text: "Great!", time: 1700000001 },
      { author_name: "Dave", rating: 5, text: "", time: 1700000002 },
      { author_name: "Eve", rating: 5, time: 1700000003 }, // no text field
    ]));

    await worker.scheduled(NOOP_CONTROLLER, env as never, NOOP_CTX as never);

    const { results } = await db.prepare("SELECT author_name FROM google_reviews").all<{ author_name: string }>();
    expect(results).toHaveLength(1);
    expect(results[0].author_name).toBe("Carol");
  });

  it("upserts on re-sync (same author_name + google_time, updated rating/text)", async () => {
    const db = (env as unknown as { DB: D1Database }).DB;
    await db.prepare("UPDATE site_settings SET value = 'ChIJtest' WHERE key = 'google_place_id'").run();

    // First sync
    mockFetchWith(makePlacesResponse([
      { author_name: "Frank", rating: 4, text: "Pretty good", time: 1720000000 },
    ]));
    await worker.scheduled(NOOP_CONTROLLER, env as never, NOOP_CTX as never);

    // Second sync — same author+time, updated content
    mockFetchWith(makePlacesResponse([
      { author_name: "Frank", rating: 5, text: "Changed my mind — excellent!", time: 1720000000 },
    ]));
    await worker.scheduled(NOOP_CONTROLLER, env as never, NOOP_CTX as never);

    const { results } = await db.prepare(
      "SELECT rating, text FROM google_reviews WHERE author_name = 'Frank'",
    ).all<{ rating: number; text: string }>();
    expect(results).toHaveLength(1);
    expect(results[0].rating).toBe(5);
    expect(results[0].text).toBe("Changed my mind — excellent!");
  });

  it("does not write to DB when Places API returns a non-OK status", async () => {
    const db = (env as unknown as { DB: D1Database }).DB;
    await db.prepare("UPDATE site_settings SET value = 'ChIJtest' WHERE key = 'google_place_id'").run();
    mockFetchWith({ status: "INVALID_REQUEST", result: null });

    await worker.scheduled(NOOP_CONTROLLER, env as never, NOOP_CTX as never);

    const { results } = await db.prepare("SELECT * FROM google_reviews").all();
    expect((results ?? []).length).toBe(0);
  });

  it("removes a review that was deleted on Google after the next successful sync", async () => {
    const db = (env as unknown as { DB: D1Database }).DB;
    await db.prepare("UPDATE site_settings SET value = 'ChIJtest' WHERE key = 'google_place_id'").run();

    // First sync: two reviews
    mockFetchWith(makePlacesResponse([
      { author_name: "Grace", rating: 5, text: "Loved it!", time: 1720000001 },
      { author_name: "Henry", rating: 4, text: "Good work.", time: 1720000002 },
    ]));
    await worker.scheduled(NOOP_CONTROLLER, env as never, NOOP_CTX as never);

    // Second sync: Grace's review was removed on Google
    mockFetchWith(makePlacesResponse([
      { author_name: "Henry", rating: 4, text: "Good work.", time: 1720000002 },
    ]));
    await worker.scheduled(NOOP_CONTROLLER, env as never, NOOP_CTX as never);

    const { results } = await db.prepare(
      "SELECT author_name FROM google_reviews ORDER BY google_time",
    ).all<{ author_name: string }>();
    expect(results).toHaveLength(1);
    expect(results[0].author_name).toBe("Henry");
  });

  it("preserves existing reviews when Places API call fails (no DB change)", async () => {
    const db = (env as unknown as { DB: D1Database }).DB;
    await db.prepare("UPDATE site_settings SET value = 'ChIJtest' WHERE key = 'google_place_id'").run();

    // Seed initial reviews via a successful sync
    mockFetchWith(makePlacesResponse([
      { author_name: "Iris", rating: 5, text: "Fantastic!", time: 1720000001 },
    ]));
    await worker.scheduled(NOOP_CONTROLLER, env as never, NOOP_CTX as never);

    // Simulate API failure on next sync — existing rows must survive
    mockFetchWith({ status: "OVER_QUERY_LIMIT", result: null });
    await worker.scheduled(NOOP_CONTROLLER, env as never, NOOP_CTX as never);

    const { results } = await db.prepare("SELECT author_name FROM google_reviews").all<{ author_name: string }>();
    expect(results).toHaveLength(1);
    expect(results[0].author_name).toBe("Iris");
  });
});

// ---------------------------------------------------------------------------
// Google Place ID saved via PUT /api/settings
// ---------------------------------------------------------------------------

describe("PUT /api/settings — googlePlaceId field", () => {
  const BASE = {
    phone: "(770) 555-0001",
    ownerEmail: "owner@example.com",
    notifyFromEmail: "noreply@example.com",
    notifyFromName: "Test Site",
    thumbtackRating: "4.9",
    thumbtackReviewCount: "110",
    taskrabbitRating: "5.0",
    taskrabbitReviewCount: "384",
  };

  it("saves and returns googlePlaceId when provided", async () => {
    const session = await adminSession();
    const res = await SELF.fetch(
      req("/api/settings", {
        method: "PUT",
        headers: { "content-type": "application/json", cookie: `pl_session=${session}` },
        body: JSON.stringify({ ...BASE, googlePlaceId: "ChIJN1t_tDeuEmsRUsoyG83frY4" }),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json() as { googlePlaceId: string };
    expect(body.googlePlaceId).toBe("ChIJN1t_tDeuEmsRUsoyG83frY4");
  });

  it("trims whitespace from googlePlaceId", async () => {
    const session = await adminSession();
    const res = await SELF.fetch(
      req("/api/settings", {
        method: "PUT",
        headers: { "content-type": "application/json", cookie: `pl_session=${session}` },
        body: JSON.stringify({ ...BASE, googlePlaceId: "  ChIJtest  " }),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json() as { googlePlaceId: string };
    expect(body.googlePlaceId).toBe("ChIJtest");
  });

  it("accepts empty string to clear googlePlaceId", async () => {
    const session = await adminSession();
    const res = await SELF.fetch(
      req("/api/settings", {
        method: "PUT",
        headers: { "content-type": "application/json", cookie: `pl_session=${session}` },
        body: JSON.stringify({ ...BASE, googlePlaceId: "" }),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json() as { googlePlaceId: string };
    expect(body.googlePlaceId).toBe("");
  });

  it("returns googlePlaceId in GET /api/settings", async () => {
    const session = await adminSession();
    await SELF.fetch(
      req("/api/settings", {
        method: "PUT",
        headers: { "content-type": "application/json", cookie: `pl_session=${session}` },
        body: JSON.stringify({ ...BASE, googlePlaceId: "ChIJreadback" }),
      }),
    );
    const res = await SELF.fetch(req("/api/settings"));
    const body = await res.json() as { googlePlaceId: string };
    expect(body.googlePlaceId).toBe("ChIJreadback");
  });
});

// ---------------------------------------------------------------------------
// Homepage JSON-LD injection
// ---------------------------------------------------------------------------

describe("Homepage JSON-LD injection", () => {
  it("injects live DB values into the aggregateRating block", async () => {
    await seedRatings({ thumbtackRating: "4.5", thumbtackReviewCount: "200", taskrabbitRating: "5.0", taskrabbitReviewCount: "100" });
    const res = await SELF.fetch(req("/"));
    expect(res.status).toBe(200);
    const html = await res.text();
    // Placeholders must be gone
    expect(html).not.toContain("__AGGREGATE_REVIEW_COUNT__");
    expect(html).not.toContain("__AGGREGATE_RATING_VALUE__");
    // Aggregate: 300 reviews total, (200*4.5 + 100*5.0)/300 = 900+500/300 = 4.667 → 4.7
    expect(html).toContain('"reviewCount": "300"');
    expect(html).toContain('"ratingValue": "4.7"');
  });

  it("updates injected values after admin saves new counts", async () => {
    await seedRatings({ thumbtackRating: "4.9", thumbtackReviewCount: "500", taskrabbitRating: "5.0", taskrabbitReviewCount: "50" });
    const res = await SELF.fetch(req("/"));
    const html = await res.text();
    expect(html).toContain('"reviewCount": "550"');
  });

  it("contains exactly one aggregateRating across all parsed ld+json blocks — guards against the GSC 'multiple aggregate ratings' error", async () => {
    await seedRatings({});
    const res = await SELF.fetch(req("/"));
    const html = await res.text();

    // Parse every application/ld+json script block in the page
    const scriptPattern = /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
    const blocks: unknown[] = [];
    let m: RegExpExecArray | null;
    while ((m = scriptPattern.exec(html)) !== null) {
      blocks.push(JSON.parse(m[1]));
    }
    expect(blocks.length).toBeGreaterThan(0);

    // Count entities that carry an aggregateRating
    const withRating = blocks.filter(
      (b) => typeof b === "object" && b !== null && "aggregateRating" in b,
    );
    expect(withRating.length).toBe(1);
  });

  it("bestRating and worstRating are JSON numbers — not strings — after injection", async () => {
    await seedRatings({});
    const res = await SELF.fetch(req("/"));
    const html = await res.text();

    const scriptPattern = /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
    let m: RegExpExecArray | null;
    let ar: Record<string, unknown> | null = null;
    while ((m = scriptPattern.exec(html)) !== null) {
      const obj = JSON.parse(m[1]) as Record<string, unknown>;
      if ("aggregateRating" in obj) {
        ar = obj["aggregateRating"] as Record<string, unknown>;
        break;
      }
    }
    expect(ar).not.toBeNull();
    // Must be JS numbers — JSON.parse("5") === 5 (number), JSON.parse('"5"') === "5" (string)
    expect(typeof ar!["bestRating"]).toBe("number");
    expect(ar!["bestRating"]).toBe(5);
    expect(typeof ar!["worstRating"]).toBe("number");
    expect(ar!["worstRating"]).toBe(1);
  });

  it("aggregateRating block has a name field after injection", async () => {
    await seedRatings({});
    const res = await SELF.fetch(req("/"));
    const html = await res.text();

    const scriptPattern = /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
    let m: RegExpExecArray | null;
    let ar: Record<string, unknown> | null = null;
    while ((m = scriptPattern.exec(html)) !== null) {
      const obj = JSON.parse(m[1]) as Record<string, unknown>;
      if ("aggregateRating" in obj) {
        ar = obj["aggregateRating"] as Record<string, unknown>;
        break;
      }
    }
    expect(ar).not.toBeNull();
    expect(typeof ar!["name"]).toBe("string");
    expect((ar!["name"] as string).length).toBeGreaterThan(0);
  });
});
