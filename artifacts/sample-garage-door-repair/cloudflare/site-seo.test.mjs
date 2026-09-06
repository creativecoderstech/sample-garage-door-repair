import test from "node:test";
import assert from "node:assert/strict";
import { describeRoute, renderSitemap, renderRobots, serveSiteDocument } from "./site-seo.mjs";

const records = [
  { id: "home", kind: "page", slug: "home", status: "published", title: "Home", summary: "Plan safe service", updatedAt: "2026-09-06T12:00:00Z" },
  { id: "guide", kind: "service", slug: "spring-care", aliases: ["spring-repair"], status: "published", title: "Spring guide", summary: "Safe observations", imageUrl: "/images/spring.jpg" },
  { id: "draft", kind: "article", slug: "hidden", status: "draft", title: "Draft" },
];
const base = "https://example.com";

test("canonical routes normalize preview prefix, trailing slash, query and hash", () => {
  const route = describeRoute(`${base}/sample-garage-door-repair/services/spring-care/?x=1#title`, records);
  assert.equal(route.status, 200);
  assert.equal(route.canonical, `${base}/services/spring-care`);
  assert.equal(route.image, `${base}/images/spring.jpg`);
  assert.equal(route.robots, "noindex, nofollow, noarchive");
});

test("aliases redirect, drafts/unknown return 404, legacy booking preserves anchor", () => {
  assert.equal(describeRoute(`${base}/services/spring-repair`, records).redirect, "/services/spring-care");
  assert.equal(describeRoute(`${base}/blog/hidden`, records).status, 404);
  assert.equal(describeRoute(`${base}/bogus`, records).status, 404);
  assert.equal(describeRoute(`${base}/book`, records).redirect, "/contact#booking");
});

test("sitemap lists published canonical routes only; robots keep demo private", () => {
  const xml = renderSitemap(base, records);
  assert.ok(xml.includes(`${base}/services/spring-care`));
  assert.ok(!xml.includes("hidden"));
  assert.ok(!xml.includes("spring-repair"));
  assert.ok(!xml.includes("/admin"));
  assert.ok(renderRobots(base).includes("Disallow: /"));
});

test("server HTML replaces stale metadata, escapes owner text and emits no fake claims", async () => {
  const malicious = { ...records[0], title: 'Safe </title><script>alert(1)</script>', summary: '" unsafe <tag>' };
  const response = await serveSiteDocument(new Request(base),
    new Response('<html><head><title>Old</title><meta name="description" content="Old"><link rel="canonical" href="https://old.test"></head><body></body></html>', { headers: { "content-type": "text/html", etag: "old" } }),
    [malicious], { businessName: "Sample Garage" });
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("etag"), null);
  assert.ok(!html.includes("https://old.test"));
  assert.ok(!html.includes("<script>alert"));
  assert.ok(html.includes("application/ld+json"));
  assert.ok(!html.includes("LocalBusiness"));
  assert.ok(!html.includes("AggregateRating"));
  assert.equal((html.match(/<title>/g) || []).length, 1);
});