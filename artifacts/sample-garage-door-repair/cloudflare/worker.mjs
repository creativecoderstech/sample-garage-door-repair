const REPOSITORY =
  "https://raw.githubusercontent.com/creativecoderstech/sample-garage-door-repair";
const ASSET_REVISION = "a5bf00be9e025c66aa8e179c5fa23ac1d6c4aa0c";
const BUILD_ROOT =
  "artifacts/sample-garage-door-repair/dist/public";
const ARTIFACT_BASE_PATH = "/sample-garage-door-repair";

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
  businessName: "Garage Door Service Preview",
  phone: "",
  email: "",
  serviceArea: "Service area awaiting verification",
  theme: "industrial",
  serviceId: "garage-door-repair",
  emergencyEnabled: false,
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

const publicSettings = {
  businessName: settings.businessName,
  phone: settings.phone,
  email: settings.email,
  serviceArea: settings.serviceArea,
  theme: settings.theme,
  emergencyEnabled: settings.emergencyEnabled,
  heroImage: settings.heroImage,
  galleryImages: settings.galleryImages,
  verificationStatus: "unverified",
  trustProfile: {
    hours: null,
    ownerTeam: null,
    yearsInBusiness: null,
    brandsServiced: null,
    paymentOptions: null,
    financing: null,
    licenseInsurance: null,
    warranty: null,
  },
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
  mode: "live",
  connectionStatus: "disconnected",
  locationName: "Google Business Profile not connected",
  aggregateRating: 0,
  totalReviewCount: 0,
  lastSyncedAt: null,
  profileUrl: null,
  reviews: [],
};

function suggestedServiceFor(message) {
  if (/spring|torsion|extension/i.test(message)) return "Broken Spring Repair";
  if (/off.?track|track|roller/i.test(message)) return "Off-Track Door Rescue";
  if (/cable|hinge/i.test(message)) return "Cable, Roller & Hinge Repair";
  if (/opener|remote|keypad|sensor|motor/i.test(message)) return "Opener Repair & Installation";
  if (/new (?:garage )?door|replace|replacement|install|insulated|carriage|glass/i.test(message)) return "New Garage Door Installation";
  if (/maint|inspect|tune|lubricat|annual|slow|noisy|noise|squeak|grind/i.test(message)) return "Safety Tune-Up";
  return "Service assessment";
}

