const REPOSITORY =
  "https://raw.githubusercontent.com/creativecoderstech/sample-garage-door-repair";
const ASSET_REVISION = "__GITHUB_REVISION__";
const BUILD_ROOT =
  "artifacts/sample-garage-door-repair/dist/public";

const services = [
  { id: 1, slug: "broken-spring", name: "Broken Spring Repair", description: "High-cycle spring replacement with a complete safety inspection.", startingPrice: 189, duration: "60–90 min", emergency: true },
  { id: 2, slug: "opener-repair", name: "Opener Repair & Installation", description: "Quiet smart openers, remotes, keypads, sensors, gears, and motor diagnostics.", startingPrice: 149, duration: "60–120 min", emergency: false },
  { id: 3, slug: "off-track-door", name: "Off-Track Door Rescue", description: "Safe realignment of rollers, tracks, and cables before more damage occurs.", startingPrice: 169, duration: "60–90 min", emergency: true },
  { id: 4, slug: "new-door", name: "New Garage Door Installation", description: "Insulated steel, carriage-house, and modern glass doors measured and installed precisely.", startingPrice: 1299, duration: "4–6 hours", emergency: false },
  { id: 5, slug: "cable-roller", name: "Cable, Roller & Hinge Repair", description: "Restore smooth, quiet travel with matched hardware and professional balancing.", startingPrice: 129, duration: "45–90 min", emergency: true },
  { id: 6, slug: "maintenance", name: "Safety Tune-Up", description: "A 25-point inspection, balance test, lubrication, and safety-reversal verification.", startingPrice: 89, duration: "45 min", emergency: false },
];

const settings = {
  id: 1,
  businessName: "Summit Garage Door Co.",
  phone: "(888) 555-0142",
  email: "service@summitgaragedoor.com",
  serviceArea: "Serving Metro Atlanta and nearby Georgia communities",
  theme: "industrial",
  serviceId: "garage-door-repair",
  emergencyEnabled: true,
  heroImage: "/images/garage/hero-door-forward.jpg",
  galleryImages: [
    "/images/garage/modern-white-home.jpg",
    "/images/garage/classic-white-door.jpg",
    "/images/garage/evening-home.jpg",
    "/images/garage/double-garage-home.jpg",
    "/images/garage/gallery/garage-modern-building.jpg",
    "/images/garage/gallery/garage-white-house.jpg",
    "/images/garage/gallery/garage-wood-panel.jpg",
    "/images/garage/gallery/garage-interior-ev.jpg",
  ],
};

const json = (data, status = 200, extraHeaders = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": status === 200 ? "no-store" : "private, no-store",
      ...extraHeaders,
    },
  });

const reviews = {
  mode: "demo",
  connectionStatus: "disconnected",
  locationName: "Summit Garage Door Co.",
  aggregateRating: 4.9,
  totalReviewCount: 127,
  lastSyncedAt: null,
  profileUrl: null,
  reviews: [
    { id: "demo-google-1", reviewerName: "Melissa R.", reviewerPhotoUrl: null, rating: 5, comment: "Our spring broke before school drop-off. Summit arrived quickly, explained every option, and left the door quieter than it has been in years.", publishedAt: "2026-08-26T14:00:00.000Z", relativeTime: "1 week ago", source: "google" },
    { id: "demo-google-2", reviewerName: "David K.", reviewerPhotoUrl: null, rating: 5, comment: "Straightforward estimate and a very clean opener installation.", publishedAt: "2026-08-18T16:30:00.000Z", relativeTime: "2 weeks ago", source: "google" },
    { id: "demo-google-3", reviewerName: "Jordan T.", reviewerPhotoUrl: null, rating: 5, comment: "No pressure and no mystery fees. They repaired the damaged cable and rollers.", publishedAt: "2026-08-05T19:10:00.000Z", relativeTime: "4 weeks ago", source: "google" },
  ],
};

