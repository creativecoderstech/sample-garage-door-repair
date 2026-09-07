import test from "node:test";
import assert from "node:assert/strict";
import { describeRoute, renderSitemap, renderRobots, serveSiteDocument } from "./site-seo.mjs";

const records = [
  { id: "home", kind: "page", slug: "home", status: "published", reviewedSeed: true, title: "Home", summary: "Request service", updatedAt: "2026-09-06T12:00:00Z" },
  { id: "guide", kind: "service", slug: "spring-care", aliases: ["spring-repair"], status: "published", reviewedSeed: true, title: "Spring replacement", summary: "Professional spring service", imageUrl: "/images/spring.jpg" },
  { id: "draft", kind: "article", slug: "hidden", status: "draft", title: "Draft" },
];
const base = "https://example.com";
const approved = { launchReady: true, runtimeReady: true, canonicalOrigin: base, businessName: "Cumming Garage Door Service", phone: "owner-verified-phone", email: "owner-verified-email", serviceArea: "owner-verified-coverage" };

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

test("sitemap lists approved public routes only and preview indexing stays blocked", () => {
  const xml = renderSitemap(base, records, approved);
  assert.ok(xml.includes(`${base}/services/spring-care`));
  assert.ok(!xml.includes("hidden"));
  assert.ok(!xml.includes("spring-repair"));
  assert.ok(!xml.includes("/admin"));
  assert.ok(renderRobots(base).includes("Disallow: /"));
  assert.ok(!renderSitemap(base, records).includes("<url>"));
  assert.ok(!renderSitemap("https://branch.pages.dev", records, approved).includes("<url>"));
  assert.ok(renderRobots(base, approved).includes("Allow: /"));
});

test("server HTML replaces stale metadata, escapes owner text and emits no fake claims", async () => {
  const malicious = { ...records[0], title: 'Safe </title><script>alert(1)</script>', summary: '" unsafe <tag>' };
  const response = await serveSiteDocument(new Request(base),
    new Response('<html><head><title>Old</title><meta name="description" content="Old"><link rel="canonical" href="https://old.test"></head><body></body></html>', { headers: { "content-type": "text/html", etag: "old" } }),
    [malicious], { businessName: "Cumming Garage Door Service" });
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

test("approval requires runtime validation and exact canonical host", () => {
  assert.equal(describeRoute(base, records, approved).robots, "index, follow");
  assert.equal(describeRoute("https://branch.pages.dev", records, approved).robots, "noindex, nofollow, noarchive");
  assert.equal(describeRoute(base, records, { ...approved, runtimeReady: false }).robots, "noindex, nofollow, noarchive");
  const graph = describeRoute(base, records, approved).structuredData["@graph"];
  assert.ok(graph.some(node => node["@type"] === "HomeAndConstructionBusiness"));
  assert.ok(!JSON.stringify(graph).includes("aggregateRating"));
});

test("unreviewed copy, unverified locations and staff never become SEO public claims", () => {
  const unsafe = [
    { ...records[1], reviewedSeed: false, verificationStatus: "unverified" },
    { ...records[0], kind: "location", slug: "unconfirmed", verificationStatus: "unverified" },
  ];
  assert.ok(!renderSitemap(base, unsafe, approved).includes("<url>"));
  for (const path of ["/admin", "/login", "/sign-in/sso-callback", "/sign-up"]) {
    const route = describeRoute(`${base}${path}`, records, approved);
    assert.equal(route.status, 200);
    assert.equal(route.robots, "noindex, nofollow, noarchive");
    assert.equal(route.structuredData["@graph"].length, 0);
  }
});