function handleApi(request, url) {
  const path = url.pathname;
  if (path === "/api/garage/services") return json([]);
  if (path === "/api/garage/testimonials") {
    return json([]);
  }
  if (path === "/api/garage/reviews") return json(reviews, 200, { "cache-control": "public, max-age=300" });
  if (path === "/api/garage/site-settings") return json(publicSettings);
  if (path === "/api/garage/settings") {
    return json({ error: "The Cloudflare demo does not expose the staff settings API." }, 501);
  }
  if (path === "/api/garage/availability") {
    const zip = url.searchParams.get("zip") || "";
    return json({ available: false, zip, eta: "Availability confirmation required", message: "Submit a request and the business will confirm service coverage and timing." });
  }
  if (path === "/api/garage/requests") {
    if (request.method === "POST") {
      return request.json().then((body) =>
        json({ id: crypto.randomUUID(), status: "new", createdAt: new Date().toISOString(), ...body }, 201),
      );
    }
    return json({ error: "The Cloudflare demo does not expose customer leads." }, 501);
  }
  if (path.startsWith("/api/garage/requests/")) {
    return json({ error: "The Cloudflare demo does not expose customer lead mutations." }, 501);
  }
  if (path === "/api/garage/dashboard") {
    return json({ error: "The Cloudflare demo does not expose the staff dashboard API." }, 501);
  }
  if (path === "/api/garage/assistant" && request.method === "POST") {
    return request.json().then(({ message = "" }) => {
      const normalized = message.trim().toLowerCase();
      const issue = /garage|door|opener|spring|cable|repair|service|quote|estimate|schedule|book|track|roller|hinge|sensor|motor/i.test(normalized);
      const urgent = /spring|cable|crooked|off.?track|fell|trapped/i.test(normalized);
      const casual = normalized.length <= 100 && !issue;
      const thanks = /^(thanks|thank you|thx|ty|appreciate it)[!. ]*$/i.test(normalized);
      const smallTalk = /^(how are you|how'?s it going|hru|you good)[?!., ]*$/i.test(normalized);
      const greeting = /^(hi|hello|hey|good morning|good afternoon|good evening)[!. ]*$/i.test(normalized);
      const asksServiceArea = /service area|serve|coverage|zip|where.*located|what area/i.test(normalized);
      const asksContact = /phone|call|email|contact|reach you/i.test(normalized);
      const asksPrice = /price|cost|quote|estimate|how much/i.test(normalized);
      const asksSchedule = /schedule|appointment|available|availability|how soon|same.?day|when can/i.test(normalized);
      const asksServices = /what.*(?:do|can).*repair|what services|services.*offer|help with/i.test(normalized);
      const safetyLevel = urgent ? "urgent" : issue ? "caution" : "safe";
      const suggestedService = "Service assessment";
      const service = services.find((item) => item.name === suggestedService);
      const reply = thanks
        ? "You’re welcome. If anything changes with the door, just tell me what you’re noticing and I’ll help you figure out the next step."
        : smallTalk
          ? "I’m doing well, thanks for asking. I’m here to help you get your garage door sorted out—what’s it doing today: stuck, noisy, slow, or refusing to open?"
          : greeting
            ? "Hi! I’m glad you reached out. You don’t need to know the repair name—just tell me what the door is doing, and I’ll help point you in the right direction."
            : urgent
              ? "I’m sorry you’re dealing with that. Please stop using the door and keep people, pets, and vehicles clear. Springs and cables are under dangerous tension, so schedule professional help rather than trying to move or repair it yourself."
              : asksServiceArea
                ? `${settings.serviceArea}. Send me the job ZIP code and I’ll help you confirm the best next step.`
                : asksContact
                  ? "Verified contact details are not published in this preview. You can use the service-request form, but the business must confirm receipt and availability."
                  : asksPrice
                    ? service
                      ? `The preview catalog includes ${service.name}, but pricing has not been verified. A technician must inspect the door and explain the final price before work begins.`
                      : "Pricing has not been verified. A technician must inspect the door and explain the final price before work begins."
                    : asksSchedule
                      ? "A submitted request is not a confirmed appointment. The business must confirm service coverage, response timing, and availability."
                       : asksServices
                         ? "The public service catalog has not been verified in this preview, so I can’t claim which services this business offers. Tell me what the door is doing and I can share general safety guidance or help prepare a request for the business to review."
              : issue
                ? "That sounds frustrating, especially when you’re trying to get on with your day. If the door feels unusually heavy, crooked, or makes a sharp pop, stop using it and keep everyone clear. What are you seeing—stuck open, noisy, slow, or is the opener not responding?"
                : casual
                  ? "I’m here to help with the garage door and the next steps. What’s going on today?"
                  : "Tell me what the door is doing and I’ll help point you toward the right next step.";
      return json({
        reply,
        safetyLevel,
        suggestedService,
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

function withAssetHeaders(response, assetPath) {
  const headers = new Headers(response.headers);
  headers.set(
    "cache-control",
    assetPath === "/index.html"
      ? "public, max-age=60"
      : "public, max-age=31536000, immutable",
  );
  headers.set(
    "content-security-policy",
    "frame-ancestors 'self' https://creativecoders.tech https://*.creativecoders.tech",
  );
  headers.set("x-content-type-options", "nosniff");
  headers.set("x-robots-tag", "noindex, nofollow, noarchive");
  headers.set("referrer-policy", "strict-origin-when-cross-origin");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function serveAsset(request, url, context, env) {
  const requestPath =
    url.pathname === ARTIFACT_BASE_PATH
      ? "/"
      : url.pathname.startsWith(`${ARTIFACT_BASE_PATH}/`)
        ? url.pathname.slice(ARTIFACT_BASE_PATH.length)
        : url.pathname;
  const hasExtension = /\.[a-z0-9]+$/i.test(requestPath);
  const assetPath = requestPath === "/" || !hasExtension ? "/index.html" : requestPath;

  if (env?.ASSETS) {
    const assetUrl = new URL(request.url);
    assetUrl.pathname = assetPath;
    const assetResponse = await env.ASSETS.fetch(
      new Request(assetUrl, request),
    );
    return withAssetHeaders(assetResponse, assetPath);
  }

  const sourceUrl = `${REPOSITORY}/${ASSET_REVISION}/${BUILD_ROOT}${assetPath}`;
  const cache = caches.default;
  const cacheKey = new Request(`${url.origin}${assetPath}?revision=${ASSET_REVISION}`, { method: "GET" });
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
      },
    });
    response = withAssetHeaders(response, assetPath);
    context.waitUntil(cache.put(cacheKey, response.clone()));
  }
  return response;
}

export default {
  async fetch(request, env, context) {
    const url = new URL(request.url);
    return url.pathname.startsWith("/api/")
      ? handleApi(request, url)
      : serveAsset(request, url, context, env);
  },
};