function handleApi(request, url) {
  const path = url.pathname;
  if (path === "/api/garage/services") return json(services);
  if (path === "/api/garage/testimonials") {
    return json([
      { id: 1, name: "Melissa R.", city: "Marietta", rating: 5, quote: "They arrived quickly, explained every option, and left the door quieter than ever.", service: "Emergency spring repair" },
      { id: 2, name: "David K.", city: "Roswell", rating: 5, quote: "Straightforward estimate, clean installation, and excellent communication.", service: "Smart opener installation" },
      { id: 3, name: "Jordan T.", city: "Alpharetta", rating: 5, quote: "No pressure and no mystery fees.", service: "Cable repair" },
    ]);
  }
  if (path === "/api/garage/reviews") return json(reviews, 200, { "cache-control": "public, max-age=300" });
  if (path === "/api/garage/settings") {
    if (request.method === "PATCH") {
      return request.json().then((body) => json({ ...settings, ...body }));
    }
    return json(settings);
  }
  if (path === "/api/garage/availability") {
    const zip = url.searchParams.get("zip") || "";
    const available = /^\d{5}(-\d{4})?$/.test(zip);
    return json({ available, zip, eta: available ? "Technician available today" : "Call for availability", message: available ? "You're in our service area. Same-day windows are open." : "We may still be able to help—call our dispatch team." });
  }
  if (path === "/api/garage/requests") {
    if (request.method === "POST") {
      return request.json().then((body) =>
        json({ id: crypto.randomUUID(), status: "new", createdAt: new Date().toISOString(), ...body }, 201),
      );
    }
    return json([]);
  }
  if (path === "/api/garage/dashboard") {
    return json({ newRequests: 0, scheduledToday: 0, emergencyCalls: 0, completedThisWeek: 0, estimatedRevenue: 0, requests: [] });
  }
  if (path === "/api/garage/assistant" && request.method === "POST") {
    return request.json().then(({ message = "" }) => {
      const urgent = /spring|cable|crooked|off.?track|fell|trapped/i.test(message);
      return json({
        reply: urgent
          ? "Stop operating the door and keep people clear of it. Springs and cables are under dangerous tension, so schedule professional emergency service rather than attempting an adjustment."
          : "Avoid forcing the door if it is unusually heavy, noisy, or uneven. A professional safety inspection is the safest next step.",
        safetyLevel: urgent ? "urgent" : "caution",
        suggestedService: urgent ? "Emergency door repair" : "Safety tune-up",
      });
    });
  }
  if (path === "/api/transcribe") {
    return json({ error: "Voice transcription is unavailable in this Cloudflare demo deployment." }, 501);
  }
  return json({ error: "Not found" }, 404);
}

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
};

async function serveAsset(request, url, context) {
  const hasExtension = /\.[a-z0-9]+$/i.test(url.pathname);
  const assetPath = url.pathname === "/" || !hasExtension ? "/index.html" : url.pathname;
  const sourceUrl = `${REPOSITORY}/${ASSET_REVISION}/${BUILD_ROOT}${assetPath}`;
  const cache = caches.default;
  const cacheKey = new Request(url.origin + assetPath, { method: "GET" });
  let response = await cache.match(cacheKey);

  if (!response) {
    const upstream = await fetch(sourceUrl, {
      headers: { "user-agent": "creativecoders-cloudflare-worker" },
    });
    if (!upstream.ok) return new Response("Asset not found", { status: upstream.status });
    const extension = assetPath.slice(assetPath.lastIndexOf(".")).toLowerCase();
    response = new Response(upstream.body, {
      headers: {
        "content-type": mimeTypes[extension] || upstream.headers.get("content-type") || "application/octet-stream",
        "cache-control": assetPath === "/index.html" ? "public, max-age=60" : "public, max-age=31536000, immutable",
        "content-security-policy": "frame-ancestors 'self' https://creativecoders.tech https://*.creativecoders.tech",
        "x-content-type-options": "nosniff",
        "referrer-policy": "strict-origin-when-cross-origin",
      },
    });
    context.waitUntil(cache.put(cacheKey, response.clone()));
  }
  return response;
}

export default {
  async fetch(request, environment, context) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) return handleApi(request, url);
    return serveAsset(request, url, context);
  },
};