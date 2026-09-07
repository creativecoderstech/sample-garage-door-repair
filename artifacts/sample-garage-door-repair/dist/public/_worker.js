const CORE_ROUTES = {
  home: "/",
  services: "/services",
  "service-area": "/service-area",
  about: "/about",
  blog: "/blog",
  contact: "/contact",
  gallery: "/gallery",
  faqs: "/faqs"
};
const DETAIL_ROUTES = { service: "/services", location: "/service-area", article: "/blog" };
const LEGACY_ROUTES = {
  "/book": "/contact#booking",
  "/booking": "/contact#booking",
  "/before-after": "/gallery#before-after",
  "/faq": "/faqs"
};
const PREVIEW_PREFIX = "/sample-garage-door-repair";
const BRAND = "Cumming Garage Door Service";
const PRIVATE_ROUTE = /^\/(?:admin|login|sign-in|sign-up)(?:\/|$)/;
const visible = (item) => item.status === "published" && (item.verificationStatus === "verified" || item.reviewedSeed === true) && (!["trust", "location"].includes(item.kind) || item.verificationStatus === "verified");
const noindex = "noindex, nofollow, noarchive";
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
function contentPath(item) {
  if (item.kind === "page") return CORE_ROUTES[item.slug] || `/pages/${item.slug}`;
  return DETAIL_ROUTES[item.kind] ? `${DETAIL_ROUTES[item.kind]}/${item.slug}` : null;
}
function normalizePublicPath(path) {
  const unprefixed = path === PREVIEW_PREFIX ? "/" : path.startsWith(`${PREVIEW_PREFIX}/`) ? path.slice(PREVIEW_PREFIX.length) : path;
  return unprefixed.replace(/\/+$/, "") || "/";
}
function describeRoute(requestUrl, content, settings = {}) {
  const url = new URL(requestUrl);
  const path = normalizePublicPath(url.pathname);
  const publicRecords = content.filter(visible);
  const item = publicRecords.find((record) => contentPath(record) === path);
  const alias = publicRecords.find((record) => (record.aliases || []).some((slug) => contentPath({ ...record, slug }) === path));
  const legacy = LEGACY_ROUTES[path];
  const redirect = legacy || (alias ? contentPath(alias) : null);
  const isAdmin = PRIVATE_ROUTE.test(path);
  const rawTitle = item ? item.seoTitle || item.title : isAdmin ? "Staff sign-in" : "Page not found";
  const title = rawTitle.includes(BRAND) ? rawTitle : `${rawTitle} | ${BRAND}`;
  const description = item ? item.seoDescription || item.summary : isAdmin ? `Authorized staff access for ${BRAND}.` : "This page is unavailable. Explore our garage-door services or send a service request.";
  const origin = canonicalOrigin(requestUrl, settings);
  const indexable = canIndex(requestUrl, settings) && !!item && !isAdmin;
  const canonical = new URL(item ? contentPath(item) : path, origin).href;
  const name = BRAND;
  const pageType = item?.kind === "article" ? "Article" : "WebPage";
  const graph = item ? [
    { "@type": "WebSite", "@id": `${origin}/#website`, name, url: `${origin}/` },
    {
      "@type": pageType,
      "@id": `${canonical}#page`,
      url: canonical,
      name: title,
      ...pageType === "Article" ? { headline: item.title } : {},
      description,
      isPartOf: { "@id": `${origin}/#website` },
      ...item.updatedAt ? { dateModified: item.updatedAt } : {}
    },
    ...path !== "/" ? [{
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${origin}/` },
        { "@type": "ListItem", position: 2, name: item.title, item: canonical }
      ]
    }] : []
  ] : [];
  if (indexable && settings.phone && settings.email && settings.serviceArea) {
    graph.push({
      "@type": "HomeAndConstructionBusiness",
      "@id": `${origin}/#business`,
      name,
      url: `${origin}/`,
      telephone: settings.phone,
      email: settings.email,
      areaServed: settings.serviceArea
      // Do not fabricate a street address, ratings, prices, or opening-hours syntax.
    });
  }
  let image = "";
  if (item?.imageUrl && /^(?:\/(?!\/)|https:\/\/)/i.test(item.imageUrl)) {
    image = new URL(item.imageUrl, origin).href;
  }
  return {
    item,
    title,
    description,
    canonical,
    image,
    name,
    redirect,
    path,
    status: item || isAdmin ? 200 : 404,
    robots: indexable ? "index, follow" : noindex,
    origin,
    indexable,
    indexingAllowed: canIndex(requestUrl, settings),
    structuredData: { "@context": "https://schema.org", "@graph": graph }
  };
}
function canonicalOrigin(requestUrl, settings = {}) {
  try {
    const configured = new URL(settings.canonicalOrigin);
    if (configured.protocol === "https:" && configured.pathname === "/" && !configured.username && !configured.password) {
      return configured.origin;
    }
  } catch {
  }
  return new URL(requestUrl).origin;
}
function canIndex(requestUrl, settings = {}) {
  return settings.launchReady === true && settings.runtimeReady === true && typeof settings.canonicalOrigin === "string" && new URL(requestUrl).origin === canonicalOrigin(requestUrl, settings) && !new URL(requestUrl).pathname.startsWith(PREVIEW_PREFIX);
}
function renderSitemap(requestUrl, content, settings = {}) {
  const origin = canonicalOrigin(requestUrl, settings);
  const routes = new Map((canIndex(requestUrl, settings) ? content : []).filter(visible).map((item) => [contentPath(item), item]).filter(([path]) => path));
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
` + [...routes].map(([path, item]) => {
    const date = new Date(item.updatedAt);
    const lastmod = Number.isFinite(date.getTime()) ? `<lastmod>${date.toISOString()}</lastmod>` : "";
    return `  <url><loc>${escapeHtml(new URL(path, origin).href)}</loc>${lastmod}</url>`;
  }).join("\n") + "\n</urlset>";
}
function renderRobots(requestUrl, settings = {}) {
  if (!canIndex(requestUrl, settings)) return "User-agent: *\nDisallow: /\n";
  return `User-agent: *
Allow: /
Disallow: /admin
Disallow: /login
Disallow: /sign-in
Disallow: /sign-up
Disallow: /api/

Sitemap: ${canonicalOrigin(requestUrl, settings)}/sitemap.xml
`;
}
function renderMetadata(route) {
  const attribute = (value) => escapeHtml(value);
  const json2 = JSON.stringify(route.structuredData).replace(/</g, "\\u003c");
  return [
    `<title>${escapeHtml(route.title)}</title>`,
    `<meta name="description" content="${attribute(route.description)}">`,
    `<meta name="robots" content="${route.robots}">`,
    `<meta name="garage-indexing" content="${route.indexingAllowed ? "approved" : "blocked"}">`,
    `<meta name="garage-canonical-origin" content="${attribute(route.origin)}">`,
    `<link rel="canonical" href="${attribute(route.canonical)}">`,
    `<meta property="og:title" content="${attribute(route.title)}">`,
    `<meta property="og:description" content="${attribute(route.description)}">`,
    `<meta property="og:url" content="${attribute(route.canonical)}">`,
    `<meta property="og:site_name" content="${attribute(route.name)}">`,
    `<meta property="og:type" content="${route.item?.kind === "article" ? "article" : "website"}">`,
    `<meta name="twitter:card" content="${route.image ? "summary_large_image" : "summary"}">`,
    `<meta name="twitter:title" content="${attribute(route.title)}">`,
    `<meta name="twitter:description" content="${attribute(route.description)}">`,
    ...route.image ? [
      `<meta property="og:image" content="${attribute(route.image)}">`,
      `<meta name="twitter:image" content="${attribute(route.image)}">`
    ] : [],
    `<script id="garage-route-schema" type="application/ld+json">${json2}<\/script>`
  ].join("\n");
}
async function serveSiteDocument(request, assetResponse, content, settings) {
  const url = new URL(request.url);
  const route = describeRoute(request.url, content, settings);
  const prefixed = url.pathname === PREVIEW_PREFIX || url.pathname.startsWith(`${PREVIEW_PREFIX}/`);
  if (route.redirect || prefixed) {
    return new Response(null, {
      status: 301,
      headers: { location: new URL(route.redirect || `${route.path}${url.search}`, url.origin).href, "cache-control": "no-store" }
    });
  }
  if (!assetResponse.ok || !assetResponse.headers.get("content-type")?.includes("text/html")) {
    return assetResponse;
  }
  let html = await assetResponse.text();
  html = html.replace(/<title>[\s\S]*?<\/title>/gi, "").replace(/<meta\b[^>]*(?:name|property)=["'](?:description|robots|og:[^"']+|twitter:[^"']+)["'][^>]*>/gi, "").replace(/<link\b[^>]*rel=["']canonical["'][^>]*>/gi, "").replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, "").replace("</head>", `${renderMetadata(route)}
</head>`);
  const headers = new Headers(assetResponse.headers);
  headers.delete("content-length");
  headers.delete("etag");
  headers.set("cache-control", "no-store");
  headers.set("x-robots-tag", route.robots);
  return new Response(request.method === "HEAD" ? null : html, { status: route.status, headers });
}
function launchRuntime(env, requestUrl) {
  let canonicalOrigin2 = "";
  try {
    const url = new URL(env.PUBLIC_SITE_ORIGIN);
    if (url.protocol === "https:" && url.pathname === "/" && !url.search && !url.hash && !url.username && !url.password && !url.hostname.endsWith(".example") && !url.hostname.endsWith(".pages.dev") && !url.hostname.endsWith(".replit.dev") && url.hostname !== "example.com" && url.hostname !== "localhost") {
      canonicalOrigin2 = url.origin;
    }
  } catch {
  }
  const checks = {
    productionEnvironment: env.CLOUDFLARE_ENV === "production",
    canonicalHost: !!canonicalOrigin2 && new URL(requestUrl).origin === canonicalOrigin2,
    database: typeof env.DB?.prepare === "function",
    privateStorage: typeof env.MEDIA?.get === "function" && typeof env.MEDIA?.put === "function",
    aiProvider: typeof env.AI?.run === "function",
    pagesAssets: typeof env.ASSETS?.fetch === "function",
    liveGoogleAuth: String(env.CLERK_PUBLISHABLE_KEY || "").startsWith("pk_live_") && String(env.CLERK_SECRET_KEY || "").startsWith("sk_live_"),
    turnstile: !!env.TURNSTILE_SITE_KEY && !!env.TURNSTILE_SECRET_KEY && !/^[123]x0{10}/.test(String(env.TURNSTILE_SITE_KEY)) && !/^[123]x0{10}/.test(String(env.TURNSTILE_SECRET_KEY))
  };
  return { canonicalOrigin: canonicalOrigin2, runtimeReady: Object.values(checks).every(Boolean), runtimeChecks: checks };
}
const enc = new TextEncoder();
const decode = (value) => JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(value.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0))));
const email = (value) => String(value || "").trim().toLowerCase();
const production = (env) => env.CLOUDFLARE_ENV === "production" || env.ENVIRONMENT === "production" || env.CF_PAGES_BRANCH === "main";
const environment = (env) => production(env) ? "production" : "development";
function normalizedOrigin(value) {
  try {
    return value ? new URL(value.includes("://") ? value : `https://${value}`).origin : "";
  } catch {
    return "";
  }
}
function assertTrustedPagesOrigin(request, env) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const allowed = new Set([
    new URL(request.url).origin,
    normalizedOrigin(env.PUBLIC_SITE_ORIGIN),
    normalizedOrigin(env.CF_PAGES_URL)
  ].filter(Boolean));
  let normalized;
  try {
    normalized = new URL(origin).origin;
  } catch {
    throw Object.assign(new Error("Untrusted staff request origin."), { status: 403 });
  }
  if (!allowed.has(normalized)) throw Object.assign(new Error("Untrusted staff request origin."), { status: 403 });
}
function sessionToken(request) {
  const bearer = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (bearer) return bearer;
  const cookies = request.headers.get("cookie") || "";
  return cookies.split(";").map((item) => item.trim().split("=")).find(([key]) => key === "__session")?.[1] || "";
}
function configuredIssuer(env) {
  if (env.CLERK_ISSUER) return String(env.CLERK_ISSUER).replace(/\/$/, "");
  const key = String(env.CLERK_PUBLISHABLE_KEY || "");
  const encoded = key.replace(/^pk_(?:test|live)_/, "");
  try {
    const domain = atob(encoded.replace(/-/g, "+").replace(/_/g, "/")).replace(/\$$/, "");
    return domain ? `https://${domain}` : "";
  } catch {
    return "";
  }
}
async function clerkIdentity(request, env) {
  if (!env.CLERK_SECRET_KEY || !env.CLERK_PUBLISHABLE_KEY) throw Object.assign(new Error("Pages staff authentication is not configured."), { status: 503 });
  if (production(env) && (String(env.CLERK_SECRET_KEY).startsWith("sk_test_") || String(env.CLERK_PUBLISHABLE_KEY).startsWith("pk_test_"))) {
    throw Object.assign(new Error("Production Pages staff authentication requires Clerk live keys and callbacks."), { status: 503 });
  }
  const token = sessionToken(request), parts = token.split(".");
  if (parts.length !== 3) throw Object.assign(new Error("Sign in with Google to continue."), { status: 401 });
  let header, claims;
  try {
    header = decode(parts[0]);
    claims = decode(parts[1]);
  } catch {
    throw Object.assign(new Error("Malformed staff session."), { status: 401 });
  }
  const issuer = configuredIssuer(env);
  if (header.alg !== "RS256" || typeof header.kid !== "string" || claims.iss !== issuer || typeof claims.sub !== "string" || !claims.sub) throw Object.assign(new Error("Invalid staff session."), { status: 401 });
  const now = Math.floor(Date.now() / 1e3);
  if (!Number.isFinite(claims.exp) || claims.exp <= now || claims.nbf !== void 0 && (!Number.isFinite(claims.nbf) || claims.nbf > now + 30)) {
    throw Object.assign(new Error("Staff session expired."), { status: 401 });
  }
  const host = new URL(request.url).origin;
  if (claims.azp !== void 0 && (typeof claims.azp !== "string" || claims.azp !== host)) throw Object.assign(new Error("Staff session origin is invalid."), { status: 401 });
  const jwks = await (await fetch(`${issuer}/.well-known/jwks.json`)).json();
  const jwk = jwks.keys?.find((key2) => key2.kid === header.kid && key2.kty === "RSA");
  if (!jwk) throw Object.assign(new Error("Unable to verify staff session."), { status: 401 });
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  let signature;
  try {
    signature = Uint8Array.from(atob(parts[2].replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
  } catch {
    throw Object.assign(new Error("Malformed staff session signature."), { status: 401 });
  }
  if (!await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, signature, enc.encode(`${parts[0]}.${parts[1]}`))) {
    throw Object.assign(new Error("Invalid staff session signature."), { status: 401 });
  }
  const response = await fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(claims.sub)}`, {
    headers: { authorization: `Bearer ${env.CLERK_SECRET_KEY}`, accept: "application/json" }
  });
  if (!response.ok) throw Object.assign(new Error("Unable to verify the signed-in Google account."), { status: 401 });
  const user = await response.json();
  const primary = user.email_addresses?.find((item) => item.id === user.primary_email_address_id);
  const primaryEmail = email(primary?.email_address);
  const google = user.external_accounts?.some((account) => account.provider === "oauth_google" && account.verification?.status === "verified" && (!account.email_address || email(account.email_address) === primaryEmail));
  if (!primaryEmail || primary?.verification?.status !== "verified" || !google) throw Object.assign(new Error("Use a Google account with a verified primary email address."), { status: 401 });
  return { userId: user.id, email: primaryEmail };
}
async function staffActor(request, env, minimum = "staff") {
  assertTrustedPagesOrigin(request, env);
  if (!env.DB) throw Object.assign(new Error("Staff database is not configured."), { status: 503 });
  const identity = await clerkIdentity(request, env);
  let row = await env.DB.prepare("SELECT * FROM garage_staff_access WHERE clerk_user_id=? OR (clerk_user_id IS NULL AND email=? COLLATE NOCASE) ORDER BY clerk_user_id IS NULL LIMIT 1").bind(identity.userId, identity.email).first();
  const claimed = await env.DB.prepare("SELECT 1 claimed FROM garage_auth_bootstrap WHERE environment=?").bind(environment(env)).first();
  if (!claimed && email(env.GARAGE_BOOTSTRAP_EMAIL) === identity.email) {
    const id = row?.id || crypto.randomUUID(), now = (/* @__PURE__ */ new Date()).toISOString();
    const access = row ? env.DB.prepare("UPDATE garage_staff_access SET clerk_user_id=?,role='super_admin',protected_owner=1,redeemed_at=? WHERE id=?").bind(identity.userId, now, id) : env.DB.prepare("INSERT INTO garage_staff_access(id,email,clerk_user_id,role,protected_owner,redeemed_at) SELECT ?,?,?,'super_admin',1,? WHERE NOT EXISTS(SELECT 1 FROM garage_auth_bootstrap WHERE environment=?)").bind(id, identity.email, identity.userId, now, environment(env));
    const bootstrap = env.DB.prepare("INSERT OR IGNORE INTO garage_auth_bootstrap(environment,clerk_user_id,access_id,claimed_at) VALUES(?,?,?,?)").bind(environment(env), identity.userId, id, now);
    const audit2 = env.DB.prepare(`INSERT INTO garage_auth_audit(actor_user_id,actor_role,action,resource_type,resource_id,changed_fields_json) SELECT ?,'super_admin','staff_access.bootstrap','staff_access',?,'["email","role"]' WHERE changes()>0`).bind(identity.userId, id);
    await env.DB.batch([access, bootstrap, audit2]);
    row = await env.DB.prepare("SELECT * FROM garage_staff_access WHERE clerk_user_id=?").bind(identity.userId).first();
  } else if (row && !row.clerk_user_id) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    await env.DB.batch([
      env.DB.prepare("UPDATE garage_staff_access SET clerk_user_id=?,redeemed_at=? WHERE id=? AND clerk_user_id IS NULL").bind(identity.userId, now, row.id),
      env.DB.prepare(`INSERT INTO garage_auth_audit(actor_user_id,actor_role,action,resource_type,resource_id,changed_fields_json) VALUES(?,?,'staff_access.redeemed','staff_access',?,'["clerk_user_id"]')`).bind(identity.userId, row.role, row.id)
    ]);
    row = await env.DB.prepare("SELECT * FROM garage_staff_access WHERE clerk_user_id=?").bind(identity.userId).first();
  }
  if (!row) throw Object.assign(new Error("This Google account has not been granted staff access."), { status: 403 });
  const rank = { staff: 1, admin: 2, super_admin: 3 };
  if (rank[row.role] < rank[minimum]) throw Object.assign(new Error("Your staff role cannot perform this action."), { status: 403 });
  return { accessId: row.id, userId: identity.userId, email: row.email, role: row.role };
}
async function listAccess(env) {
  const result = await env.DB.prepare("SELECT id,email,role,clerk_user_id IS NOT NULL redeemed,protected_owner,created_at,redeemed_at FROM garage_staff_access ORDER BY protected_owner DESC,created_at").all();
  return result.results.map((row) => ({ id: row.id, email: row.email, role: row.role, status: row.redeemed ? "active" : "pending", protectedOwner: !!row.protected_owner, createdAt: row.created_at, redeemedAt: row.redeemed_at }));
}
async function grantAccess(env, actor, value) {
  const target = email(value.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target) || !["admin", "staff"].includes(value.role)) throw Object.assign(new Error("Provide a valid email and either the admin or staff role."), { status: 400 });
  const existing = await env.DB.prepare("SELECT id,protected_owner FROM garage_staff_access WHERE email=? COLLATE NOCASE").bind(target).first();
  if (existing?.protected_owner) throw Object.assign(new Error("The bootstrap owner's role cannot be changed."), { status: 409 });
  const id = existing?.id || crypto.randomUUID();
  await env.DB.batch([
    env.DB.prepare("INSERT INTO garage_staff_access(id,email,role,granted_by) VALUES(?,?,?,?) ON CONFLICT(email) DO UPDATE SET role=excluded.role,granted_by=excluded.granted_by").bind(id, target, value.role, actor.userId),
    env.DB.prepare(`INSERT INTO garage_auth_audit(actor_user_id,actor_role,action,resource_type,resource_id,changed_fields_json) VALUES(?,?,'staff_access.granted','staff_access',?,'["email","role"]')`).bind(actor.userId, actor.role, id)
  ]);
  const row = await env.DB.prepare("SELECT id,email,role,clerk_user_id IS NOT NULL redeemed FROM garage_staff_access WHERE id=?").bind(id).first();
  return { id: row.id, email: row.email, role: row.role, status: row.redeemed ? "active" : "pending" };
}
async function revokeAccess(env, actor, id) {
  const row = await env.DB.prepare("SELECT * FROM garage_staff_access WHERE id=?").bind(id).first();
  if (!row) throw Object.assign(new Error("Access record not found."), { status: 404 });
  if (row.protected_owner) throw Object.assign(new Error("The bootstrap owner cannot be revoked."), { status: 409 });
  await env.DB.batch([
    env.DB.prepare("DELETE FROM garage_staff_access WHERE id=?").bind(id),
    env.DB.prepare("INSERT INTO garage_auth_audit(actor_user_id,actor_role,action,resource_type,resource_id,changed_fields_json) VALUES(?,?,'staff_access.revoked','staff_access',?,'[]')").bind(actor.userId, actor.role, id)
  ]);
}
async function audit(env, actor, action, resourceType, resourceId, fields = []) {
  await env.DB.prepare("INSERT INTO garage_auth_audit(actor_user_id,actor_role,action,resource_type,resource_id,changed_fields_json) VALUES(?,?,?,?,?,?)").bind(actor.userId, actor.role, action, resourceType, resourceId, JSON.stringify(fields)).run();
}
async function clerkProxy(request, env, publicPath) {
  if (!publicPath.startsWith("/api/__clerk")) return null;
  if (!request.headers.get("origin") && !["GET", "HEAD"].includes(request.method)) {
    return new Response(JSON.stringify({ error: "Clerk proxy mutations require a trusted browser origin." }), { status: 403, headers: { "content-type": "application/json" } });
  }
  try {
    assertTrustedPagesOrigin(request, env);
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: error.status || 403, headers: { "content-type": "application/json" } });
  }
  if (!env.CLERK_SECRET_KEY) return new Response(JSON.stringify({ error: "Pages Clerk proxy is not configured." }), { status: 503, headers: { "content-type": "application/json" } });
  if (production(env) && String(env.CLERK_SECRET_KEY).startsWith("sk_test_")) return new Response(JSON.stringify({ error: "Pages production Clerk live keys are required." }), { status: 503, headers: { "content-type": "application/json" } });
  const url = new URL(request.url), upstream = new URL(`https://frontend-api.clerk.dev${publicPath.slice("/api/__clerk".length)}${url.search}`);
  const headers = new Headers(request.headers);
  headers.set("Clerk-Proxy-Url", `${url.origin}/api/__clerk`);
  headers.set("Clerk-Secret-Key", env.CLERK_SECRET_KEY);
  headers.delete("host");
  return fetch(upstream, { method: request.method, headers, body: ["GET", "HEAD"].includes(request.method) ? void 0 : request.body, redirect: "manual" });
}
const MAX_JSON_BYTES = 32 * 1024;
const MAX_MEDIA_BYTES = 8 * 1024 * 1024;
const SAFE_MEDIA_TYPES = /* @__PURE__ */ new Set(["image/jpeg", "image/png", "image/webp"]);
const customerCareFaqs = [
  ["Service area", "Coverage is not confirmed unless the verified public profile states it. A customer can submit a ZIP code and the business must confirm coverage."],
  ["Response time", "Response and arrival times depend on verified coverage, published hours, and current scheduling. A submitted request is not a confirmed appointment."],
  ["Estimates", "A technician diagnoses the system and explains options before work. Final price must be confirmed after diagnosis."],
  ["Door will not open", "Common causes include a broken spring, failed opener, blocked sensor, damaged cable, power issue, or off-track door. Stop pressing the opener if the door strains, lifts unevenly, or makes a sharp pop."],
  ["Broken springs", "A loud bang, a gap in the spring, an unusually heavy door, or an opener that lifts only a few inches can indicate a broken spring. Customers must not touch, unwind, or replace springs."],
  ["Manual operation", "Manual opening is only appropriate when the door is fully closed and level with no sign of spring or cable damage. Never pull the emergency release under an unstable or partly open door."],
  ["Door reverses", "Blocked, dirty, misaligned, or sun-affected safety sensors can cause reversing. A customer may clear obvious objects but must not bypass sensors or adjust force settings."],
  ["Off-track or hanging door", "Stop using the door, keep people, pets, and vehicles away, and do not pull cables, loosen brackets, or force rollers into place."],
  ["Repair or replacement", "Repair may make sense when panels and tracks are sound. Extensive damage, recurring failures, corrosion, poor insulation, or outdated safety performance may justify replacement after inspection."],
  ["Maintenance", "A professional annual inspection is a useful preventive schedule for most homes. Customers can watch for frayed cables, loose parts, uneven movement, or new noises without touching high-tension components."],
  ["Pricing", "Pricing is not confirmed unless the verified public service catalog states it. A technician must confirm final price after diagnosis."],
  ["Urgent requests", "Urgent availability and timing must be confirmed by the business. An unstable door must remain untouched with the area clear."]
];
const fallbackSettings = { id: 1, businessName: "Cumming Garage Door Service", phone: "(470) 555-0147", email: "service@cumminggaragedoor.example", serviceArea: "Cumming and Forsyth County (provisional)", hours: "Monday–Friday 8am–6pm; Saturday 9am–2pm; Sunday closed", coverage: "Cumming and Forsyth County (provisional)", urgentPolicy: "", theme: "industrial", serviceId: "garage-door-repair", emergencyEnabled: false, heroImage: "/images/garage/hero-door-forward.jpg", galleryImages: ["/images/garage/modern-white-home.jpg"], verificationStatus: "unverified", productionApproved: false, domainConfigured: false, authConfigured: false, claimVerification: { businessName: { status: "verified", isExample: false, verifiedAt: null }, phone: { status: "unverified", isExample: true, verifiedAt: null }, email: { status: "unverified", isExample: true, verifiedAt: null }, hours: { status: "unverified", isExample: true, verifiedAt: null }, coverage: { status: "unverified", isExample: true, verifiedAt: null } }, trustProfile: { hours: null, ownerTeam: null, yearsInBusiness: null, brandsServiced: null, paymentOptions: null, financing: null, licenseInsurance: null, warranty: null, urgentPolicy: null } };
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": status === 200 ? "no-store" : "private, no-store", ...headers } });
const isProduction = (env) => env.CLOUDFLARE_ENV === "production" || env.ENVIRONMENT === "production" || env.CF_PAGES_BRANCH === "main";
async function bodyJson(request) {
  const length = Number(request.headers.get("content-length") || 0);
  if (length > MAX_JSON_BYTES) throw new Error("Request is too large.");
  const text = await request.text();
  if (text.length > MAX_JSON_BYTES) throw new Error("Request is too large.");
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Invalid JSON.");
  }
}
async function sha(value) {
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)))].map((x) => x.toString(16).padStart(2, "0")).join("");
}
async function rateLimit(request, env, bucket, limit, seconds = 60) {
  if (!env.DB) return isProduction(env) ? false : true;
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  const key = `${bucket}:${await sha(ip)}`, windowStart = Math.floor(Date.now() / 1e3 / seconds) * seconds;
  try {
    await env.DB.prepare("INSERT INTO rate_limits (rate_key, window_start, count) VALUES (?, ?, 1) ON CONFLICT(rate_key, window_start) DO UPDATE SET count=count+1").bind(key, windowStart).run();
    const row = await env.DB.prepare("SELECT count FROM rate_limits WHERE rate_key=? AND window_start=?").bind(key, windowStart).first();
    return Number(row?.count || 0) <= limit;
  } catch {
    return false;
  }
}
async function verifyTurnstile(token, action, request, env) {
  if (!token || !env.TURNSTILE_SECRET_KEY) return false;
  try {
    const form = new FormData();
    form.set("secret", env.TURNSTILE_SECRET_KEY);
    form.set("response", token);
    form.set("remoteip", request.headers.get("cf-connecting-ip") || "");
    const result = await (await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form })).json();
    return result.success === true && result.action === action && (!result.hostname || result.hostname === new URL(request.url).hostname);
  } catch {
    return false;
  }
}
const uploadRules = /* @__PURE__ */ new Map([["image/jpeg", 5 * 1024 * 1024], ["image/png", 5 * 1024 * 1024], ["image/webp", 5 * 1024 * 1024], ["video/mp4", 100 * 1024 * 1024], ["video/quicktime", 100 * 1024 * 1024], ["video/webm", 100 * 1024 * 1024]]);
function validUploadMeta(body) {
  const contentType = String(body?.contentType || "").toLowerCase(), byteSize = Number(body?.byteSize), originalName = String(body?.originalName || "").trim().slice(0, 180), limit = uploadRules.get(contentType);
  return originalName && limit && Number.isInteger(byteSize) && byteSize > 0 && byteSize <= limit ? { contentType, byteSize, originalName } : null;
}
function signatureMatches(type, bytes) {
  const b = new Uint8Array(bytes);
  if (type === "image/jpeg") return b[0] === 255 && b[1] === 216 && b[2] === 255;
  if (type === "image/png") return b[0] === 137 && b[1] === 80 && b[2] === 78 && b[3] === 71;
  if (type === "image/webp") return String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP";
  if (type === "video/mp4" || type === "video/quicktime") return String.fromCharCode(...b.slice(4, 8)) === "ftyp";
  if (type === "video/webm") return b[0] === 26 && b[1] === 69 && b[2] === 223 && b[3] === 163;
  return false;
}
async function validUploadCapability(env, requestId, token, allowCompleted = false) {
  if (!token || !env.DB) return false;
  const row = await env.DB.prepare("SELECT upload_capability,created_at,completed_at FROM request_submissions WHERE request_id=?").bind(requestId).first();
  return row?.upload_capability === token && (allowCompleted || !row.completed_at) && Date.now() - Date.parse(row.created_at) < 60 * 60 * 1e3;
}
function validateWebhook(raw, env = {}) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Enter a valid HTTPS webhook URL.");
  }
  const host = url.hostname.toLowerCase();
  const allowed = String(env.NOTIFICATION_ALLOWED_HOSTS || "").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
  if (!allowed.length) throw new Error("Notification delivery is unconfigured. A deployment owner must authorize the receiver domain securely.");
  if (allowed.some((x) => x.includes("*") || x.includes(":") || /^(?:\d+\.){3}\d+$/.test(x) || x === "localhost" || /\.(?:localhost|local|internal|example|invalid|test)$/.test(x) || x === "example.com")) throw new Error("NOTIFICATION_ALLOWED_HOSTS contains a prohibited receiver host.");
  if (url.protocol !== "https:" || url.username || url.password || url.port || !allowed.includes(host)) throw new Error("This receiver domain is not authorized. A deployment owner must add its exact host to NOTIFICATION_ALLOWED_HOSTS securely.");
  return url.toString();
}
function webhookAuthorized(raw, env) {
  try {
    validateWebhook(raw, env);
    return true;
  } catch {
    return false;
  }
}
async function deliveryDetails(env, requestId) {
  const delivery = await env.DB.prepare("SELECT * FROM notification_outbox WHERE request_id=?").bind(requestId).first();
  const files = await env.DB.prepare("SELECT id,original_name,content_type,byte_size,status FROM request_attachments WHERE request_id=? ORDER BY created_at").bind(requestId).all();
  const submission = await env.DB.prepare("SELECT completed_at FROM request_submissions WHERE request_id=?").bind(requestId).first();
  return { uploadStatus: submission?.completed_at ? "completed" : "incomplete", delivery: delivery ? { id: delivery.id, requestId: delivery.request_id, status: delivery.status, attempts: delivery.attempts, lastError: delivery.last_error, deliveredAt: delivery.delivered_at, updatedAt: delivery.updated_at } : null, attachments: files.results.map((x) => ({ id: x.id, originalName: x.original_name, contentType: x.content_type, byteSize: x.byte_size, status: x.status })) };
}
async function deliverNotification(env, requestId) {
  const settings = await env.DB.prepare("SELECT * FROM notification_settings WHERE id=1").first();
  if (!settings?.enabled || !settings.webhook_url) {
    await env.DB.prepare("UPDATE notification_outbox SET status='unconfigured',last_error='Notification destination is not configured.',updated_at=? WHERE request_id=?").bind((/* @__PURE__ */ new Date()).toISOString(), requestId).run();
    return "unconfigured";
  }
  try {
    const destination = validateWebhook(settings.webhook_url, env), request = await env.DB.prepare("SELECT * FROM service_requests WHERE id=?").bind(requestId).first(), details = await deliveryDetails(env, requestId);
    const response = await fetch(destination, { method: "POST", redirect: "error", headers: { "content-type": "application/json" }, body: JSON.stringify({ event: "service_request.created", eventId: `service-request:${requestId}`, request: { ...mapRequest(request), attachments: details.attachments } }), signal: AbortSignal.timeout(15e3) });
    if (!response.ok) throw new Error(`Destination returned HTTP ${response.status}.`);
    await env.DB.prepare("UPDATE notification_outbox SET status='delivered',attempts=attempts+1,last_error=NULL,delivered_at=?,next_attempt_at=NULL,updated_at=? WHERE request_id=?").bind((/* @__PURE__ */ new Date()).toISOString(), (/* @__PURE__ */ new Date()).toISOString(), requestId).run();
    return "delivered";
  } catch (error) {
    await env.DB.prepare("UPDATE notification_outbox SET status='failed',attempts=attempts+1,last_error=?,next_attempt_at=NULL,updated_at=? WHERE request_id=?").bind(`${String(error.message || "Delivery failed.").slice(0, 450)} Staff must retry delivery manually.`, (/* @__PURE__ */ new Date()).toISOString(), requestId).run();
    return "failed";
  }
}
function publicSettings(row, dependencies = {}) {
  const base = { ...fallbackSettings, ...row ? JSON.parse(row.settings_json) : {} };
  const claim = (key, value) => value && base.claimVerification?.[key]?.status === "verified" && base.claimVerification[key].isExample === false && !(key === "phone" && /55501\d{2}$/.test(String(value).replace(/\D/g, ""))) && !(key === "email" && String(value).toLowerCase().endsWith(".example"));
  const phone = claim("phone", base.phone) ? base.phone : "", email2 = claim("email", base.email) ? base.email : "", hours = claim("hours", base.hours) ? base.hours : "", coverageValue = base.coverage || base.serviceArea, coverage = claim("coverage", coverageValue) ? coverageValue : "", urgentPolicy = claim("urgentPolicy", base.urgentPolicy) ? base.urgentPolicy : "";
  const trustProfile = Object.fromEntries(Object.entries(base.trustProfile || {}).map(([key, value]) => [key, claim(key, value) ? value : null]));
  const launchChecks = { productionApproved: base.productionApproved === true, approvedBusinessName: base.businessName === "Cumming Garage Door Service", realPhone: !!phone, realEmail: !!email2, verifiedHours: !!hours, verifiedCoverage: !!coverage, notificationConfigured: dependencies.notificationConfigured === true, notificationDestinationVerified: dependencies.notificationDestinationVerified === true, notificationTested: dependencies.notificationTested === true, domainConfigured: base.domainConfigured === true, authConfigured: base.authConfigured === true };
  const launchReady = Object.values(launchChecks).every(Boolean);
  return { businessName: "Cumming Garage Door Service", phone, email: email2, serviceArea: coverage, hours, coverage, urgentPolicy, theme: base.theme, emergencyEnabled: !!urgentPolicy && !!base.emergencyEnabled, heroImage: base.heroImage, galleryImages: base.galleryImages, verificationStatus: launchReady ? "verified" : "unverified", trustProfile, launchReady, launchChecks, exampleDetails: { phone: base.claimVerification?.phone?.isExample ? base.phone : "", email: base.claimVerification?.email?.isExample ? base.email : "", hours: base.claimVerification?.hours?.isExample ? base.hours : "", coverage: base.claimVerification?.coverage?.isExample ? coverageValue : "", visiblyUnverified: true, label: "Temporary examples — not verified and not used for contact actions" } };
}
const CONTENT_KINDS = /* @__PURE__ */ new Set(["page", "service", "location", "article", "faq", "project", "trust"]);
const CORE_PAGES = /* @__PURE__ */ new Set(["home", "services", "service-area", "about", "blog", "contact", "gallery", "faqs"]);
const CONTENT_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
function mapContent(row) {
  return { id: row.id, kind: row.kind, slug: row.slug, aliases: JSON.parse(row.aliases_json || "[]"), title: row.title, navigationLabel: row.navigation_label || "", navigationGroup: row.navigation_group || "", summary: row.summary, body: row.body, symptoms: JSON.parse(row.symptoms_json || "[]"), expectations: JSON.parse(row.expectations_json || "[]"), serviceFaqs: JSON.parse(row.service_faqs_json || "[]"), imageUrl: row.image_url, imageAlt: row.image_alt, mediaMetadata: JSON.parse(row.media_metadata_json || '{"sourceUrl":"","license":"","attribution":"","representative":true}'), beforeImageUrl: row.before_image_url, seoTitle: row.seo_title, seoDescription: row.seo_description, parentId: row.parent_id, sortOrder: row.sort_order, status: row.status, verificationStatus: row.verification_status, featured: row.featured === 1, serviceCode: row.service_code, reviewedSeed: row.reviewed_seed === 1, updatedAt: row.updated_at };
}
function publicContentRow(row) {
  if (row.status !== "published") return null;
  if (row.verification_status !== "verified" && row.reviewed_seed !== 1) return null;
  if (["trust", "location"].includes(row.kind) && row.verification_status !== "verified") return null;
  return mapContent(row);
}
async function getPublicContent(env) {
  if (!env.DB) return [];
  const result = await env.DB.prepare("SELECT * FROM garage_content WHERE status='published' ORDER BY sort_order,title").all();
  return result.results.map(publicContentRow).filter(Boolean);
}
function validateContent(value) {
  if (!value || typeof value !== "object" || !CONTENT_KINDS.has(value.kind) || !CONTENT_SLUG.test(value.slug) || value.slug.length > 100) return "Invalid content type or slug.";
  if (!Array.isArray(value.aliases) || value.aliases.length > 25 || new Set(value.aliases).size !== value.aliases.length || value.aliases.some((alias) => typeof alias !== "string" || alias.length > 100 || !CONTENT_SLUG.test(alias) || alias === value.slug)) return "Invalid or duplicate aliases.";
  const lengths = { title: 160, summary: 500, body: 2e4, imageUrl: 2048, imageAlt: 300, beforeImageUrl: 2048, seoTitle: 160, seoDescription: 320, serviceCode: 100 };
  if (Object.entries(lengths).some(([key, max]) => typeof value[key] !== "string" || value[key].length > max) || !value.title.trim()) return "Invalid content fields.";
  if (![value.imageUrl, value.beforeImageUrl].every((url) => !url || /^(?:\/(?!\/)|https:\/\/)/i.test(url) && !/^(?:javascript|data):/i.test(url))) return "Image URLs must be empty, root-relative, or HTTPS.";
  if (!Number.isInteger(value.sortOrder) || value.sortOrder < -1e5 || value.sortOrder > 1e5 || !["draft", "published"].includes(value.status) || !["unverified", "verified"].includes(value.verificationStatus) || typeof value.featured !== "boolean") return "Invalid publication fields.";
  if (value.parentId !== void 0 && value.parentId !== null && (typeof value.parentId !== "string" || value.parentId.length > 100)) return "Invalid parent.";
  if (value.serviceCode && !CONTENT_SLUG.test(value.serviceCode)) return "Invalid service code.";
  if (typeof value.navigationLabel !== "string" || value.navigationLabel.length > 100 || typeof value.navigationGroup !== "string" || value.navigationGroup.length > 100) return "Invalid navigation metadata.";
  if (![value.symptoms, value.expectations].every((items) => Array.isArray(items) && items.length <= 20 && items.every((item) => typeof item === "string" && item.length > 0 && item.length <= 300))) return "Invalid service details.";
  if (!Array.isArray(value.serviceFaqs) || value.serviceFaqs.length > 20 || value.serviceFaqs.some((item) => !item || typeof item.question !== "string" || !item.question || item.question.length > 300 || typeof item.answer !== "string" || !item.answer || item.answer.length > 1e3)) return "Invalid service FAQs.";
  if (!value.mediaMetadata || typeof value.mediaMetadata !== "object" || typeof value.mediaMetadata.sourceUrl !== "string" || typeof value.mediaMetadata.license !== "string" || typeof value.mediaMetadata.attribution !== "string" || typeof value.mediaMetadata.representative !== "boolean") return "Invalid media metadata.";
  return null;
}
async function validateContentRelations(env, value, currentId = null) {
  const result = await env.DB.prepare("SELECT id,kind,slug,aliases_json,parent_id FROM garage_content").all(), rows = result.results;
  const parent = value.parentId ? rows.find((row) => row.id === value.parentId) : null;
  if (value.parentId && !parent) return "Parent content was not found.";
  if (value.parentId === currentId) return "Content cannot be its own parent.";
  let cursor = parent;
  const visited = /* @__PURE__ */ new Set();
  while (cursor) {
    if (cursor.id === currentId) return "Parent selection would create a cycle.";
    if (visited.has(cursor.id)) break;
    visited.add(cursor.id);
    cursor = cursor.parent_id ? rows.find((row) => row.id === cursor.parent_id) : null;
  }
  const routes = /* @__PURE__ */ new Set([value.slug, ...value.aliases]);
  return rows.some((row) => row.id !== currentId && row.kind === value.kind && [row.slug, ...JSON.parse(row.aliases_json || "[]")].some((route) => routes.has(route))) ? "Slug or alias is already in use for this content type." : null;
}
const contentValues = (value) => [value.kind, value.slug, JSON.stringify(value.aliases), value.title, value.navigationLabel, value.navigationGroup, value.summary, value.body, JSON.stringify(value.symptoms), JSON.stringify(value.expectations), JSON.stringify(value.serviceFaqs), value.imageUrl, value.imageAlt, JSON.stringify(value.mediaMetadata), value.beforeImageUrl, value.seoTitle, value.seoDescription, value.parentId ?? null, value.sortOrder, value.status, value.verificationStatus, value.featured ? 1 : 0, value.serviceCode];
function selectApprovedService(message, availableCodes) {
  const normalized = String(message).toLowerCase(), available = new Set(availableCodes);
  const choose = (codes) => codes.find((code) => available.has(code)) || "Service assessment";
  if (/commercial|warehouse|loading bay|overhead door/.test(normalized)) return choose(["commercial-garage-door-services", "commercial"]);
  if (/spring|torsion|extension/.test(normalized)) return choose(["broken-spring-replacement", "springs"]);
  if (/off.?track|track|roller|cable|hinge/.test(normalized)) return choose(["cable-roller-off-track-repair", "hardware", "garage-door-repair", "repair"]);
  if (/opener|remote|keypad|sensor|motor/.test(normalized)) return choose(["garage-door-opener-repair-installation", "opener"]);
  if (/new (?:garage )?door|replace|replacement|install|insulated|carriage|glass/.test(normalized)) return choose(["new-garage-door-installation", "installation"]);
  if (/maint|inspect|tune|lubricat|annual/.test(normalized)) return choose(["garage-door-maintenance-tune-ups", "maintenance"]);
  if (/stuck|slow|noisy|noise|squeak|grind|repair/.test(normalized)) return choose(["garage-door-repair", "repair"]);
  return "Service assessment";
}
function mapRequest(row) {
  return { id: row.id, customerName: row.customer_name, phone: row.phone, email: row.email, streetAddress: row.street_address, city: row.city, state: row.state, zip: row.zip, service: row.service, urgency: row.urgency, status: row.status, preferredDate: row.preferred_date, preferredTime: row.preferred_time, details: row.details, createdAt: row.created_at };
}
const urgentGarageTerms = /broken spring|spring (?:snapped|broke|broken)|gap in (?:the )?spring|loud bang|opens? only (?:a )?few inches|unusually heavy|off.?track|hanging|crooked|uneven|loose cable|frayed cable|stuck open|door fell|trapped|dangerous/i;
const garageIssueTerms = /garage|door|opener|spring|cable|repair|service|quote|estimate|schedule|book|track|roller|hinge|sensor|motor/i;
const actionableGarageTerms = /broken|stuck|won't|will not|not (?:open|close)|noisy|noise|slow|uneven|crooked|hanging|fell|off.?track|spring|cable|roller|hinge|sensor|opener|remote|keypad|motor|repair|replace|install/i;
const businessFollowupTerms = /price|cost|quote|estimate|coverage|service area|zip|hour|open|available|availability|schedule|appointment|book|arrival|warranty|guarantee|licensed|insured|credential|review|rating|payment|financing/i;
const uncertaintyTerms = /(?:i (?:do not|don't|can(?:not|'t)) (?:know|confirm|verify|find|answer)|not (?:listed|confirmed|verified|available) (?:here|in the context)|the business (?:must|will need to) confirm)/i;
function shouldRecommendServiceRequest(message, safetyLevel, reply = "") {
  const normalized = message.trim();
  if (!normalized || /^(?:hi|hello|hey|good morning|good afternoon|good evening|thanks|thank you|thx|ty|how are you|how'?s it going)[!?. ]*$/i.test(normalized)) return false;
  return safetyLevel === "urgent" || actionableGarageTerms.test(normalized) || businessFollowupTerms.test(normalized) || uncertaintyTerms.test(reply) || !garageIssueTerms.test(normalized);
}
function withServiceRequestGuidance(reply, recommended) {
  return recommended && !/service request/i.test(reply) ? `${reply}

If you’d like the business to review the details, you can start a service request here.` : reply;
}
function casualCustomerCareReply(message, businessName) {
  const normalized = message.trim().toLowerCase();
  if (normalized.length > 100 || garageIssueTerms.test(normalized)) return null;
  if (/^(thanks|thank you|thx|ty|appreciate it)[!. ]*$/i.test(normalized)) return "You’re welcome. If anything changes with the door, tell me what you notice and I’ll help with the next step.";
  if (/^(how are you|how'?s it going|hru|you good)[?!., ]*$/i.test(normalized)) return `Thanks for asking. I’m here with customer care at ${businessName}. What’s the garage door doing today—stuck, noisy, slow, or refusing to open?`;
  if (/^(hi|hello|hey|good morning|good afternoon|good evening)[!. ]*$/i.test(normalized)) return `Hi! You’ve reached Maya with customer care for ${businessName}. You don’t need to know the repair name—just tell me what the door is doing.`;
  return null;
}
function cleanHistory(value) {
  return Array.isArray(value) ? value.filter((item) => item && (item.role === "user" || item.role === "assistant") && typeof item.content === "string" && item.content.trim()).slice(-12).map((item) => ({ role: item.role, content: item.content.trim().slice(0, 1e3) })) : [];
}
async function getCustomerCareContext(env) {
  let row = null, notification = null, publicContent = [];
  try {
    if (env.DB) {
      [row, notification, publicContent] = await Promise.all([env.DB.prepare("SELECT settings_json, verified FROM business_settings WHERE id=1").first(), env.DB.prepare("SELECT enabled,webhook_url,destination_verified,tested_at FROM notification_settings WHERE id=1").first(), getPublicContent(env)]);
    }
  } catch {
    row = null;
    notification = null;
    publicContent = [];
  }
  const notificationAuthorized = webhookAuthorized(notification?.webhook_url || "", env);
  const settings = publicSettings(row, { notificationConfigured: !!(notification?.enabled && notificationAuthorized), notificationDestinationVerified: notification?.destination_verified === 1 && notificationAuthorized, notificationTested: !!notification?.tested_at }), businessVerified = settings.verificationStatus === "verified";
  const catalog = publicContent.filter((item) => item.kind === "service");
  const catalogVerified = catalog.some((item) => item.verificationStatus === "verified");
  const serviceLines = catalog.length ? catalog.map((service) => `- ${service.title} (${service.serviceCode || service.slug}): ${service.summary} ${service.body}`).join("\n") : "- No service guidance is published.";
  const faqLines = customerCareFaqs.map(([question, answer]) => `- ${question}: ${answer}`).join("\n");
  const contentLines = publicContent.filter((item) => ["service", "faq", "trust"].includes(item.kind)).map((item) => `- ${item.title}: ${item.summary} ${item.body}`).join("\n");
  return { settings, catalog, text: ["AUTHORITATIVE WEBSITE AND BUSINESS CONTEXT — use only these facts.", `Business: ${settings.businessName}`, `Business profile verification: ${businessVerified ? "verified" : "unverified"}.`, `Phone: ${settings.phone || "not verified"}`, `Email: ${settings.email || "not verified"}`, `Service area: ${settings.serviceArea}`, `Hours: ${settings.hours || "not verified"}`, `Warranty: ${settings.trustProfile?.warranty || "not verified"}`, `License and insurance: ${settings.trustProfile?.licenseInsurance || "not verified"}`, "A service request is reviewed by the business and is not a confirmed appointment. Coverage, timing, and final price require confirmation.", `Business service-offering verification: ${catalogVerified ? "at least one service record is verified" : "not verified; service records are educational only"}.`, "Services:", serviceLines, "Approved customer guidance:", faqLines, "Published content:", contentLines || "- No published content is available.", "Do not invent reviews, ratings, hours, appointment slots, guarantees, warranties, credentials, refunds, final prices, urgent availability, or coverage. If a detail is absent or unverified, say so and recommend a service request."].join("\n") };
}
function fallbackAssistant(message, suggestedService) {
  const urgent = urgentGarageTerms.test(message), issue = garageIssueTerms.test(message);
  const safetyLevel = urgent ? "urgent" : issue ? "caution" : "safe";
  let reply = urgent ? "Please stop using the door and keep people, pets, and vehicles clear. Springs, cables, and an off-track door can be dangerous; arrange professional help rather than trying to move or repair it yourself." : /price|cost|quote|estimate/i.test(message) ? "Final pricing must be confirmed after a technician diagnoses the door." : /hours|coverage|zip|warranty|license|insured|credential|available|schedule|appointment/i.test(message) ? "I don’t have that detail confirmed here. The business will need to review it." : issue ? "That sounds frustrating. If the door is heavy, crooked, or made a sharp pop, stop using it. Tell me whether it is stuck, noisy, slow, or the opener is not responding." : "I don’t have that answer in the approved garage-door information.";
  const serviceRequestRecommended = shouldRecommendServiceRequest(message, safetyLevel, reply);
  reply = withServiceRequestGuidance(reply, serviceRequestRecommended);
  return { reply, safetyLevel, suggestedService, serviceRequestRecommended };
}
async function analytics(request, env, body) {
  const allowed = /* @__PURE__ */ new Set(["service_view", "booking_start", "booking_complete", "phone_click", "iframe_referral"]);
  if (!allowed.has(body.event)) return false;
  if (env.ANALYTICS?.writeDataPoint) {
    env.ANALYTICS.writeDataPoint({ blobs: [body.event], doubles: [Date.now()], indexes: [new URL(request.url).hostname] });
  } else if (env.DB) {
    await env.DB.prepare(
      "INSERT INTO analytics_events (event_name, path, created_at) VALUES (?, ?, ?)"
    ).bind(body.event, String(body.path || "").slice(0, 200), (/* @__PURE__ */ new Date()).toISOString()).run();
  }
  return true;
}
async function handleApi(request, url, env) {
  const path = url.pathname;
  if (path === "/api/garage/admin/session") {
    try {
      return json(await staffActor(request, env));
    } catch (e) {
      return json({ error: e.message }, e.status || 401);
    }
  }
  if (path === "/api/garage/admin/access" || path.startsWith("/api/garage/admin/access/")) {
    try {
      const actor = await staffActor(request, env, "super_admin");
      if (path === "/api/garage/admin/access" && request.method === "GET") return json(await listAccess(env));
      if (path === "/api/garage/admin/access" && request.method === "POST") return json(await grantAccess(env, actor, await bodyJson(request)), 201);
      if (path.startsWith("/api/garage/admin/access/") && request.method === "DELETE") {
        await revokeAccess(env, actor, decodeURIComponent(path.slice("/api/garage/admin/access/".length)));
        return new Response(null, { status: 204 });
      }
      return json({ error: "Not found" }, 404);
    } catch (e) {
      return json({ error: e.message }, e.status || 400);
    }
  }
  if (path === "/api/garage/cloudflare-config") {
    const siteKey = env.TURNSTILE_SITE_KEY || "";
    const locallyDisabled = !isProduction(env) && !siteKey;
    return json({
      turnstile: { enabled: !locallyDisabled, siteKey, configured: !!(siteKey && env.TURNSTILE_SECRET_KEY) },
      siteKey,
      features: { turnstile: !locallyDisabled, assistant: !!env.AI, media: !!env.MEDIA }
    });
  }
  if (path === "/api/garage/services") {
    const catalog = (await getPublicContent(env)).filter((item) => item.kind === "service");
    return json(catalog.map((service, index) => ({ id: index + 1, slug: service.serviceCode || service.slug, name: service.title, description: service.summary, startingPrice: null, duration: "Assessment required", emergency: false })));
  }
  if (path === "/api/garage/testimonials") return json([]);
  if (path === "/api/garage/reviews") return json({ mode: "live", connectionStatus: "disconnected", locationName: "Google Business Profile not connected", aggregateRating: 0, totalReviewCount: 0, lastSyncedAt: null, profileUrl: null, reviews: [] }, 200, { "cache-control": "public, max-age=300" });
  if (path === "/api/garage/site-settings") return json(await sitePublication(env, request.url));
  if (path === "/api/garage/content" && request.method === "GET") return json(await getPublicContent(env));
  if (path === "/api/garage/availability") {
    const zip = url.searchParams.get("zip") || "";
    return json({ available: false, zip, eta: "Availability confirmation required", message: /^\d{5}(-\d{4})?$/.test(zip) ? "Submit a request and the business will confirm service coverage and timing." : "Enter a valid ZIP code so the business can confirm coverage." });
  }
  if (path === "/api/garage/analytics" && request.method === "POST") {
    if (!await rateLimit(request, env, "analytics", 30)) return json({ error: "Too many requests." }, 429);
    try {
      return await analytics(request, env, await bodyJson(request)) ? json({ ok: true }, 202) : json({ error: "Unsupported event." }, 400);
    } catch (e) {
      return json({ error: e.message }, 400);
    }
  }
  if (path === "/api/garage/requests" && request.method === "POST") {
    if (!await rateLimit(request, env, "booking", 5, 600)) return json({ error: "Too many requests. Please try again later." }, 429);
    try {
      if (!env.DB) return json({ error: "Request storage is not configured." }, 503);
      const body = await bodyJson(request);
      if (!await verifyTurnstile(body.turnstileToken, "booking", request, env)) return json({ error: "Verification failed. Please try again." }, 403);
      const required = ["customerName", "phone", "streetAddress", "city", "state", "zip", "service", "urgency", "preferredDate"];
      if (required.some((key) => !String(body[key] || "").trim()) || typeof body.email !== "string" || !["emergency", "soon", "flexible"].includes(body.urgency) || String(body.customerName).length > 120) return json({ error: "Please check the request details." }, 400);
      const idempotencyKey = request.headers.get("idempotency-key") || String(body.idempotencyKey || "");
      if (!/^[A-Za-z0-9_-]{20,100}$/.test(idempotencyKey)) return json({ error: "A valid submission key is required." }, 400);
      const createdAt = (/* @__PURE__ */ new Date()).toISOString(), uploadCapability = `${crypto.randomUUID()}${crypto.randomUUID()}`;
      const [inserted] = await env.DB.batch([
        env.DB.prepare("INSERT OR IGNORE INTO service_requests (customer_name,phone,email,street_address,city,state,zip,service,urgency,preferred_date,preferred_time,details,created_at,idempotency_key) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(body.customerName, body.phone, body.email, body.streetAddress, body.city, body.state, body.zip, body.service, body.urgency, body.preferredDate, body.preferredTime || "", body.details || "", createdAt, idempotencyKey),
        env.DB.prepare("INSERT OR IGNORE INTO request_submissions (idempotency_key,request_id,upload_capability,created_at) SELECT ?,id,?,? FROM service_requests WHERE idempotency_key=?").bind(idempotencyKey, uploadCapability, createdAt, idempotencyKey),
        env.DB.prepare("INSERT OR IGNORE INTO notification_outbox (id,request_id,status,last_error,created_at,updated_at) SELECT ?,id,'pending_uploads','Waiting for customer attachment uploads to complete.',?,? FROM service_requests WHERE idempotency_key=?").bind(crypto.randomUUID(), createdAt, createdAt, idempotencyKey)
      ]);
      const row = await env.DB.prepare("SELECT * FROM service_requests WHERE idempotency_key=?").bind(idempotencyKey).first();
      const submission = await env.DB.prepare("SELECT upload_capability FROM request_submissions WHERE idempotency_key=?").bind(idempotencyKey).first();
      if (inserted.meta.changes) {
        await analytics(request, env, { event: "booking_complete" });
      }
      return json({ ...mapRequest(row), uploadCapability: submission.upload_capability, ...await deliveryDetails(env, row.id) }, inserted.meta.changes ? 201 : 200);
    } catch (e) {
      return json({ error: e.message || "Unable to send request." }, 400);
    }
  }
  const completeUploadMatch = path.match(/^\/api\/garage\/request-uploads\/(\d+)\/complete$/);
  if (completeUploadMatch && request.method === "POST") {
    const requestId = Number(completeUploadMatch[1]), token = request.headers.get("x-upload-capability");
    if (!env.DB || !await validUploadCapability(env, requestId, token, true)) return json({ error: "This upload capability is invalid or expired. The saved request remains visible to staff as upload incomplete." }, 403);
    const now = (/* @__PURE__ */ new Date()).toISOString(), stale = new Date(Date.now() - 12e4).toISOString();
    const completed = await env.DB.prepare("UPDATE request_submissions SET completed_at=? WHERE request_id=? AND completed_at IS NULL AND NOT EXISTS (SELECT 1 FROM request_attachments WHERE request_id=? AND status='pending') RETURNING request_id").bind(now, requestId, requestId).first();
    if (!completed) {
      const state = await env.DB.prepare("SELECT completed_at FROM request_submissions WHERE request_id=?").bind(requestId).first();
      if (!state?.completed_at) return json({ error: "All prepared attachments must finish uploading before this request can be completed." }, 409);
    }
    const claimed = await env.DB.prepare("UPDATE notification_outbox SET status='processing',updated_at=? WHERE request_id=? AND (status='pending_uploads' OR (status='processing' AND updated_at < ?)) RETURNING request_id").bind(now, requestId, stale).first();
    if (claimed) {
      await deliverNotification(env, requestId);
    }
    return json(await deliveryDetails(env, requestId));
  }
  const uploadMatch = path.match(/^\/api\/garage\/request-uploads\/(\d+)(?:\/(prepare)|\/attachments\/([^/]+)(\/finalize)?)$/);
  if (uploadMatch) {
    if (!env.DB || !env.MEDIA) return json({ error: "Private attachment storage is not configured." }, 503);
    const requestId = Number(uploadMatch[1]), token = request.headers.get("x-upload-capability");
    if (!await validUploadCapability(env, requestId, token)) return json({ error: "This upload link is invalid or expired." }, 403);
    if (uploadMatch[2] && request.method === "POST") {
      const meta = validUploadMeta(await bodyJson(request));
      if (!meta) return json({ error: "Use a supported image up to 5 MB or video up to 100 MB." }, 400);
      const prepareKey = request.headers.get("idempotency-key") || "";
      if (!/^[A-Za-z0-9_-]{20,100}$/.test(prepareKey)) return json({ error: "A valid per-file Idempotency-Key is required." }, 400);
      const reserved = await env.DB.prepare("SELECT * FROM request_attachments WHERE request_id=? AND prepare_key=?").bind(requestId, prepareKey).first();
      if (reserved) {
        if (reserved.original_name !== meta.originalName || reserved.content_type !== meta.contentType || reserved.byte_size !== meta.byteSize) return json({ error: "This file reservation key was already used for different file metadata." }, 409);
        return json({ attachmentId: reserved.id, uploadUrl: reserved.status === "uploaded" ? "" : `/api/garage/request-uploads/${requestId}/attachments/${reserved.id}`, method: "PUT", headers: { "Content-Type": meta.contentType, "X-Upload-Capability": token }, status: reserved.status });
      }
      await env.DB.prepare("DELETE FROM request_attachments WHERE request_id=? AND status='pending' AND created_at < ?").bind(requestId, new Date(Date.now() - 9e5).toISOString()).run();
      const attachmentId = crypto.randomUUID(), objectKey = `customer-requests/${requestId}/${attachmentId}`;
      const inserted = await env.DB.prepare("INSERT OR IGNORE INTO request_attachments (id,request_id,object_key,original_name,content_type,byte_size,prepare_key) SELECT ?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM request_submissions WHERE request_id=? AND completed_at IS NULL) AND (SELECT COUNT(*) FROM request_attachments WHERE request_id=? AND content_type LIKE ?) < ?").bind(attachmentId, requestId, objectKey, meta.originalName, meta.contentType, meta.byteSize, prepareKey, requestId, requestId, meta.contentType.startsWith("image/") ? "image/%" : "video/%", meta.contentType.startsWith("image/") ? 5 : 2).run();
      if (!inserted.meta.changes) {
        const raced = await env.DB.prepare("SELECT * FROM request_attachments WHERE request_id=? AND prepare_key=?").bind(requestId, prepareKey).first();
        if (raced && raced.original_name === meta.originalName && raced.content_type === meta.contentType && raced.byte_size === meta.byteSize) return json({ attachmentId: raced.id, uploadUrl: raced.status === "uploaded" ? "" : `/api/garage/request-uploads/${requestId}/attachments/${raced.id}`, method: "PUT", headers: { "Content-Type": meta.contentType, "X-Upload-Capability": token }, status: raced.status });
        const state = await env.DB.prepare("SELECT completed_at FROM request_submissions WHERE request_id=?").bind(requestId).first();
        return json({ error: state?.completed_at ? "This request upload phase is already complete." : "Attachment limit reached." }, 409);
      }
      return json({ attachmentId, uploadUrl: `/api/garage/request-uploads/${requestId}/attachments/${attachmentId}`, method: "PUT", headers: { "Content-Type": meta.contentType, "X-Upload-Capability": token }, status: "pending" }, 201);
    }
    if (uploadMatch[3] && request.method === "PUT" && !uploadMatch[4]) {
      const attachment = await env.DB.prepare("SELECT * FROM request_attachments WHERE id=? AND request_id=?").bind(uploadMatch[3], requestId).first();
      const size = Number(request.headers.get("content-length") || 0), type = (request.headers.get("content-type") || "").split(";")[0].toLowerCase();
      if (!attachment || size !== attachment.byte_size || type !== attachment.content_type) return json({ error: "The uploaded file did not match its declared type or size." }, 400);
      const bytes = await request.arrayBuffer();
      if (bytes.byteLength !== size || !signatureMatches(type, bytes.slice(0, 16))) return json({ error: "The file signature is not supported." }, 400);
      await env.MEDIA.put(attachment.object_key, bytes, { httpMetadata: { contentType: type } });
      await env.DB.prepare("UPDATE request_attachments SET status='uploaded' WHERE id=?").bind(attachment.id).run();
      return json({ id: attachment.id, status: "uploaded" });
    }
    if (uploadMatch[3] && uploadMatch[4] && request.method === "POST") {
      const attachment = await env.DB.prepare("SELECT * FROM request_attachments WHERE id=? AND request_id=?").bind(uploadMatch[3], requestId).first();
      if (!attachment) return json({ error: "Attachment not found." }, 404);
      if (attachment.status === "uploaded") return json({ id: attachment.id, status: "uploaded" });
      const object = await env.MEDIA.get(attachment.object_key);
      if (!object || object.size !== attachment.byte_size || object.httpMetadata?.contentType !== attachment.content_type) return json({ error: "The uploaded file did not match its declared type or size." }, 400);
      await env.DB.prepare("UPDATE request_attachments SET status='uploaded' WHERE id=?").bind(attachment.id).run();
      return json({ id: attachment.id, status: "uploaded" });
    }
  }
  if (path === "/api/garage/assistant" && request.method === "POST") {
    if (!await rateLimit(request, env, "assistant", 12, 600)) return json({ error: "Too many questions. Please try again later." }, 429);
    try {
      const body = await bodyJson(request);
      if (!await verifyTurnstile(body.turnstileToken, "assistant", request, env)) return json({ error: "Verification failed. Please try again." }, 403);
      const message = String(body.message || "").trim().slice(0, 1e3);
      if (!message) return json({ error: "Ask a question about your garage door." }, 400);
      const history = cleanHistory(body.history), context = await getCustomerCareContext(env), candidate = selectApprovedService([...history.map((item) => item.content), message].join("\n"), context.catalog.map((service) => service.serviceCode || service.slug)), catalog = context.catalog.find((service) => (service.serviceCode || service.slug) === candidate), safe = fallbackAssistant(message, candidate);
      if (!env.AI) return json({ error: "Maya is unavailable because the AI provider is not configured.", safetyGuidance: safe.reply, ...safe }, 503);
      const casualReply = casualCustomerCareReply(message, context.settings.businessName);
      if (casualReply) return json({ reply: casualReply, safetyLevel: "safe", suggestedService: "Service assessment", serviceRequestRecommended: false });
      try {
        const out = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", { messages: [{ role: "system", content: [`You are Maya, the friendly customer-care coordinator for ${context.settings.businessName}. Speak warmly, naturally, and plainly as the first helpful voice a homeowner reaches.`, "You are an AI-assisted service-information tool, not a technician or emergency service. Never imply a human is monitoring the conversation.", "Answer business, service, estimate, coverage, timing, review, FAQ, and booking questions only from the authoritative context below. If the context does not confirm an answer, say that plainly and invite the customer to start a service request. Never guess.", "Keep replies to 2–5 short sentences and ask at most one useful follow-up question. Connect a symptom to one verified service when possible rather than listing everything.", "A service request is not an appointment. Never promise coverage, timing, arrival, final price, warranties, credentials, refunds, or availability.", "SAFETY: Never instruct customers to adjust, unwind, cut, replace, or pull springs, cables, bottom brackets, tracks, or other high-tension parts. For crooked, hanging, fallen, off-track, unusually heavy, or spring-damaged doors, tell them to stop using the door and keep people, pets, and vehicles clear.", context.text].join("\n\n") }, ...history, { role: "user", content: message }] });
        let reply = String(out?.response || "").trim();
        if (!reply || /(?:appointment (?:is |has been )?confirmed|guaranteed|we can be there|available today|licensed and insured|open 24)/i.test(reply) || context.settings.verificationStatus !== "verified" && /(?:we serve|our hours|our warranty|we are licensed|call us at|email us at)/i.test(reply) || !catalog && /\$\d/.test(reply)) return json(safe);
        const safetyLevel = urgentGarageTerms.test([...history.map((item) => item.content), message].join("\n")) ? "urgent" : garageIssueTerms.test(message) ? "caution" : "safe";
        if (safetyLevel === "urgent" && !/stop|do not|don't|keep .* clear|professional/i.test(reply)) return json(safe);
        const serviceRequestRecommended = shouldRecommendServiceRequest(message, safetyLevel, reply);
        reply = withServiceRequestGuidance(reply, serviceRequestRecommended);
        return json({ reply, safetyLevel, suggestedService: candidate, serviceRequestRecommended });
      } catch {
        return json({ error: "Maya is temporarily unavailable because the AI provider could not be reached.", safetyGuidance: safe.reply, ...safe }, 503);
      }
    } catch (e) {
      return json({ error: e.message }, 400);
    }
  }
  if (path === "/api/garage/media" && request.method === "POST") {
    let actor;
    try {
      actor = await staffActor(request, env, "admin");
    } catch (e) {
      return json({ error: e.message }, e.status || 401);
    }
    if (!env.MEDIA) return json({ error: "Media storage is not configured." }, 503);
    const type = request.headers.get("content-type")?.split(";")[0].toLowerCase();
    const size = Number(request.headers.get("content-length") || 0);
    if (!SAFE_MEDIA_TYPES.has(type) || size < 1 || size > MAX_MEDIA_BYTES) return json({ error: "Use a JPEG, PNG, or WebP image up to 8 MB." }, 400);
    const key = `uploads/${crypto.randomUUID()}.${type.split("/")[1]}`;
    await env.MEDIA.put(key, request.body, { httpMetadata: { contentType: type } });
    await audit(env, actor, "media.created", "media", key, ["content-type"]);
    return json({ key, url: `/api/garage/media/${key}` }, 201);
  }
  if (path.startsWith("/api/garage/media/") && request.method === "GET") {
    const key = decodeURIComponent(path.slice("/api/garage/media/".length));
    if (!/^uploads\/[0-9a-f-]+\.(jpg|jpeg|png|webp)$/.test(key) || !env.MEDIA) return json({ error: "Not found" }, 404);
    const object = await env.MEDIA.get(key);
    if (!object) return json({ error: "Not found" }, 404);
    return new Response(object.body, { headers: { "content-type": object.httpMetadata?.contentType || "application/octet-stream", "x-content-type-options": "nosniff", "cache-control": "public, max-age=86400" } });
  }
  if (path === "/api/garage/admin/content" || path.startsWith("/api/garage/admin/content/")) {
    let actor;
    try {
      actor = await staffActor(request, env, "admin");
    } catch (e) {
      return json({ error: e.message }, e.status || 401);
    }
    if (!env.DB) return json({ error: "Database is not configured." }, 503);
    if (path === "/api/garage/admin/content" && request.method === "GET") {
      const result = await env.DB.prepare("SELECT * FROM garage_content ORDER BY sort_order,title").all();
      return json(result.results.map(mapContent));
    }
    if (path === "/api/garage/admin/content" && request.method === "POST") {
      try {
        const value = await bodyJson(request);
        if (value.status === "published" && value.verificationStatus === "verified" && value.verificationAcknowledged !== true) return json({ error: "Explicit verification acknowledgement is required before publishing business claims." }, 400);
        const invalid = validateContent(value) || await validateContentRelations(env, value);
        if (invalid) return json({ error: invalid }, 400);
        const id = crypto.randomUUID(), now = (/* @__PURE__ */ new Date()).toISOString();
        await env.DB.prepare("INSERT INTO garage_content (id,kind,slug,aliases_json,title,navigation_label,navigation_group,summary,body,symptoms_json,expectations_json,service_faqs_json,image_url,image_alt,media_metadata_json,before_image_url,seo_title,seo_description,parent_id,sort_order,status,verification_status,featured,service_code,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(id, ...contentValues(value), now).run();
        await audit(env, actor, "garage_content.created", "garage_content", id, Object.keys(value));
        return json(mapContent(await env.DB.prepare("SELECT * FROM garage_content WHERE id=?").bind(id).first()), 201);
      } catch (e) {
        return json({ error: e.message || "Invalid content." }, 400);
      }
    }
    if (path.startsWith("/api/garage/admin/content/")) {
      const id = decodeURIComponent(path.slice("/api/garage/admin/content/".length));
      if (!id || id.length > 100) return json({ error: "Invalid content id." }, 400);
      const current = await env.DB.prepare("SELECT * FROM garage_content WHERE id=?").bind(id).first();
      if (!current) return json({ error: "Content not found." }, 404);
      if (request.method === "PUT") {
        try {
          const value = await bodyJson(request);
          if (current.kind === "page" && CORE_PAGES.has(current.slug) && (value.slug !== current.slug || value.kind !== "page")) return json({ error: "Core page slugs and types cannot be changed." }, 409);
          if (!(current.kind === "page" && CORE_PAGES.has(current.slug)) && value.slug && value.slug !== current.slug && Array.isArray(value.aliases)) value.aliases = [.../* @__PURE__ */ new Set([...value.aliases, current.slug])].slice(0, 25);
          if (value.status === "published" && value.verificationStatus === "verified" && value.verificationAcknowledged !== true) return json({ error: "Explicit verification acknowledgement is required before publishing business claims." }, 400);
          const invalid = validateContent(value) || await validateContentRelations(env, value, id);
          if (invalid) return json({ error: invalid }, 400);
          await env.DB.prepare("UPDATE garage_content SET kind=?,slug=?,aliases_json=?,title=?,navigation_label=?,navigation_group=?,summary=?,body=?,symptoms_json=?,expectations_json=?,service_faqs_json=?,image_url=?,image_alt=?,media_metadata_json=?,before_image_url=?,seo_title=?,seo_description=?,parent_id=?,sort_order=?,status=?,verification_status=?,featured=?,service_code=?,reviewed_seed=0,updated_at=? WHERE id=?").bind(...contentValues(value), (/* @__PURE__ */ new Date()).toISOString(), id).run();
          await audit(env, actor, "garage_content.updated", "garage_content", id, Object.keys(value));
          return json(mapContent(await env.DB.prepare("SELECT * FROM garage_content WHERE id=?").bind(id).first()));
        } catch (e) {
          return json({ error: e.message || "Invalid content." }, 400);
        }
      }
      if (request.method === "DELETE") {
        if (current.kind === "page" && CORE_PAGES.has(current.slug)) return json({ error: "Core pages cannot be deleted; set status to draft instead." }, 409);
        if (await env.DB.prepare("SELECT id FROM garage_content WHERE parent_id=? LIMIT 1").bind(id).first()) return json({ error: "Move or delete child content before deleting its parent." }, 409);
        await env.DB.prepare("DELETE FROM garage_content WHERE id=?").bind(id).run();
        await audit(env, actor, "garage_content.deleted", "garage_content", id);
        return new Response(null, { status: 204 });
      }
    }
    return json({ error: "Not found" }, 404);
  }
  if (path === "/api/garage/admin/notifications" || path === "/api/garage/admin/notifications/test") {
    let actor;
    try {
      actor = await staffActor(request, env, "admin");
    } catch (e) {
      return json({ error: e.message }, e.status || 401);
    }
    if (!env.DB) return json({ error: "Database is not configured." }, 503);
    if (path === "/api/garage/admin/notifications" && request.method === "GET") {
      const row = await env.DB.prepare("SELECT * FROM notification_settings WHERE id=1").first();
      const authorized = row && webhookAuthorized(row.webhook_url || "", env);
      return json(row ? { id: 1, webhookUrl: row.webhook_url, enabled: row.enabled === 1, configured: row.enabled === 1 && authorized, destinationVerified: row.destination_verified === 1 && authorized, testedAt: row.tested_at, updatedAt: row.updated_at } : { id: 1, webhookUrl: null, enabled: false, configured: false, destinationVerified: false, testedAt: null, updatedAt: null });
    }
    if (path === "/api/garage/admin/notifications" && request.method === "PUT") {
      try {
        const body = await bodyJson(request), enabled = body.enabled === true, webhookUrl = String(body.webhookUrl || "").trim() ? validateWebhook(String(body.webhookUrl).trim(), env) : null;
        if (enabled && !webhookUrl) return json({ error: "A real HTTPS destination is required before notifications can be enabled." }, 400);
        const now = (/* @__PURE__ */ new Date()).toISOString();
        const current = await env.DB.prepare("SELECT webhook_url,tested_at FROM notification_settings WHERE id=1").first();
        const testedAt = current?.webhook_url === webhookUrl ? current.tested_at : null;
        await env.DB.prepare("INSERT INTO notification_settings (id,webhook_url,enabled,destination_verified,tested_at,updated_at) VALUES (1,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET webhook_url=excluded.webhook_url,enabled=excluded.enabled,destination_verified=excluded.destination_verified,tested_at=excluded.tested_at,updated_at=excluded.updated_at").bind(webhookUrl, enabled ? 1 : 0, webhookUrl ? 1 : 0, testedAt, now).run();
        await audit(env, actor, "notification_settings.updated", "notification_settings", "1", ["enabled", "webhookUrl"]);
        return json({ id: 1, webhookUrl, enabled, configured: enabled && !!webhookUrl, destinationVerified: !!webhookUrl, testedAt, updatedAt: now });
      } catch (e) {
        return json({ error: e.message || "Invalid notification settings." }, 400);
      }
    }
    if (path.endsWith("/test") && request.method === "POST") {
      try {
        const destination = validateWebhook(String((await bodyJson(request)).webhookUrl || ""), env);
        const saved = await env.DB.prepare("SELECT webhook_url FROM notification_settings WHERE id=1").first();
        if (!saved || saved.webhook_url !== destination) return json({ error: "Save this authorized receiver URL before sending its test." }, 409);
        const response = await fetch(destination, { method: "POST", redirect: "error", headers: { "content-type": "application/json" }, body: JSON.stringify({ event: "notification.test", source: "Cumming Garage Door Service", sentAt: (/* @__PURE__ */ new Date()).toISOString() }), signal: AbortSignal.timeout(15e3) });
        if (!response.ok) return json({ error: `Destination returned HTTP ${response.status}.` }, 502);
        await env.DB.prepare("UPDATE notification_settings SET tested_at=?,updated_at=? WHERE id=1").bind((/* @__PURE__ */ new Date()).toISOString(), (/* @__PURE__ */ new Date()).toISOString()).run();
        await audit(env, actor, "notification_settings.test_delivered", "notification_settings", "1");
        return json({ delivered: true });
      } catch (e) {
        return json({ error: e.message || "Test delivery failed." }, 502);
      }
    }
    return json({ error: "Not found" }, 404);
  }
  if (path === "/api/garage/requests" || path.startsWith("/api/garage/requests/") || path === "/api/garage/dashboard" || path === "/api/garage/settings") {
    let actor;
    try {
      actor = await staffActor(request, env, path === "/api/garage/settings" ? "admin" : "staff");
    } catch (e) {
      return json({ error: e.message }, e.status || 401);
    }
    if (!env.DB) return json({ error: "Database is not configured." }, 503);
    if (path === "/api/garage/requests" && request.method === "GET") {
      const r = await env.DB.prepare("SELECT * FROM service_requests ORDER BY created_at DESC").all();
      return json(await Promise.all(r.results.map(async (row) => ({ ...mapRequest(row), ...await deliveryDetails(env, row.id) }))));
    }
    const attachmentGet = path.match(/^\/api\/garage\/requests\/(\d+)\/attachments\/([^/]+)$/);
    if (attachmentGet && request.method === "GET") {
      if (!env.MEDIA) return json({ error: "Attachment storage is not configured." }, 503);
      const row = await env.DB.prepare("SELECT * FROM request_attachments WHERE id=? AND request_id=? AND status='uploaded'").bind(attachmentGet[2], Number(attachmentGet[1])).first();
      if (!row) return json({ error: "Attachment not found." }, 404);
      const object = await env.MEDIA.get(row.object_key);
      if (!object) return json({ error: "Attachment not found." }, 404);
      return new Response(object.body, { headers: { "content-type": row.content_type, "content-disposition": `inline; filename="${String(row.original_name).replace(/["\r\n]/g, "_")}"`, "cache-control": "private, no-store", "x-content-type-options": "nosniff" } });
    }
    const notifyMatch = path.match(/^\/api\/garage\/requests\/(\d+)\/notify$/);
    if (notifyMatch && request.method === "POST") {
      const id = Number(notifyMatch[1]), details = await deliveryDetails(env, id);
      if (details.uploadStatus !== "completed") return json({ error: "This request is still waiting for its private uploads to complete.", ...details }, 409);
      const now = (/* @__PURE__ */ new Date()).toISOString(), stale = new Date(Date.now() - 12e4).toISOString();
      const claimed = await env.DB.prepare("UPDATE notification_outbox SET status='processing',updated_at=? WHERE request_id=? AND (status IN ('pending_uploads','failed','unconfigured','pending') OR (status='processing' AND updated_at < ?)) RETURNING request_id").bind(now, id, stale).first();
      if (!claimed) return json({ error: "This notification is already delivered or does not exist." }, 409);
      await deliverNotification(env, id);
      await audit(env, actor, "service_request.notification_retried", "service_request", String(id));
      return json(await deliveryDetails(env, id));
    }
    if (path.startsWith("/api/garage/requests/") && request.method === "PATCH") {
      try {
        const body = await bodyJson(request), id = Number(path.slice("/api/garage/requests/".length)), allowed = ["status", "preferredDate", "preferredTime", "details"];
        if (!Number.isInteger(id) || Object.keys(body).some((key) => !allowed.includes(key)) || body.status && !["new", "scheduled", "dispatched", "completed"].includes(body.status)) return json({ error: "Invalid update." }, 400);
        const columns = { status: "status", preferredDate: "preferred_date", preferredTime: "preferred_time", details: "details" }, keys = Object.keys(body);
        if (!keys.length) return json({ error: "Invalid update." }, 400);
        const result = await env.DB.prepare(`UPDATE service_requests SET ${keys.map((key) => `${columns[key]}=?`).join(",")} WHERE id=?`).bind(...keys.map((key) => body[key]), id).run();
        if (!result.meta.changes) return json({ error: "Request not found." }, 404);
        return json(mapRequest(await env.DB.prepare("SELECT * FROM service_requests WHERE id=?").bind(id).first()));
      } catch (e) {
        return json({ error: e.message }, 400);
      }
    }
    if (path === "/api/garage/dashboard") {
      const r = await env.DB.prepare("SELECT * FROM service_requests ORDER BY created_at DESC").all(), rows = r.results;
      return json({ newRequests: rows.filter((x) => x.status === "new").length, scheduledToday: rows.filter((x) => x.status === "scheduled").length, emergencyCalls: rows.filter((x) => x.urgency === "emergency" && x.status !== "completed").length, completedThisWeek: rows.filter((x) => x.status === "completed").length, estimatedRevenue: 0, requests: rows.slice(0, 8).map(mapRequest) });
    }
    if (path === "/api/garage/settings" && request.method === "GET") {
      const row = await env.DB.prepare("SELECT settings_json, verified FROM business_settings WHERE id=1").first();
      return json(row ? { ...JSON.parse(row.settings_json), id: 1, verificationStatus: row.verified ? "verified" : "unverified" } : fallbackSettings);
    }
    if (path === "/api/garage/settings" && request.method === "PATCH") {
      try {
        const update = await bodyJson(request);
        delete update.id;
        const current = await env.DB.prepare("SELECT settings_json,verified FROM business_settings WHERE id=1").first();
        const currentSettings = current ? JSON.parse(current.settings_json) : fallbackSettings;
        const sensitiveKeys = ["businessName", "phone", "email", "serviceArea", "hours", "coverage", "urgentPolicy", "emergencyEnabled", "trustProfile"];
        const sensitiveChanged = sensitiveKeys.some(
          (key) => Object.prototype.hasOwnProperty.call(update, key) && JSON.stringify(update[key]) !== JSON.stringify(currentSettings[key])
        );
        const explicitlyUnverified = update.verificationStatus === "unverified" || update.verified === false;
        const verified = explicitlyUnverified || sensitiveChanged ? false : current?.verified === 1;
        delete update.verificationStatus;
        delete update.verified;
        delete update.verificationAcknowledged;
        if (update.claimVerification && typeof update.claimVerification === "object") {
          const now = (/* @__PURE__ */ new Date()).toISOString();
          update.claimVerification = Object.fromEntries(Object.entries(update.claimVerification).map(([key, claim]) => [key, { ...claim, verifiedAt: claim?.status === "verified" ? claim.verifiedAt || now : null }]));
        }
        const next = { ...currentSettings, ...update };
        await env.DB.prepare("INSERT INTO business_settings (id,settings_json,verified,updated_at) VALUES (1,?,?,CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET settings_json=excluded.settings_json,verified=excluded.verified,updated_at=CURRENT_TIMESTAMP").bind(JSON.stringify(next), verified ? 1 : 0).run();
        await audit(env, actor, "business_settings.updated", "business_settings", "1", Object.keys(update));
        return json({ ...next, id: 1, verificationStatus: verified ? "verified" : "unverified" });
      } catch (e) {
        return json({ error: e.message || "Invalid settings." }, 400);
      }
    }
    return json({ error: "Not found" }, 404);
  }
  return json({ error: "Not found" }, 404);
}
function withAssetHeaders(response, assetPath) {
  const headers = new Headers(response.headers);
  const versioned = /^\/assets\/.+-[A-Za-z0-9_-]{8,}\.[a-z0-9]+$/i.test(assetPath);
  headers.set("cache-control", assetPath === "/index.html" ? "no-store" : versioned ? "public, max-age=31536000, immutable" : "public, max-age=300, must-revalidate");
  headers.set("content-security-policy", "frame-ancestors 'self' https://creativecoders.tech https://*.creativecoders.tech");
  headers.set("x-content-type-options", "nosniff");
  headers.set("x-robots-tag", "noindex, nofollow, noarchive");
  headers.set("referrer-policy", "strict-origin-when-cross-origin");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
async function serveAsset(request, url, context, env) {
  if (!env?.ASSETS) return new Response("Pages asset binding is not configured.", { status: 503 });
  const requestPath = normalizePublicPath(url.pathname);
  const assetPath = requestPath === "/" || !/\.[a-z0-9]+$/i.test(requestPath) ? "/index.html" : requestPath;
  const assetUrl = new URL(request.url);
  assetUrl.pathname = assetPath === "/index.html" ? "/" : assetPath;
  return withAssetHeaders(await env.ASSETS.fetch(new Request(assetUrl, request)), assetPath);
}
async function sitePublication(env, requestUrl) {
  if (!env.DB) throw new Error("Publication database is not configured.");
  const [row, notification] = await Promise.all([
    env.DB.prepare("SELECT settings_json, verified FROM business_settings WHERE id=1").first(),
    env.DB.prepare("SELECT enabled,webhook_url,destination_verified,tested_at FROM notification_settings WHERE id=1").first()
  ]);
  const runtime = launchRuntime(env, requestUrl);
  const projected = publicSettings(row, {
    notificationConfigured: !!(notification?.enabled && webhookAuthorized(notification.webhook_url || "", env)),
    notificationDestinationVerified: notification?.destination_verified === 1 && webhookAuthorized(notification.webhook_url || "", env),
    notificationTested: !!notification?.tested_at
  });
  return {
    ...projected,
    ...runtime,
    launchReady: projected.launchReady && runtime.runtimeReady
  };
}
const worker = {
  async fetch(request, env, context) {
    const url = new URL(request.url), publicPath = normalizePublicPath(url.pathname);
    try {
      if (publicPath.startsWith("/api/")) {
        const proxied = await clerkProxy(request, env, publicPath);
        if (proxied) return proxied;
        const apiUrl = new URL(url);
        apiUrl.pathname = publicPath;
        return await handleApi(request, apiUrl, env);
      }
      if ((request.method === "GET" || request.method === "HEAD") && publicPath === "/robots.txt") {
        const settings2 = await sitePublication(env, request.url);
        return new Response(request.method === "HEAD" ? null : renderRobots(request.url, settings2), { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" } });
      }
      if ((request.method === "GET" || request.method === "HEAD") && publicPath === "/sitemap.xml") {
        const [content2, settings2] = await Promise.all([getPublicContent(env), sitePublication(env, request.url)]);
        return new Response(request.method === "HEAD" ? null : renderSitemap(request.url, content2, settings2), { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" } });
      }
      const assetResponse = await serveAsset(request, url, context, env);
      if (request.method !== "GET" && request.method !== "HEAD" || /\.[a-z0-9]+$/i.test(publicPath)) return assetResponse;
      const [content, settings] = await Promise.all([
        getPublicContent(env),
        sitePublication(env, request.url)
      ]);
      return serveSiteDocument(request, assetResponse, content, settings);
    } catch {
      return json({ error: "Service unavailable." }, 503);
    }
  }
};
export {
  worker as default,
  getPublicContent,
  publicSettings,
  selectApprovedService,
  signatureMatches,
  sitePublication,
  validateWebhook
};
