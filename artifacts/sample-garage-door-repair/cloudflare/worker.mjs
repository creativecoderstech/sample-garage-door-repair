const REPOSITORY = "https://raw.githubusercontent.com/creativecoderstech/sample-garage-door-repair";
const ASSET_REVISION = "a5bf00be9e025c66aa8e179c5fa23ac1d6c4aa0c";
const BUILD_ROOT = "artifacts/sample-garage-door-repair/dist/public";
const ARTIFACT_BASE_PATH = "/sample-garage-door-repair";
const MAX_JSON_BYTES = 32 * 1024;
const MAX_MEDIA_BYTES = 8 * 1024 * 1024;
const SAFE_MEDIA_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const services = [
  { id: 1, slug: "broken-spring", name: "Broken Spring Repair", description: "High-cycle spring replacement with a complete safety inspection.", startingPrice: 189, duration: "60–90 min", emergency: true },
  { id: 2, slug: "opener-repair", name: "Opener Repair & Installation", description: "Quiet smart openers, remotes, keypads, sensors, gears, and motor diagnostics.", startingPrice: 149, duration: "60–120 min", emergency: false },
  { id: 3, slug: "off-track-door", name: "Off-Track Door Rescue", description: "Safe realignment of rollers, tracks, and cables before more damage occurs.", startingPrice: 169, duration: "60–90 min", emergency: true },
  { id: 4, slug: "new-door", name: "New Garage Door Installation", description: "Insulated steel, carriage-house, and modern glass doors measured and installed precisely.", startingPrice: 1299, duration: "4–6 hours", emergency: false },
  { id: 5, slug: "cable-roller", name: "Cable, Roller & Hinge Repair", description: "Restore smooth, quiet travel with matched hardware and professional balancing.", startingPrice: 129, duration: "45–90 min", emergency: true },
  { id: 6, slug: "maintenance", name: "Safety Tune-Up", description: "A 25-point inspection, balance test, lubrication, and safety-reversal verification.", startingPrice: 89, duration: "45 min", emergency: false },
];
const fallbackSettings = { id: 1, businessName: "Garage Door Service Preview", phone: "", email: "", serviceArea: "Service area awaiting verification", theme: "industrial", serviceId: "garage-door-repair", emergencyEnabled: false, heroImage: "/images/garage/hero-door-forward.jpg", galleryImages: ["/images/garage/modern-white-home.jpg"], verificationStatus: "unverified", trustProfile: { hours: null, ownerTeam: null, yearsInBusiness: null, brandsServiced: null, paymentOptions: null, financing: null, licenseInsurance: null, warranty: null } };
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": status === 200 ? "no-store" : "private, no-store", ...headers } });
const b64 = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
const isProduction = env =>
  env.CLOUDFLARE_ENV === "production" ||
  env.ENVIRONMENT === "production" ||
  env.CF_PAGES_BRANCH === "main";

