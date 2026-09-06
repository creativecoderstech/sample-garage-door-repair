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
  const publicRecords = content.filter((item2) => item2.status === "published" && (item2.kind !== "trust" || item2.verificationStatus === "verified"));
  const item = publicRecords.find((record) => contentPath(record) === path);
  const alias = publicRecords.find((record) => (record.aliases || []).some((slug) => contentPath({ ...record, slug }) === path));
  const legacy = LEGACY_ROUTES[path];
  const redirect = legacy || (alias ? contentPath(alias) : null);
  const isAdmin = path === "/admin" || path.startsWith("/admin/");
  const title = item ? item.seoTitle || item.title : isAdmin ? "Business Admin — Demo" : "Page Not Found";
  const description = item ? item.seoDescription || item.summary : isAdmin ? "Demonstration administration area. Do not enter real customer or business data." : "This page is unavailable. Browse the garage-door guides or start a service request.";
  const canonical = new URL(item ? contentPath(item) : path, url.origin).href;
  const name = settings.businessName || "Garage Door Service Preview";
  const pageType = item?.kind === "article" ? "Article" : "WebPage";
  const graph = item ? [
    { "@type": "WebSite", "@id": `${url.origin}/#website`, name, url: `${url.origin}/` },
    {
      "@type": pageType,
      "@id": `${canonical}#page`,
      url: canonical,
      name: title,
      ...pageType === "Article" ? { headline: item.title } : {},
      description,
      isPartOf: { "@id": `${url.origin}/#website` },
      ...item.updatedAt ? { dateModified: item.updatedAt } : {}
    },
    ...path !== "/" ? [{
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${url.origin}/` },
        { "@type": "ListItem", position: 2, name: item.title, item: canonical }
      ]
    }] : []
  ] : [];
  let image = "";
  if (item?.imageUrl && /^(?:\/(?!\/)|https:\/\/)/i.test(item.imageUrl)) {
    image = new URL(item.imageUrl, url.origin).href;
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
    robots: "noindex, nofollow, noarchive",
    structuredData: { "@context": "https://schema.org", "@graph": graph }
  };
}
function renderSitemap(requestUrl, content) {
  const origin = new URL(requestUrl).origin;
  const routes = new Map(content.filter((item) => item.status === "published").map((item) => [contentPath(item), item]).filter(([path]) => path));
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
` + [...routes].map(([path, item]) => {
    const date = new Date(item.updatedAt);
    const lastmod = Number.isFinite(date.getTime()) ? `<lastmod>${date.toISOString()}</lastmod>` : "";
    return `  <url><loc>${escapeHtml(new URL(path, origin).href)}</loc>${lastmod}</url>`;
  }).join("\n") + "\n</urlset>";
}
function renderRobots(requestUrl) {
  return `User-agent: *
Disallow: /

# Non-indexed demo: staff access is not secured.
Sitemap: ${new URL("/sitemap.xml", requestUrl).href}
`;
}
function renderMetadata(route) {
  const attribute = (value) => escapeHtml(value);
  const json2 = JSON.stringify(route.structuredData).replace(/</g, "\\u003c");
  return [
    `<title>${escapeHtml(route.title)}</title>`,
    `<meta name="description" content="${attribute(route.description)}">`,
    `<meta name="robots" content="${route.robots}">`,
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
const REPOSITORY = "https://raw.githubusercontent.com/creativecoderstech/sample-garage-door-repair";
const ASSET_REVISION = "7fcea38e152bfcad81af960fe298d2e25860a94f";
const BUILD_ROOT = "artifacts/sample-garage-door-repair/dist/public";
const ARTIFACT_BASE_PATH = "/sample-garage-door-repair";
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
const fallbackSettings = { id: 1, businessName: "Garage Door Service Preview", phone: "", email: "", serviceArea: "Service area awaiting verification", theme: "industrial", serviceId: "garage-door-repair", emergencyEnabled: false, heroImage: "/images/garage/hero-door-forward.jpg", galleryImages: ["/images/garage/modern-white-home.jpg"], verificationStatus: "unverified", trustProfile: { hours: null, ownerTeam: null, yearsInBusiness: null, brandsServiced: null, paymentOptions: null, financing: null, licenseInsurance: null, warranty: null } };
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
async function staff(request, env) {
  const hostname = new URL(request.url).hostname;
  return env?.LOCAL_DEMO_ADMIN === "true" && ["localhost", "127.0.0.1", "[::1]"].includes(hostname);
}
function publicSettings(row) {
  const verified = row?.verified === 1;
  const base = { ...fallbackSettings, ...row ? JSON.parse(row.settings_json) : {} };
  return { businessName: verified ? base.businessName : fallbackSettings.businessName, phone: verified ? base.phone : "", email: verified ? base.email : "", serviceArea: verified ? base.serviceArea : fallbackSettings.serviceArea, theme: base.theme, emergencyEnabled: verified && !!base.emergencyEnabled, heroImage: base.heroImage, galleryImages: base.galleryImages, verificationStatus: verified ? "verified" : "unverified", trustProfile: verified ? base.trustProfile || fallbackSettings.trustProfile : fallbackSettings.trustProfile };
}
const CONTENT_KINDS = /* @__PURE__ */ new Set(["page", "service", "location", "article", "faq", "project", "trust"]);
const CORE_PAGES = /* @__PURE__ */ new Set(["home", "services", "service-area", "about", "blog", "contact", "gallery", "faqs"]);
const CONTENT_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
function mapContent(row) {
  return { id: row.id, kind: row.kind, slug: row.slug, aliases: JSON.parse(row.aliases_json || "[]"), title: row.title, summary: row.summary, body: row.body, imageUrl: row.image_url, imageAlt: row.image_alt, beforeImageUrl: row.before_image_url, seoTitle: row.seo_title, seoDescription: row.seo_description, parentId: row.parent_id, sortOrder: row.sort_order, status: row.status, verificationStatus: row.verification_status, featured: row.featured === 1, serviceCode: row.service_code, updatedAt: row.updated_at };
}
function publicContentRow(row) {
  if (row.status !== "published") return null;
  if (row.verification_status !== "verified" && row.reviewed_seed !== 1) return null;
  if (row.kind === "trust" && row.verification_status !== "verified") return null;
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
const contentValues = (value) => [value.kind, value.slug, JSON.stringify(value.aliases), value.title, value.summary, value.body, value.imageUrl, value.imageAlt, value.beforeImageUrl, value.seoTitle, value.seoDescription, value.parentId ?? null, value.sortOrder, value.status, value.verificationStatus, value.featured ? 1 : 0, value.serviceCode];
function suggest(message) {
  if (/spring|torsion|extension/i.test(message)) return "springs";
  if (/opener|remote|keypad|sensor|motor/i.test(message)) return "opener";
  if (/new (?:garage )?door|replace|install/i.test(message)) return "installation";
  if (/maint|inspect|tune|lubricat|annual/i.test(message)) return "maintenance";
  if (/off.?track|track|roller|cable|hinge|noisy|slow/i.test(message)) return "repair";
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
  let row = null, publicContent = [];
  try {
    if (env.DB) {
      row = await env.DB.prepare("SELECT settings_json, verified FROM business_settings WHERE id=1").first();
      publicContent = await getPublicContent(env);
    }
  } catch {
    row = null;
    publicContent = [];
  }
  const settings = publicSettings(row), businessVerified = settings.verificationStatus === "verified";
  const catalog = publicContent.filter((item) => item.kind === "service");
  const catalogVerified = catalog.some((item) => item.verificationStatus === "verified");
  const serviceLines = catalog.length ? catalog.map((service) => `- ${service.title} (${service.serviceCode || service.slug}): ${service.summary} ${service.body}`).join("\n") : "- No service guidance is published.";
  const faqLines = customerCareFaqs.map(([question, answer]) => `- ${question}: ${answer}`).join("\n");
  const contentLines = publicContent.filter((item) => ["service", "faq", "trust"].includes(item.kind)).map((item) => `- ${item.title}: ${item.summary} ${item.body}`).join("\n");
  return { settings, catalog, text: ["AUTHORITATIVE WEBSITE AND BUSINESS CONTEXT — use only these facts.", `Business: ${settings.businessName}`, `Business profile verification: ${businessVerified ? "verified" : "unverified"}.`, `Phone: ${settings.phone || "not verified"}`, `Email: ${settings.email || "not verified"}`, `Service area: ${settings.serviceArea}`, `Hours: ${settings.trustProfile?.hours || "not verified"}`, `Warranty: ${settings.trustProfile?.warranty || "not verified"}`, `License and insurance: ${settings.trustProfile?.licenseInsurance || "not verified"}`, "A service request is reviewed by the business and is not a confirmed appointment. Coverage, timing, and final price require confirmation.", `Business service-offering verification: ${catalogVerified ? "at least one service record is verified" : "not verified; service records are educational only"}.`, "Services:", serviceLines, "Approved customer guidance:", faqLines, "Published content:", contentLines || "- No published content is available.", "Do not invent reviews, ratings, hours, appointment slots, guarantees, warranties, credentials, refunds, final prices, urgent availability, or coverage. If a detail is absent or unverified, say so and recommend a service request."].join("\n") };
}
function fallbackAssistant(message, verified) {
  const urgent = urgentGarageTerms.test(message), issue = garageIssueTerms.test(message);
  const safetyLevel = urgent ? "urgent" : issue ? "caution" : "safe";
  let reply = urgent ? "Please stop using the door and keep people, pets, and vehicles clear. Springs, cables, and an off-track door can be dangerous; arrange professional help rather than trying to move or repair it yourself." : /price|cost|quote|estimate/i.test(message) ? "Final pricing must be confirmed after a technician diagnoses the door." : /hours|coverage|zip|warranty|license|insured|credential|available|schedule|appointment/i.test(message) ? "I don’t have that detail confirmed here. The business will need to review it." : issue ? "That sounds frustrating. If the door is heavy, crooked, or made a sharp pop, stop using it. Tell me whether it is stuck, noisy, slow, or the opener is not responding." : "I don’t have that answer in the approved garage-door information.";
  const serviceRequestRecommended = shouldRecommendServiceRequest(message, safetyLevel, reply);
  reply = withServiceRequestGuidance(reply, serviceRequestRecommended);
  return { reply, safetyLevel, suggestedService: verified ? suggest(message) : "Service assessment", serviceRequestRecommended };
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
  if (path === "/api/garage/cloudflare-config") {
    const siteKey = env.TURNSTILE_SITE_KEY || "";
    return json({
      turnstile: { enabled: !!siteKey, siteKey },
      siteKey,
      features: { turnstile: !!siteKey, assistant: !!env.AI, media: !!env.MEDIA }
    });
  }
  if (path === "/api/garage/services") {
    const catalog = (await getPublicContent(env)).filter((item) => item.kind === "service");
    return json(catalog.map((service, index) => ({ id: index + 1, slug: service.serviceCode || service.slug, name: service.title, description: service.summary, startingPrice: null, duration: "Assessment required", emergency: false })));
  }
  if (path === "/api/garage/testimonials") return json([]);
  if (path === "/api/garage/reviews") return json({ mode: "live", connectionStatus: "disconnected", locationName: "Google Business Profile not connected", aggregateRating: 0, totalReviewCount: 0, lastSyncedAt: null, profileUrl: null, reviews: [] }, 200, { "cache-control": "public, max-age=300" });
  if (path === "/api/garage/site-settings") {
    const row = await env.DB?.prepare("SELECT settings_json, verified FROM business_settings WHERE id=1").first();
    return json(publicSettings(row));
  }
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
      const body = await bodyJson(request);
      if (!await verifyTurnstile(body.turnstileToken, "booking", request, env)) return json({ error: "Verification failed. Please try again." }, 403);
      const required = ["customerName", "phone", "email", "streetAddress", "city", "state", "zip", "service", "urgency", "preferredDate"];
      if (required.some((key) => !String(body[key] || "").trim()) || !["emergency", "soon", "flexible"].includes(body.urgency) || String(body.customerName).length > 120) return json({ error: "Please check the request details." }, 400);
      const createdAt = (/* @__PURE__ */ new Date()).toISOString();
      const inserted = await env.DB.prepare("INSERT INTO service_requests (customer_name,phone,email,street_address,city,state,zip,service,urgency,preferred_date,preferred_time,details,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(body.customerName, body.phone, body.email, body.streetAddress, body.city, body.state, body.zip, body.service, body.urgency, body.preferredDate, body.preferredTime || "", body.details || "", createdAt).run();
      const row = await env.DB.prepare("SELECT * FROM service_requests WHERE id=?").bind(inserted.meta.last_row_id).first();
      await analytics(request, env, { event: "booking_complete" });
      return json(mapRequest(row), 201);
    } catch (e) {
      return json({ error: e.message || "Unable to send request." }, 400);
    }
  }
  if (path === "/api/garage/assistant" && request.method === "POST") {
    if (!await rateLimit(request, env, "assistant", 12, 600)) return json({ error: "Too many questions. Please try again later." }, 429);
    try {
      const body = await bodyJson(request);
      if (!await verifyTurnstile(body.turnstileToken, "assistant", request, env)) return json({ error: "Verification failed. Please try again." }, 403);
      const message = String(body.message || "").trim().slice(0, 1e3);
      if (!message) return json({ error: "Ask a question about your garage door." }, 400);
      const history = cleanHistory(body.history), context = await getCustomerCareContext(env), candidate = suggest([...history.map((item) => item.content), message].join("\n")), catalog = context.catalog.find((service) => service.serviceCode === candidate), safe = fallbackAssistant(message, !!catalog), casualReply = casualCustomerCareReply(message, context.settings.businessName);
      if (casualReply) return json({ reply: casualReply, safetyLevel: "safe", suggestedService: "Service assessment", serviceRequestRecommended: false });
      if (!env.AI) return json(safe);
      try {
        const out = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", { messages: [{ role: "system", content: [`You are Maya, the friendly customer-care coordinator for ${context.settings.businessName}. Speak warmly, naturally, and plainly as the first helpful voice a homeowner reaches.`, "You are an AI-assisted service-information tool, not a technician or emergency service. Never imply a human is monitoring the conversation.", "Answer business, service, estimate, coverage, timing, review, FAQ, and booking questions only from the authoritative context below. If the context does not confirm an answer, say that plainly and invite the customer to start a service request. Never guess.", "Keep replies to 2–5 short sentences and ask at most one useful follow-up question. Connect a symptom to one verified service when possible rather than listing everything.", "A service request is not an appointment. Never promise coverage, timing, arrival, final price, warranties, credentials, refunds, or availability.", "SAFETY: Never instruct customers to adjust, unwind, cut, replace, or pull springs, cables, bottom brackets, tracks, or other high-tension parts. For crooked, hanging, fallen, off-track, unusually heavy, or spring-damaged doors, tell them to stop using the door and keep people, pets, and vehicles clear.", context.text].join("\n\n") }, ...history, { role: "user", content: message }] });
        let reply = String(out?.response || "").trim();
        if (!reply || /(?:appointment (?:is |has been )?confirmed|guaranteed|we can be there|available today|licensed and insured|open 24)/i.test(reply) || context.settings.verificationStatus !== "verified" && /(?:we serve|our hours|our warranty|we are licensed|call us at|email us at)/i.test(reply) || !catalog && /\$\d/.test(reply)) return json(safe);
        const safetyLevel = urgentGarageTerms.test([...history.map((item) => item.content), message].join("\n")) ? "urgent" : garageIssueTerms.test(message) ? "caution" : "safe";
        if (safetyLevel === "urgent" && !/stop|do not|don't|keep .* clear|professional/i.test(reply)) return json(safe);
        const serviceRequestRecommended = shouldRecommendServiceRequest(message, safetyLevel, reply);
        reply = withServiceRequestGuidance(reply, serviceRequestRecommended);
        return json({ reply, safetyLevel, suggestedService: catalog ? candidate : "Service assessment", serviceRequestRecommended });
      } catch {
        return json(safe);
      }
    } catch (e) {
      return json({ error: e.message }, 400);
    }
  }
  if (path === "/api/garage/media" && request.method === "POST") {
    if (!await staff(request, env)) return json({ error: "Staff authorization required." }, 403);
    if (!env.MEDIA) return json({ error: "Media storage is not configured." }, 503);
    const type = request.headers.get("content-type")?.split(";")[0].toLowerCase();
    const size = Number(request.headers.get("content-length") || 0);
    if (!SAFE_MEDIA_TYPES.has(type) || size < 1 || size > MAX_MEDIA_BYTES) return json({ error: "Use a JPEG, PNG, or WebP image up to 8 MB." }, 400);
    const key = `uploads/${crypto.randomUUID()}.${type.split("/")[1]}`;
    await env.MEDIA.put(key, request.body, { httpMetadata: { contentType: type } });
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
    if (!await staff(request, env)) return json({ error: "Staff authorization required." }, 403);
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
        await env.DB.prepare("INSERT INTO garage_content (id,kind,slug,aliases_json,title,summary,body,image_url,image_alt,before_image_url,seo_title,seo_description,parent_id,sort_order,status,verification_status,featured,service_code,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(id, ...contentValues(value), now).run();
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
          if (current.kind !== "page" && value.slug && value.slug !== current.slug && Array.isArray(value.aliases)) value.aliases = [.../* @__PURE__ */ new Set([...value.aliases, current.slug])].slice(0, 25);
          if (value.status === "published" && value.verificationStatus === "verified" && value.verificationAcknowledged !== true) return json({ error: "Explicit verification acknowledgement is required before publishing business claims." }, 400);
          const invalid = validateContent(value) || await validateContentRelations(env, value, id);
          if (invalid) return json({ error: invalid }, 400);
          await env.DB.prepare("UPDATE garage_content SET kind=?,slug=?,aliases_json=?,title=?,summary=?,body=?,image_url=?,image_alt=?,before_image_url=?,seo_title=?,seo_description=?,parent_id=?,sort_order=?,status=?,verification_status=?,featured=?,service_code=?,reviewed_seed=0,updated_at=? WHERE id=?").bind(...contentValues(value), (/* @__PURE__ */ new Date()).toISOString(), id).run();
          return json(mapContent(await env.DB.prepare("SELECT * FROM garage_content WHERE id=?").bind(id).first()));
        } catch (e) {
          return json({ error: e.message || "Invalid content." }, 400);
        }
      }
      if (request.method === "DELETE") {
        if (current.kind === "page" && CORE_PAGES.has(current.slug)) return json({ error: "Core pages cannot be deleted; set status to draft instead." }, 409);
        if (await env.DB.prepare("SELECT id FROM garage_content WHERE parent_id=? LIMIT 1").bind(id).first()) return json({ error: "Move or delete child content before deleting its parent." }, 409);
        await env.DB.prepare("DELETE FROM garage_content WHERE id=?").bind(id).run();
        return new Response(null, { status: 204 });
      }
    }
    return json({ error: "Not found" }, 404);
  }
  if (path === "/api/garage/requests" || path.startsWith("/api/garage/requests/") || path === "/api/garage/dashboard" || path === "/api/garage/settings") {
    if (!await staff(request, env)) return json({ error: "Staff authorization required." }, 403);
    if (!env.DB) return json({ error: "Database is not configured." }, 503);
    if (path === "/api/garage/requests" && request.method === "GET") {
      const r = await env.DB.prepare("SELECT * FROM service_requests ORDER BY created_at DESC").all();
      return json(r.results.map(mapRequest));
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
        const sensitiveKeys = ["businessName", "phone", "email", "serviceArea", "emergencyEnabled", "trustProfile"];
        const sensitiveChanged = sensitiveKeys.some(
          (key) => Object.prototype.hasOwnProperty.call(update, key) && JSON.stringify(update[key]) !== JSON.stringify(currentSettings[key])
        );
        const explicitlyVerified = update.verificationStatus === "verified" || update.verified === true;
        const explicitlyUnverified = update.verificationStatus === "unverified" || update.verified === false;
        if (explicitlyVerified && update.verificationAcknowledged !== true) return json({ error: "Explicit verification acknowledgement is required before publishing business claims." }, 400);
        const verified = explicitlyVerified && update.verificationAcknowledged === true ? true : explicitlyUnverified || sensitiveChanged ? false : current?.verified === 1;
        delete update.verificationStatus;
        delete update.verified;
        delete update.verificationAcknowledged;
        const next = { ...currentSettings, ...update };
        await env.DB.prepare("INSERT INTO business_settings (id,settings_json,verified,updated_at) VALUES (1,?,?,CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET settings_json=excluded.settings_json,verified=excluded.verified,updated_at=CURRENT_TIMESTAMP").bind(JSON.stringify(next), verified ? 1 : 0).run();
        return json({ ...next, id: 1, verificationStatus: verified ? "verified" : "unverified" });
      } catch (e) {
        return json({ error: e.message || "Invalid settings." }, 400);
      }
    }
    return json({ error: "Not found" }, 404);
  }
  return json({ error: "Not found" }, 404);
}
const mimeTypes = { ".css": "text/css; charset=utf-8", ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml", ".txt": "text/plain; charset=utf-8", ".webp": "image/webp" };
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
  const requestPath = url.pathname === ARTIFACT_BASE_PATH ? "/" : url.pathname.startsWith(`${ARTIFACT_BASE_PATH}/`) ? url.pathname.slice(ARTIFACT_BASE_PATH.length) : url.pathname, assetPath = requestPath === "/" || !/\.[a-z0-9]+$/i.test(requestPath) ? "/index.html" : requestPath;
  if (env?.ASSETS) {
    const assetUrl = new URL(request.url);
    assetUrl.pathname = assetPath === "/index.html" ? "/" : assetPath;
    return withAssetHeaders(await env.ASSETS.fetch(new Request(assetUrl, request)), assetPath);
  }
  const sourceUrl = `${REPOSITORY}/${ASSET_REVISION}/${BUILD_ROOT}${assetPath}`, cache = caches.default, cacheKey = new Request(`${url.origin}${assetPath}?revision=${ASSET_REVISION}`);
  let response = await cache.match(cacheKey);
  if (!response) {
    const upstream = await fetch(sourceUrl);
    if (!upstream.ok) return new Response("Asset not found", { status: upstream.status });
    response = withAssetHeaders(new Response(upstream.body, { headers: { "content-type": mimeTypes[assetPath.slice(assetPath.lastIndexOf(".")).toLowerCase()] || upstream.headers.get("content-type") || "application/octet-stream" } }), assetPath);
    context.waitUntil(cache.put(cacheKey, response.clone()));
  }
  return response;
}
const worker = {
  async fetch(request, env, context) {
    const url = new URL(request.url), publicPath = normalizePublicPath(url.pathname);
    try {
      if (publicPath.startsWith("/api/")) {
        const apiUrl = new URL(url);
        apiUrl.pathname = publicPath;
        return await handleApi(request, apiUrl, env);
      }
      if ((request.method === "GET" || request.method === "HEAD") && publicPath === "/robots.txt") {
        return new Response(request.method === "HEAD" ? null : renderRobots(request.url), { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex, nofollow, noarchive" } });
      }
      if ((request.method === "GET" || request.method === "HEAD") && publicPath === "/sitemap.xml") {
        const content2 = await getPublicContent(env);
        return new Response(request.method === "HEAD" ? null : renderSitemap(request.url, content2), { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex, nofollow, noarchive" } });
      }
      const assetResponse = await serveAsset(request, url, context, env);
      if (request.method !== "GET" && request.method !== "HEAD" || /\.[a-z0-9]+$/i.test(publicPath)) return assetResponse;
      const [content, settingsRow] = await Promise.all([
        getPublicContent(env),
        env.DB?.prepare("SELECT settings_json, verified FROM business_settings WHERE id=1").first()
      ]);
      return serveSiteDocument(request, assetResponse, content, publicSettings(settingsRow));
    } catch {
      return json({ error: "Service unavailable." }, 503);
    }
  }
};
export {
  worker as default,
  getPublicContent,
  publicSettings
};