async function bodyJson(request) {
  const length = Number(request.headers.get("content-length") || 0);
  if (length > MAX_JSON_BYTES) throw new Error("Request is too large.");
  const text = await request.text();
  if (text.length > MAX_JSON_BYTES) throw new Error("Request is too large.");
  try { return JSON.parse(text); } catch { throw new Error("Invalid JSON."); }
}
async function sha(value) { return [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)))].map(x => x.toString(16).padStart(2, "0")).join(""); }
async function rateLimit(request, env, bucket, limit, seconds = 60) {
  if (!env.DB) return isProduction(env) ? false : true;
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  const key = `${bucket}:${await sha(ip)}`, windowStart = Math.floor(Date.now() / 1000 / seconds) * seconds;
  try {
    await env.DB.prepare("INSERT INTO rate_limits (rate_key, window_start, count) VALUES (?, ?, 1) ON CONFLICT(rate_key, window_start) DO UPDATE SET count=count+1").bind(key, windowStart).run();
    const row = await env.DB.prepare("SELECT count FROM rate_limits WHERE rate_key=? AND window_start=?").bind(key, windowStart).first();
    return Number(row?.count || 0) <= limit;
  } catch { return false; }
}
async function verifyTurnstile(token, action, request, env) {
  if (!token || !env.TURNSTILE_SECRET_KEY) return false;
  try {
    const form = new FormData(); form.set("secret", env.TURNSTILE_SECRET_KEY); form.set("response", token); form.set("remoteip", request.headers.get("cf-connecting-ip") || "");
    const result = await (await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form })).json();
    return result.success === true && result.action === action && (!result.hostname || result.hostname === new URL(request.url).hostname);
  } catch { return false; }
}
async function staff() {
  return true;
}
function publicSettings(row) {
  const verified = row?.verified === 1;
  const base = { ...fallbackSettings, ...(row ? JSON.parse(row.settings_json) : {}) };
  return { businessName: base.businessName, phone: verified ? base.phone : "", email: verified ? base.email : "", serviceArea: verified ? base.serviceArea : fallbackSettings.serviceArea, theme: base.theme, emergencyEnabled: verified && !!base.emergencyEnabled, heroImage: base.heroImage, galleryImages: base.galleryImages, verificationStatus: verified ? "verified" : "unverified", trustProfile: verified ? (base.trustProfile || fallbackSettings.trustProfile) : fallbackSettings.trustProfile };
}
function suggest(message) { if (/spring|torsion|extension/i.test(message)) return "Broken Spring Repair"; if (/off.?track|track|roller/i.test(message)) return "Off-Track Door Rescue"; if (/cable|hinge/i.test(message)) return "Cable, Roller & Hinge Repair"; if (/opener|remote|keypad|sensor|motor/i.test(message)) return "Opener Repair & Installation"; if (/new (?:garage )?door|replace|install/i.test(message)) return "New Garage Door Installation"; if (/maint|inspect|tune|noisy|slow/i.test(message)) return "Safety Tune-Up"; return "Service assessment"; }
function mapService(row) { return { id: row.id, slug: row.slug, name: row.name, description: row.description, startingPrice: row.starting_price, duration: row.duration, emergency: row.emergency === 1 }; }
function mapRequest(row) { return { id: row.id, customerName: row.customer_name, phone: row.phone, email: row.email, streetAddress: row.street_address, city: row.city, state: row.state, zip: row.zip, service: row.service, urgency: row.urgency, status: row.status, preferredDate: row.preferred_date, preferredTime: row.preferred_time, details: row.details, createdAt: row.created_at }; }
function fallbackAssistant(message, verified) {
  const urgent = /spring|cable|crooked|off.?track|fell|trapped/i.test(message), issue = /garage|door|opener|spring|cable|repair|service|quote|estimate|schedule|book|track|roller|hinge|sensor|motor/i.test(message);
  const safetyLevel = urgent ? "urgent" : issue ? "caution" : "safe";
  let reply = urgent ? "Please stop using the door and keep people, pets, and vehicles clear. Springs, cables, and an off-track door can be dangerous; arrange professional help rather than trying to move or repair it yourself." : /price|cost|quote|estimate/i.test(message) ? "Final pricing must be confirmed after a technician diagnoses the door. You can send a service request for the business to review." : /hours|coverage|zip|warranty|license|insured|credential/i.test(message) ? "That detail has not been verified here. Please submit your ZIP and request details so the business can confirm it." : issue ? "That sounds frustrating. If the door is heavy, crooked, or made a sharp pop, stop using it. Tell me whether it is stuck, noisy, slow, or the opener is not responding." : "I’m here to help with garage-door questions. What is the door doing today?";
  return { reply, safetyLevel, suggestedService: verified ? suggest(message) : "Service assessment" };
}
async function analytics(request, env, body) {
  const allowed = new Set(["service_view", "booking_start", "booking_complete", "phone_click", "iframe_referral"]);
  if (!allowed.has(body.event)) return false;
  if (env.ANALYTICS?.writeDataPoint) {
    env.ANALYTICS.writeDataPoint({ blobs: [body.event], doubles: [Date.now()], indexes: [new URL(request.url).hostname] });
  } else if (env.DB) {
    await env.DB.prepare(
      "INSERT INTO analytics_events (event_name, path, created_at) VALUES (?, ?, ?)",
    ).bind(body.event, String(body.path || "").slice(0, 200), new Date().toISOString()).run();
  }
  return true;
}
async function handleApi(request, url, env) {
  const path = url.pathname;
  if (path === "/api/garage/cloudflare-config") return json({ siteKey: env.TURNSTILE_SITE_KEY || "", features: { turnstile: !!env.TURNSTILE_SITE_KEY, assistant: !!env.AI, media: !!env.MEDIA } });
  if (path === "/api/garage/services") { if (!env.DB) return json([]); const rows = await env.DB.prepare("SELECT * FROM services WHERE verified=1 ORDER BY id").all(); return json(rows.results.map(mapService)); }
  if (path === "/api/garage/testimonials") return json([]);
  if (path === "/api/garage/reviews") return json({ mode: "live", connectionStatus: "disconnected", locationName: "Google Business Profile not connected", aggregateRating: 0, totalReviewCount: 0, lastSyncedAt: null, profileUrl: null, reviews: [] }, 200, { "cache-control": "public, max-age=300" });
  if (path === "/api/garage/site-settings") { const row = await env.DB?.prepare("SELECT settings_json, verified FROM business_settings WHERE id=1").first(); return json(publicSettings(row)); }
  if (path === "/api/garage/availability") { const zip = url.searchParams.get("zip") || ""; return json({ available: false, zip, eta: "Availability confirmation required", message: /^\d{5}(-\d{4})?$/.test(zip) ? "Submit a request and the business will confirm service coverage and timing." : "Enter a valid ZIP code so the business can confirm coverage." }); }
  if (path === "/api/garage/analytics" && request.method === "POST") { if (!await rateLimit(request, env, "analytics", 30)) return json({ error: "Too many requests." }, 429); try { return await analytics(request, env, await bodyJson(request)) ? json({ ok: true }, 202) : json({ error: "Unsupported event." }, 400); } catch (e) { return json({ error: e.message }, 400); } }
  if (path === "/api/garage/requests" && request.method === "POST") {
    if (!await rateLimit(request, env, "booking", 5, 600)) return json({ error: "Too many requests. Please try again later." }, 429);
    try { const body = await bodyJson(request); if (!await verifyTurnstile(body.turnstileToken, "booking", request, env)) return json({ error: "Verification failed. Please try again." }, 403); const required = ["customerName", "phone", "email", "streetAddress", "city", "state", "zip", "service", "urgency", "preferredDate"]; if (required.some(key => !String(body[key] || "").trim()) || !["emergency", "soon", "flexible"].includes(body.urgency) || String(body.customerName).length > 120) return json({ error: "Please check the request details." }, 400); const createdAt = new Date().toISOString(); const inserted = await env.DB.prepare("INSERT INTO service_requests (customer_name,phone,email,street_address,city,state,zip,service,urgency,preferred_date,preferred_time,details,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(body.customerName, body.phone, body.email, body.streetAddress, body.city, body.state, body.zip, body.service, body.urgency, body.preferredDate, body.preferredTime || "", body.details || "", createdAt).run(); const row = await env.DB.prepare("SELECT * FROM service_requests WHERE id=?").bind(inserted.meta.last_row_id).first(); await analytics(request, env, { event: "booking_complete" }); return json(mapRequest(row), 201); } catch (e) { return json({ error: e.message || "Unable to send request." }, 400); }
  }
  if (path === "/api/garage/assistant" && request.method === "POST") {
    if (!await rateLimit(request, env, "assistant", 12, 600)) return json({ error: "Too many questions. Please try again later." }, 429);
    try { const body = await bodyJson(request); if (!await verifyTurnstile(body.turnstileToken, "assistant", request, env)) return json({ error: "Verification failed. Please try again." }, 403); const message = String(body.message || "").trim().slice(0, 2000); if (!message) return json({ error: "Ask a question about your garage door." }, 400); const candidate = suggest(message); const catalog = candidate === "Service assessment" || !env.DB ? null : await env.DB.prepare("SELECT name FROM services WHERE verified=1 AND name=?").bind(candidate).first(); const safe = fallbackAssistant(message, !!catalog); if (!env.AI) return json(safe); try { const out = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", { messages: [{ role: "system", content: "You are Maya. Give only general, safety-first garage-door guidance. Never claim prices, hours, coverage, credentials, warranties, availability, or appointments. For springs, cables, off-track, crooked or fallen doors say stop use and keep clear. Keep under 100 words." }, { role: "user", content: message }] }); const reply = String(out?.response || "").trim(); if (!reply || /(?:\$|open\s+24|licensed|insured|warranty|guarantee|we serve|available today)/i.test(reply)) return json(safe); return json({ ...safe, reply: safe.safetyLevel === "urgent" ? safe.reply : reply }); } catch { return json(safe); } } catch (e) { return json({ error: e.message }, 400); }
  }
  if (path === "/api/garage/media" && request.method === "POST") { if (!await staff(request, env)) return json({ error: "Staff authorization required." }, 403); if (!env.MEDIA) return json({ error: "Media storage is not configured." }, 503); const type = request.headers.get("content-type")?.split(";")[0].toLowerCase(); const size = Number(request.headers.get("content-length") || 0); if (!SAFE_MEDIA_TYPES.has(type) || size < 1 || size > MAX_MEDIA_BYTES) return json({ error: "Use a JPEG, PNG, or WebP image up to 8 MB." }, 400); const key = `uploads/${crypto.randomUUID()}.${type.split("/")[1]}`; await env.MEDIA.put(key, request.body, { httpMetadata: { contentType: type } }); return json({ key, url: `/api/garage/media/${key}` }, 201); }
  if (path.startsWith("/api/garage/media/") && request.method === "GET") { const key = decodeURIComponent(path.slice("/api/garage/media/".length)); if (!/^uploads\/[0-9a-f-]+\.(jpg|jpeg|png|webp)$/.test(key) || !env.MEDIA) return json({ error: "Not found" }, 404); const object = await env.MEDIA.get(key); if (!object) return json({ error: "Not found" }, 404); return new Response(object.body, { headers: { "content-type": object.httpMetadata?.contentType || "application/octet-stream", "x-content-type-options": "nosniff", "cache-control": "public, max-age=86400" } }); }
  if (path === "/api/garage/requests" || path.startsWith("/api/garage/requests/") || path === "/api/garage/dashboard" || path === "/api/garage/settings") {
    if (!await staff(request, env)) return json({ error: "Staff authorization required." }, 403);
    if (!env.DB) return json({ error: "Database is not configured." }, 503);
    if (path === "/api/garage/requests" && request.method === "GET") { const r = await env.DB.prepare("SELECT * FROM service_requests ORDER BY created_at DESC").all(); return json(r.results.map(mapRequest)); }
    if (path.startsWith("/api/garage/requests/") && request.method === "PATCH") {
      try { const body = await bodyJson(request), id = Number(path.slice("/api/garage/requests/".length)), allowed = ["status", "preferredDate", "preferredTime", "details"]; if (!Number.isInteger(id) || Object.keys(body).some(key => !allowed.includes(key)) || (body.status && !["new", "scheduled", "dispatched", "completed"].includes(body.status))) return json({ error: "Invalid update." }, 400); const columns = { status: "status", preferredDate: "preferred_date", preferredTime: "preferred_time", details: "details" }, keys = Object.keys(body); if (!keys.length) return json({ error: "Invalid update." }, 400); const result = await env.DB.prepare(`UPDATE service_requests SET ${keys.map(key => `${columns[key]}=?`).join(",")} WHERE id=?`).bind(...keys.map(key => body[key]), id).run(); if (!result.meta.changes) return json({ error: "Request not found." }, 404); return json(mapRequest(await env.DB.prepare("SELECT * FROM service_requests WHERE id=?").bind(id).first())); } catch (e) { return json({ error: e.message }, 400); }
    }
    if (path === "/api/garage/dashboard") { const r = await env.DB.prepare("SELECT * FROM service_requests ORDER BY created_at DESC").all(), rows = r.results, prices = await env.DB.prepare("SELECT slug,starting_price FROM services").all(), priceBySlug = new Map(prices.results.map(x => [x.slug, x.starting_price])); return json({ newRequests: rows.filter(x => x.status === "new").length, scheduledToday: rows.filter(x => x.status === "scheduled").length, emergencyCalls: rows.filter(x => x.urgency === "emergency" && x.status !== "completed").length, completedThisWeek: rows.filter(x => x.status === "completed").length, estimatedRevenue: rows.reduce((sum, x) => sum + (priceBySlug.get(x.service) || 149), 0), requests: rows.slice(0, 8).map(mapRequest) }); }
    if (path === "/api/garage/settings" && request.method === "GET") { const row = await env.DB.prepare("SELECT settings_json, verified FROM business_settings WHERE id=1").first(); return json(row ? { ...JSON.parse(row.settings_json), id: 1, verificationStatus: row.verified ? "verified" : "unverified" } : fallbackSettings); }
    if (path === "/api/garage/settings" && request.method === "PATCH") {
      try { const update = await bodyJson(request); delete update.id; const verified = update.verificationStatus === "verified" || update.verified === true; delete update.verificationStatus; delete update.verified; const current = await env.DB.prepare("SELECT settings_json FROM business_settings WHERE id=1").first(); const next = { ...(current ? JSON.parse(current.settings_json) : fallbackSettings), ...update }; await env.DB.prepare("INSERT INTO business_settings (id,settings_json,verified,updated_at) VALUES (1,?,?,CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET settings_json=excluded.settings_json,verified=excluded.verified,updated_at=CURRENT_TIMESTAMP").bind(JSON.stringify(next), verified ? 1 : 0).run(); return json({ ...next, id: 1, verificationStatus: verified ? "verified" : "unverified" }); } catch (e) { return json({ error: e.message || "Invalid settings." }, 400); }
    }
    return json({ error: "Not found" }, 404);
  }
  return json({ error: "Not found" }, 404);
}
const mimeTypes = { ".css": "text/css; charset=utf-8", ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml", ".txt": "text/plain; charset=utf-8", ".webp": "image/webp" };
function withAssetHeaders(response, assetPath) { const headers = new Headers(response.headers); headers.set("cache-control", assetPath === "/index.html" ? "public, max-age=60" : "public, max-age=31536000, immutable"); headers.set("content-security-policy", "frame-ancestors 'self' https://creativecoders.tech https://*.creativecoders.tech"); headers.set("x-content-type-options", "nosniff"); headers.set("x-robots-tag", "noindex, nofollow, noarchive"); headers.set("referrer-policy", "strict-origin-when-cross-origin"); return new Response(response.body, { status: response.status, statusText: response.statusText, headers }); }
async function serveAsset(request, url, context, env) { const requestPath = url.pathname === ARTIFACT_BASE_PATH ? "/" : url.pathname.startsWith(`${ARTIFACT_BASE_PATH}/`) ? url.pathname.slice(ARTIFACT_BASE_PATH.length) : url.pathname, assetPath = requestPath === "/" || !/\.[a-z0-9]+$/i.test(requestPath) ? "/index.html" : requestPath; if (env?.ASSETS) { const assetUrl = new URL(request.url); assetUrl.pathname = assetPath === "/index.html" ? "/" : assetPath; return withAssetHeaders(await env.ASSETS.fetch(new Request(assetUrl, request)), assetPath); } const sourceUrl = `${REPOSITORY}/${ASSET_REVISION}/${BUILD_ROOT}${assetPath}`, cache = caches.default, cacheKey = new Request(`${url.origin}${assetPath}?revision=${ASSET_REVISION}`); let response = await cache.match(cacheKey); if (!response) { const upstream = await fetch(sourceUrl); if (!upstream.ok) return new Response("Asset not found", { status: upstream.status }); response = withAssetHeaders(new Response(upstream.body, { headers: { "content-type": mimeTypes[assetPath.slice(assetPath.lastIndexOf(".")).toLowerCase()] || upstream.headers.get("content-type") || "application/octet-stream" } }), assetPath); context.waitUntil(cache.put(cacheKey, response.clone())); } return response; }
export default { async fetch(request, env, context) { const url = new URL(request.url); try { return url.pathname.startsWith("/api/") ? await handleApi(request, url, env) : await serveAsset(request, url, context, env); } catch { return json({ error: "Service unavailable." }, 503); } } };