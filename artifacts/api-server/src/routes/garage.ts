import { Router, type IRouter } from "express";
import { asc, desc, eq, sql } from "drizzle-orm";
import { db, businessSettings, GARAGE_CORE_PAGE_SLUGS, garageAuditLogs, garageContent, googleReviews, isSafeGarageImageUrl, serviceRequests } from "@workspace/db";
import {
  AskGarageAssistantBody,
  CreateGarageContentBody,
  CreateServiceRequestBody,
  DeleteGarageContentParams,
  GetAvailabilityQueryParams,
  UpdateBusinessSettingsBody,
  UpdateGarageContentBody,
  UpdateGarageContentParams,
  UpdateServiceRequestBody,
  UpdateServiceRequestParams,
} from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

// Keep the requested login-free development demo without exposing staff data
// or write access from a production process. Real staff authorization is a
// separate prerequisite for enabling production administration.
router.use((req, res, next) => {
  const path = req.path.replace(/\/+$/, "");
  const staffRoute = path === "/garage/admin" || path.startsWith("/garage/admin/") ||
    path === "/garage/settings" || path === "/garage/dashboard" ||
    path.startsWith("/garage/requests/") ||
    (path === "/garage/requests" && req.method !== "POST") ||
    (path === "/garage/media" && req.method !== "GET");
  if (staffRoute && process.env.NODE_ENV !== "development") {
    res.status(403).json({ error: "Production administration is disabled until staff authorization is configured. Use the local demo only." });
    return;
  }
  next();
});

const testimonials: Array<{
  id: number;
  name: string;
  city: string;
  rating: number;
  quote: string;
  service: string;
}> = [];

const googlePlaceId = () => process.env.GOOGLE_PLACE_ID?.trim();
const googlePlacesApiKey = () => process.env.GOOGLE_PLACES_API_KEY?.trim();
let lastGoogleSyncAt = 0;
let googleSyncPromise: Promise<void> | null = null;
let lastGooglePlaceSummary: {
  locationName: string;
  aggregateRating: number;
  totalReviewCount: number;
  profileUrl: string | null;
} | null = null;

const relativeGoogleTime = (publishedAt: Date) => {
  const days = Math.max(1, Math.floor((Date.now() - publishedAt.getTime()) / 86_400_000));
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? "" : "s"} ago`;
};

async function syncGoogleReviews() {
  const placeId = googlePlaceId();
  const apiKey = googlePlacesApiKey();
  if (!placeId || !apiKey || Date.now() - lastGoogleSyncAt < 15 * 60 * 1000) return;
  if (googleSyncPromise) return googleSyncPromise;

  googleSyncPromise = (async () => {
    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=name,rating,user_ratings_total,url,reviews&key=${encodeURIComponent(apiKey)}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Google Places returned ${response.status}`);
      const payload = (await response.json()) as {
        status?: string;
        result?: {
          name?: string;
          rating?: number;
          user_ratings_total?: number;
          url?: string;
          reviews?: Array<{
            author_name?: string;
            profile_photo_url?: string;
            rating?: number;
            text?: string;
            time?: number;
          }>;
        };
      };
      if (payload.status !== "OK" || !payload.result) throw new Error(`Google Places status: ${payload.status}`);
      lastGooglePlaceSummary = {
        locationName: payload.result.name?.trim() || "Connected Google Business Profile",
        aggregateRating: payload.result.rating ?? 0,
        totalReviewCount: payload.result.user_ratings_total ?? 0,
        profileUrl: payload.result.url ?? null,
      };

      const syncedAt = new Date();
      const rows = (payload.result.reviews ?? [])
        .filter((review) => review.author_name && review.text && review.time && review.rating)
        .map((review) => {
          const publishedAt = new Date(review.time! * 1000);
          return {
            googleReviewId: `${review.author_name}:${review.time}`,
            reviewerName: review.author_name!,
            reviewerPhotoUrl: review.profile_photo_url ?? null,
            rating: Math.min(5, Math.max(1, Math.round(review.rating!))),
            comment: review.text!.trim(),
            publishedAt,
            relativeTime: relativeGoogleTime(publishedAt),
            isDefault: false,
            syncedAt,
          };
        });

      await db.transaction(async (transaction) => {
        await transaction.delete(googleReviews).where(eq(googleReviews.isDefault, false));
        if (rows.length > 0) await transaction.insert(googleReviews).values(rows);
      });
      lastGoogleSyncAt = Date.now();
    } catch (error) {
      console.error("Google review sync failed:", error);
    } finally {
      googleSyncPromise = null;
    }
  })();

  return googleSyncPromise;
}

async function getGoogleReviewFeed() {
  await syncGoogleReviews();

  const connected = Boolean(googlePlaceId() && googlePlacesApiKey());
  const stored = await db
    .select()
    .from(googleReviews)
    .orderBy(desc(googleReviews.rating), desc(googleReviews.publishedAt));
  const liveReviews = stored.filter((review) => !review.isDefault);
  const selected = connected ? liveReviews.slice(0, 5) : [];

  return {
    mode: "live" as const,
    connectionStatus: connected && lastGooglePlaceSummary ? "connected" as const : "disconnected" as const,
    locationName: lastGooglePlaceSummary?.locationName ?? "Google Business Profile not connected",
    aggregateRating: lastGooglePlaceSummary?.aggregateRating ?? 0,
    totalReviewCount: lastGooglePlaceSummary?.totalReviewCount ?? 0,
    lastSyncedAt: liveReviews[0]?.syncedAt?.toISOString() ?? null,
    profileUrl: lastGooglePlaceSummary?.profileUrl ?? null,
    reviews: selected.map((review) => ({
      id: review.googleReviewId,
      reviewerName: review.reviewerName,
      reviewerPhotoUrl: review.reviewerPhotoUrl,
      rating: review.rating,
      comment: review.comment,
      publishedAt: review.publishedAt.toISOString(),
      relativeTime: review.relativeTime,
      source: "google" as const,
    })),
  };
}

const defaultSettings = {
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
  verificationStatus: "unverified" as const,
  trustProfile: {
    hours: null, ownerTeam: null, yearsInBusiness: null, brandsServiced: null,
    paymentOptions: null, financing: null, licenseInsurance: null, warranty: null,
  },
};

const legacyHeroImage =
  "https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=2000&q=85";
const previousLocalHeroImage = "/images/garage/hero-modern-garage.jpg";

const legacyGalleryImageReplacements = new Map([
  [
    "https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=1200&q=80",
    "/images/garage/modern-white-home.jpg",
  ],
  [
    "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80",
    "/images/garage/classic-white-door.jpg",
  ],
  [
    "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1200&q=80",
    "/images/garage/evening-home.jpg",
  ],
]);

const withRefreshedSeedImages = (settings: typeof businessSettings.$inferSelect) => ({
  ...settings,
  heroImage: settings.heroImage === legacyHeroImage || settings.heroImage === previousLocalHeroImage
    ? defaultSettings.heroImage
    : settings.heroImage,
  galleryImages: settings.galleryImages.map((image) =>
    legacyGalleryImageReplacements.get(image) ?? image,
  ),
});

const toPublicSettings = (
  settings: typeof businessSettings.$inferSelect | typeof defaultSettings,
) => {
  const verified = settings.verificationStatus === "verified";
  return {
  businessName: verified ? settings.businessName : "Garage Door Service Preview",
  phone: verified ? settings.phone : "",
  email: verified ? settings.email : "",
  serviceArea: verified ? settings.serviceArea : "Service area awaiting verification",
  theme: settings.theme,
  emergencyEnabled: verified && settings.emergencyEnabled,
  heroImage: settings.heroImage,
  galleryImages: settings.galleryImages,
  verificationStatus: verified ? "verified" as const : "unverified" as const,
  trustProfile: verified ? settings.trustProfile : defaultSettings.trustProfile,
  };
};

const customerCareFaqs = [
  ["Service area", "Coverage is not confirmed unless the verified public profile states it. Customers can submit a ZIP code and the business must confirm coverage."],
  ["Response time", "Response and arrival times depend on verified service coverage, published business hours, and current scheduling. A submitted request is not a confirmed appointment."],
  ["Estimates", "A technician inspects the system, explains what failed, and gives clear options before work begins. No additional work is added without customer approval."],
  ["Why a door will not open", "Common causes include a broken spring, failed opener, blocked sensor, damaged cable, power issue, or off-track door. Customers should stop pressing the opener if the door strains, lifts unevenly, or makes a sharp popping sound."],
  ["Broken springs", "A loud bang, a gap in the spring, an unusually heavy door, or an opener that lifts only a few inches can indicate a broken spring. Springs are under extreme tension and must not be touched, unwound, or replaced by a customer."],
  ["Manual operation", "Manual opening is only appropriate when the door is fully closed and level with no sign of spring or cable damage. Never pull the emergency release under an unstable or partially open door."],
  ["Door reverses", "Blocked, dirty, misaligned, or sun-affected safety sensors can cause reversing. Customers may clear obvious objects, but must not bypass sensors or adjust force and travel settings themselves."],
  ["Off-track or hanging door", "Stop using the door, keep people, pets, and vehicles away, and do not pull cables, loosen brackets, or force rollers back into place. A trained technician should stabilize it."],
  ["Repair or replacement", "Repair is often sensible when panels and tracks are sound. Extensive damage, recurring failures, corrosion, poor insulation, or outdated safety performance can make replacement a better value. A technician can explain both options."],
  ["Maintenance", "A professional inspection once a year is a good preventive schedule for most homes. Customers should watch for frayed cables, loose parts, uneven movement, or new noises without touching high-tension components."],
  ["Pricing", "Pricing is not confirmed unless the verified public profile explicitly states it. A technician must provide the final price after diagnosis and before repairs."],
  ["Urgent requests", "Urgent availability and timing must be confirmed by the business. An unstable door must remain untouched with the area clear."],
];

async function getCustomerCareContext() {
  const [storedSettings] = await db.select().from(businessSettings).limit(1);
  const storedOrDefault = storedSettings ? withRefreshedSeedImages(storedSettings) : defaultSettings;
  const settings = toPublicSettings(storedOrDefault);
  const emergencyGuidance = settings.emergencyEnabled
    ? "Priority help is enabled for urgent door problems; never promise a specific arrival time."
    : "Urgent-service availability is not verified; never imply that priority or after-hours service is available.";
  const publishedRows = await db.select().from(garageContent).where(eq(garageContent.status, "published")).orderBy(asc(garageContent.sortOrder));
  const publicContent = publishedRows.map(toPublicContent).filter((item): item is NonNullable<typeof item> => item !== null);
  const serviceContent = publicContent.filter((item) => item.kind === "service");
  const serviceCatalogVerified = serviceContent.some((item) => item.verificationStatus === "verified");
  const serviceLines = serviceContent.length
    ? serviceContent.map((service) => `- ${service.title} (${service.serviceCode || service.slug}): ${service.summary} ${service.body}`).join("\n")
    : "- No public service guidance is published. Discuss only general garage-door safety and the request process.";
  const faqLines = customerCareFaqs.map(([question, answer]) => `- ${question}: ${answer}`).join("\n");
  const contentLines = publicContent
    .filter((item) => ["service", "faq", "trust"].includes(item.kind))
    .map((item) => `- ${item.title}: ${item.summary} ${item.body}`)
    .join("\n");

  return {
    settings,
    serviceCodes: new Set(serviceContent.map((item) => item.serviceCode).filter(Boolean)),
    text: [
      "AUTHORITATIVE WEBSITE AND BUSINESS CONTEXT — use only these facts.",
      `Business: ${settings.businessName}`,
      `Phone: ${settings.phone}`,
      `Email: ${settings.email}`,
      `Service area: ${settings.serviceArea}`,
      `Emergency setting: ${settings.emergencyEnabled ? "enabled" : "not enabled"}. ${emergencyGuidance}`,
      "Response expectation: a submitted request is not a confirmed appointment. Do not promise response or arrival timing.",
      "Booking: the customer can submit name, phone, optional email, job address, service, urgency, preferred date/time, and a description. Photos and videos remain local on the customer's device until they choose to share them.",
      `Business service-offering verification: ${serviceCatalogVerified ? "at least one published service record is verified" : "not verified; service records are educational guidance only and do not establish an offering, price, duration, or availability"}.`,
      "Estimate policy: technicians inspect the system and explain options before work; do not promise a free estimate unless the website context says so.",
      "Services:",
      serviceLines,
      "Frequently asked questions:",
      faqLines,
      "Published website content:",
      contentLines || "- No published website content is available.",
      "Reviews: discuss Google reviews only when the connected feed provides them. Do not invent testimonials or ratings.",
      "The gallery and before/after sections show representative website project imagery; do not infer guarantees, pricing, or availability from photos.",
      "Never invent hours, appointment slots, guarantees, warranties, refunds, final prices, or service coverage outside this context. If something is not listed, say that plainly and offer the phone number or a service request.",
    ].join("\n"),
  };
}

function suggestedServiceFor(message: string) {
  const normalized = message.toLowerCase();
  if (/spring|torsion|extension/.test(normalized)) return "springs";
  if (/opener|remote|keypad|sensor|motor/.test(normalized)) return "opener";
  if (/new (?:garage )?door|replace|replacement|install|insulated|carriage|glass/.test(normalized)) return "installation";
  if (/maint|inspect|tune|lubricat|annual/.test(normalized)) return "maintenance";
  if (/off.?track|track|roller|cable|hinge|slow|noisy|noise|squeak|grind/.test(normalized)) return "repair";
  if (/price|cost|quote|estimate/.test(normalized)) return "Service assessment";
  return "Service assessment";
}

const urgentGarageTerms = /broken spring|spring (?:snapped|broke|broken)|gap in (?:the )?spring|loud bang|opens? only (?:a )?few inches|unusually heavy|off.?track|hanging|crooked|uneven|loose cable|frayed cable|stuck open|door fell|trapped|dangerous/i;
const garageIssueTerms = /garage|door|opener|spring|cable|repair|service|quote|estimate|schedule|book|track|roller|hinge|sensor|motor/i;
const actionableGarageTerms = /broken|stuck|won't|will not|not (?:open|close)|noisy|noise|slow|uneven|crooked|hanging|fell|off.?track|spring|cable|roller|hinge|sensor|opener|remote|keypad|motor|repair|replace|install/i;
const businessFollowupTerms = /price|cost|quote|estimate|coverage|service area|zip|hour|open|available|availability|schedule|appointment|book|arrival|warranty|guarantee|licensed|insured|credential|review|rating|payment|financing/i;
const uncertaintyTerms = /(?:i (?:do not|don't|can(?:not|'t)) (?:know|confirm|verify|find|answer)|not (?:listed|confirmed|verified|available) (?:here|in the context)|the business (?:must|will need to) confirm)/i;

function shouldRecommendServiceRequest(message: string, safetyLevel: "safe" | "caution" | "urgent", reply = "") {
  const normalized = message.trim();
  if (!normalized) return false;
  if (/^(?:hi|hello|hey|good morning|good afternoon|good evening|thanks|thank you|thx|ty|how are you|how'?s it going)[!?. ]*$/i.test(normalized)) return false;
  return safetyLevel === "urgent" ||
    actionableGarageTerms.test(normalized) ||
    businessFollowupTerms.test(normalized) ||
    uncertaintyTerms.test(reply) ||
    !garageIssueTerms.test(normalized);
}

function withServiceRequestGuidance(reply: string, recommended: boolean) {
  if (!recommended || /service request/i.test(reply)) return reply;
  return `${reply}\n\nIf you’d like the business to review the details, you can start a service request here.`;
}

function casualCustomerCareReply(message: string, businessName: string) {
  const normalized = message.trim().toLowerCase();
  if (normalized.length > 100 || garageIssueTerms.test(normalized)) return null;
  if (/^(thanks|thank you|thx|ty|appreciate it)[!. ]*$/i.test(normalized)) {
    return "You’re welcome. If anything changes with the door, just tell me what you’re noticing and I’ll help you figure out the next step.";
  }
  if (/^(how are you|how'?s it going|hru|you good)[?!., ]*$/i.test(normalized)) {
    return `Thanks for asking. I’m here with customer care at ${businessName} to help you get the garage door sorted out—what’s it doing today: stuck, noisy, slow, or refusing to open?`;
  }
  if (/^(hi|hello|hey|good morning|good afternoon|good evening)[!. ]*$/i.test(normalized)) {
    return `Hi! You’ve reached customer care for ${businessName}. You don’t need to know the repair name—just tell me what the door is doing, and I’ll help point you in the right direction.`;
  }
  return null;
}

const mapRequest = (row: typeof serviceRequests.$inferSelect) => ({
  ...row,
  createdAt: row.createdAt.toISOString(),
});

const mapContent = (row: typeof garageContent.$inferSelect) => ({
  ...row,
  updatedAt: row.updatedAt.toISOString(),
});

function toPublicContent(row: typeof garageContent.$inferSelect) {
  if (row.status !== "published") return null;
  if (row.verificationStatus !== "verified" && !row.reviewedSeed) return null;
  if (row.kind === "trust" && row.verificationStatus !== "verified") return null;
  return mapContent(row);
}

function contentBoundaryError(input: {
  imageUrl: string;
  beforeImageUrl: string;
  aliases: string[];
  slug: string;
}) {
  if (!isSafeGarageImageUrl(input.imageUrl) || !isSafeGarageImageUrl(input.beforeImageUrl)) {
    return "Image URLs must be empty, root-relative, or HTTPS.";
  }
  if (input.aliases.includes(input.slug)) return "Aliases cannot include the current slug.";
  return null;
}

async function validateContentRelations(
  input: { kind: string; slug: string; aliases: string[]; parentId?: string | null },
  currentId?: string,
) {
  const rows = await db.select().from(garageContent);
  const parent = input.parentId ? rows.find((row) => row.id === input.parentId) : null;
  if (input.parentId && !parent) return "Parent content was not found.";
  if (input.parentId === currentId) return "Content cannot be its own parent.";
  if (parent && currentId) {
    let cursor: typeof parent | undefined = parent;
    const visited = new Set<string>();
    while (cursor) {
      if (cursor.id === currentId) return "Parent selection would create a cycle.";
      if (visited.has(cursor.id)) break;
      visited.add(cursor.id);
      cursor = cursor.parentId ? rows.find((row) => row.id === cursor!.parentId) : undefined;
    }
  }
  const routeNames = new Set([input.slug, ...input.aliases]);
  const conflict = rows.some((row) =>
    row.id !== currentId &&
    row.kind === input.kind &&
    ([row.slug, ...row.aliases].some((value) => routeNames.has(value)))
  );
  return conflict ? "Slug or alias is already in use for this content type." : null;
}

async function recordAdminAudit(
  action: string,
  resourceType: string,
  resourceId: string | null,
  changedFields: string[],
) {
  await db.insert(garageAuditLogs).values({
    actorUserId: "temporary-admin",
    actorRole: "owner",
    action,
    resourceType,
    resourceId,
    changedFields,
  });
}

router.get("/garage/services", async (_req, res) => {
  const rows = await db.select().from(garageContent).where(eq(garageContent.kind, "service")).orderBy(asc(garageContent.sortOrder));
  const publicRows = rows.map(toPublicContent).filter((row): row is NonNullable<typeof row> => row !== null);
  res.json(publicRows.map((service, index) => ({
    id: index + 1, slug: service.serviceCode || service.slug, name: service.title,
    description: service.summary, startingPrice: null, duration: "Assessment required", emergency: false,
  })));
});
router.get("/garage/cloudflare-config", (_req, res) => {
  res.json({
    turnstile: { enabled: false },
    features: { turnstile: false, assistant: true, media: false },
  });
});
router.get("/garage/testimonials", (_req, res) => res.json([]));
router.get("/garage/reviews", async (_req, res) => {
  res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=3600");
  res.json(await getGoogleReviewFeed());
});

router.get("/garage/availability", (req, res) => {
  const parsed = GetAvailabilityQueryParams.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "Enter a valid ZIP code." });
  const validZip = /^\d{5}(-\d{4})?$/.test(parsed.data.zip);
  return res.json({
    available: false,
    zip: parsed.data.zip,
    eta: "Availability confirmation required",
    message: validZip
      ? "Submit a request and the business will confirm service coverage and timing."
      : "Enter a valid ZIP code so the business can confirm coverage.",
  });
});

router.get("/garage/site-settings", async (_req, res): Promise<void> => {
  const [settings] = await db.select().from(businessSettings).limit(1);
  res.json(toPublicSettings(settings ? withRefreshedSeedImages(settings) : defaultSettings));
});

router.get("/garage/content", async (_req, res): Promise<void> => {
  const rows = await db.select().from(garageContent).orderBy(asc(garageContent.sortOrder), asc(garageContent.title));
  res.json(rows.map(toPublicContent).filter((row): row is NonNullable<typeof row> => row !== null));
});

router.get("/garage/admin/content", async (_req, res): Promise<void> => {
  const rows = await db.select().from(garageContent).orderBy(asc(garageContent.sortOrder), asc(garageContent.title));
  res.json(rows.map(mapContent));
});

router.post("/garage/admin/content", async (req, res): Promise<void> => {
  const parsed = CreateGarageContentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid content fields." });
    return;
  }
  if (parsed.data.status === "published" && parsed.data.verificationStatus === "verified" && parsed.data.verificationAcknowledged !== true) {
    res.status(400).json({ error: "Explicit verification acknowledgement is required before publishing business claims." });
    return;
  }
  const { verificationAcknowledged: _acknowledged, ...contentInput } = parsed.data;
  const boundaryError = contentBoundaryError(contentInput);
  const relationError = await validateContentRelations(contentInput);
  if (boundaryError || relationError) {
    res.status(400).json({ error: boundaryError ?? relationError });
    return;
  }
  const id = crypto.randomUUID();
  const [created] = await db.insert(garageContent).values({ id, ...contentInput, reviewedSeed: false }).returning();
  await recordAdminAudit("garage_content.created", "garage_content", id, Object.keys(parsed.data));
  res.status(201).json(mapContent(created));
});

router.put("/garage/admin/content/:id", async (req, res): Promise<void> => {
  const params = UpdateGarageContentParams.safeParse(req.params);
  const body = UpdateGarageContentBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid content update." });
    return;
  }
  const [current] = await db.select().from(garageContent).where(eq(garageContent.id, params.data.id)).limit(1);
  if (!current) {
    res.status(404).json({ error: "Content not found." });
    return;
  }
  if (current.kind === "page" && GARAGE_CORE_PAGE_SLUGS.has(current.slug) && (body.data.slug !== current.slug || body.data.kind !== "page")) {
    res.status(409).json({ error: "Core page slugs and types cannot be changed." });
    return;
  }
  if (body.data.status === "published" && body.data.verificationStatus === "verified" && body.data.verificationAcknowledged !== true) {
    res.status(400).json({ error: "Explicit verification acknowledgement is required before publishing business claims." });
    return;
  }
  const { verificationAcknowledged: _acknowledged, ...updateInput } = body.data;
  const aliases = current.kind !== "page" && updateInput.slug !== current.slug
    ? [...new Set([...body.data.aliases, current.slug])].slice(0, 25)
    : updateInput.aliases;
  const next = { ...updateInput, aliases };
  const boundaryError = contentBoundaryError(next);
  const relationError = await validateContentRelations(next, current.id);
  if (boundaryError || relationError) {
    res.status(400).json({ error: boundaryError ?? relationError });
    return;
  }
  const [updated] = await db.update(garageContent).set({ ...next, reviewedSeed: false, updatedAt: new Date() }).where(eq(garageContent.id, current.id)).returning();
  await recordAdminAudit("garage_content.updated", "garage_content", current.id, Object.keys(next));
  res.json(mapContent(updated));
});

router.delete("/garage/admin/content/:id", async (req, res): Promise<void> => {
  const params = DeleteGarageContentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid content id." });
    return;
  }
  const [current] = await db.select().from(garageContent).where(eq(garageContent.id, params.data.id)).limit(1);
  if (!current) {
    res.status(404).json({ error: "Content not found." });
    return;
  }
  if (current.kind === "page" && GARAGE_CORE_PAGE_SLUGS.has(current.slug)) {
    res.status(409).json({ error: "Core pages cannot be deleted; set their status to draft instead." });
    return;
  }
  const [child] = await db.select({ id: garageContent.id }).from(garageContent).where(eq(garageContent.parentId, current.id)).limit(1);
  if (child) {
    res.status(409).json({ error: "Move or delete child content before deleting its parent." });
    return;
  }
  await db.delete(garageContent).where(eq(garageContent.id, current.id));
  await recordAdminAudit("garage_content.deleted", "garage_content", current.id, []);
  res.status(204).send();
});

router.get("/garage/requests", async (_req, res): Promise<void> => {
  const rows = await db.select().from(serviceRequests).orderBy(desc(serviceRequests.createdAt));
  res.json(rows.map(mapRequest));
});

router.post("/garage/requests", async (req, res) => {
  const parsed = CreateServiceRequestBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Please check the request details." });
  const [created] = await db.insert(serviceRequests).values({ ...parsed.data, details: parsed.data.details ?? "" }).returning();
  return res.status(201).json(mapRequest(created));
});

router.patch("/garage/requests/:id", async (req, res): Promise<void> => {
  const params = UpdateServiceRequestParams.safeParse(req.params);
  const body = UpdateServiceRequestBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid update." });
    return;
  }
  const [updated] = await db.update(serviceRequests).set(body.data).where(eq(serviceRequests.id, params.data.id)).returning();
  if (!updated) {
    res.status(404).json({ error: "Request not found." });
    return;
  }
  await recordAdminAudit(
    "service_request.updated",
    "service_request",
    String(updated.id),
    Object.keys(body.data),
  );
  res.json(mapRequest(updated));
});

router.get("/garage/dashboard", async (_req, res): Promise<void> => {
  const rows = await db.select().from(serviceRequests).orderBy(desc(serviceRequests.createdAt));
  res.json({
    newRequests: rows.filter((r) => r.status === "new").length,
    scheduledToday: rows.filter((r) => r.status === "scheduled").length,
    emergencyCalls: rows.filter((r) => r.urgency === "emergency" && r.status !== "completed").length,
    completedThisWeek: rows.filter((r) => r.status === "completed").length,
    estimatedRevenue: 0,
    requests: rows.slice(0, 8).map(mapRequest),
  });
});

router.get("/garage/settings", async (_req, res): Promise<void> => {
  const [settings] = await db.select().from(businessSettings).limit(1);
  if (!settings) {
    res.json(defaultSettings);
    return;
  }
  res.json(withRefreshedSeedImages(settings));
});

router.patch("/garage/settings", async (req, res): Promise<void> => {
  const parsed = UpdateBusinessSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid settings." });
    return;
  }
  const [storedSettings] = await db.select().from(businessSettings).limit(1);
  const currentSettings = storedSettings ? withRefreshedSeedImages(storedSettings) : defaultSettings;
  const sensitiveKeys = ["businessName", "phone", "email", "serviceArea", "emergencyEnabled", "trustProfile"] as const;
  const sensitiveChanged = sensitiveKeys.some((key) =>
    key in parsed.data &&
    JSON.stringify(parsed.data[key]) !== JSON.stringify(currentSettings[key])
  );
  if (parsed.data.verificationStatus === "verified" && parsed.data.verificationAcknowledged !== true) {
    res.status(400).json({ error: "Explicit verification acknowledgement is required before publishing business claims." });
    return;
  }
  const { verificationAcknowledged: _acknowledged, ...settingsInput } = parsed.data;
  const verificationStatus = parsed.data.verificationStatus === "verified" && parsed.data.verificationAcknowledged === true
    ? "verified" as const
    : parsed.data.verificationStatus === "unverified" || sensitiveChanged
      ? "unverified" as const
      : currentSettings.verificationStatus;
  const persistedInput = { ...settingsInput, verificationStatus };
   const [settings] = await db.insert(businessSettings).values({ ...defaultSettings, ...persistedInput }).onConflictDoUpdate({
    target: businessSettings.id,
    set: persistedInput,
  }).returning();
  await recordAdminAudit(
    "business_settings.updated",
    "business_settings",
    String(settings.id),
    Object.keys(persistedInput),
  );
  res.json(settings);
});

router.post("/garage/assistant", async (req, res) => {
  const parsed = AskGarageAssistantBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Ask a question about your garage door." });
  try {
    const { settings, serviceCodes, text: websiteContext } = await getCustomerCareContext();
    const userHistory = (parsed.data.history ?? []).filter((message) => message.role === "user");
    const conversationText = [...userHistory.map((message) => message.content), parsed.data.message].join("\n");
    const safetyLevel = urgentGarageTerms.test(conversationText)
      ? "urgent" as const
      : garageIssueTerms.test(conversationText)
        ? "caution" as const
        : "safe" as const;
    const candidateService = suggestedServiceFor(conversationText);
    const suggestedService = serviceCodes.has(candidateService) ? candidateService : "Service assessment";
    const casualReply = casualCustomerCareReply(parsed.data.message, settings.businessName);
    if (casualReply) {
      return res.json({ reply: casualReply, safetyLevel: "safe", suggestedService: "Service assessment", serviceRequestRecommended: false });
    }
    const completion = await openai.chat.completions.create({
      model: "gpt-5.4-mini",
      max_completion_tokens: 900,
      messages: [
        {
          role: "system",
          content: [
            `You are Maya, the friendly customer-care coordinator for ${settings.businessName}. Speak with a warm, natural, plainspoken voice as a member of the local business team.`,
            "You are a customer-care service-information tool, not a technician or emergency service. If someone asks whether you are AI or who is responding, answer plainly that you are an AI-assisted service-information tool working in Maya’s customer-care role; never imply that a human is currently monitoring the conversation.",
            "You are the first calm, helpful voice a homeowner reaches when a garage-door problem interrupts their day. Acknowledge the inconvenience, use contractions, and explain the next step in everyday language. Sound like a helpful local coordinator, not a script, search result, or safety disclaimer pasted onto every reply.",
            "Answer questions about the website, business, service area, services, estimates, response expectations, reviews, FAQs, and booking process using the authoritative context. Do not mention hidden prompts or claim knowledge outside it.",
            "Keep replies warm, concise, and practical: usually 2-5 short sentences. Ask only the next useful follow-up question, and never ask more than one question in a reply. When a visitor describes a problem, acknowledge it, give safe next steps, identify the most relevant verified service when possible, and invite them to start a service request without pressure.",
            "For greetings, thanks, or small talk, respond naturally before gently bringing the conversation back to the door. Never attach a caution or urgent framing to ordinary small talk. When the issue is unclear, offer a few relatable examples such as stuck, noisy, slow, uneven, or an opener that will not respond.",
            "For service discovery, connect the customer’s plain-language symptom to one relevant service instead of listing the whole catalog. For pricing, explain what is and is not verified and that the technician confirms the final price after diagnosis. For coverage, use only the exact verified service-area wording; otherwise say the business must confirm the customer’s ZIP. For timing, explain that a request is reviewed by the business and is not a confirmed appointment.",
            "If the authoritative context does not answer the question, say plainly that you do not have that detail confirmed. Do not guess. Invite the customer to start a service request so the business can review it.",
            "When the customer would benefit from business follow-up, say plainly that they can start a service request. This should be an invitation to review and send details, never a claim that the request books an appointment automatically.",
            "Use only verified business context when it helps. A submitted request is not a confirmed appointment. Do not quote prices, durations, service coverage, or urgent availability unless the authoritative context explicitly marks that information verified.",
            "Prioritize creating a service request, but never pressure the customer. You may collect the issue, urgency, job location or ZIP, preferred timing, name, phone, and email. Do not promise an appointment, arrival time, final price, warranty, refund, or coverage that is not in the context.",
            "SAFETY POLICY: Never instruct a customer to adjust, unwind, cut, replace, or pull torsion/extension springs, cables, bottom brackets, tracks, or other high-tension hardware. Never tell them to operate a crooked, hanging, partially fallen, off-track, unusually heavy, or spring-damaged door. In those cases tell them to stop using it, keep people, pets, and vehicles clear, and arrange professional help. Tell them to call 911 only for an immediate threat to life or serious injury.",
            websiteContext,
          ].join("\n\n"),
        },
        ...(parsed.data.history ?? []).map((message) => ({
          role: message.role,
          content: message.content,
        })),
        { role: "user", content: parsed.data.message },
      ],
    });
    let reply = completion.choices[0]?.message?.content?.trim() ?? "I don’t have that information confirmed here.";
    if (safetyLevel === "urgent" && !/stop|do not|don't|keep .* clear|professional/i.test(reply)) {
      reply = `For safety, stop using the door and keep people, pets, and vehicles clear. Please arrange professional help rather than trying to move or repair it yourself.\n\n${reply}`;
    }
    const serviceRequestRecommended = shouldRecommendServiceRequest(parsed.data.message, safetyLevel, reply);
    reply = withServiceRequestGuidance(reply, serviceRequestRecommended);
    return res.json({ reply, safetyLevel, suggestedService, serviceRequestRecommended });
  } catch (error) {
    req.log.error({ error }, "Garage assistant failed");
    const fallbackConversation = [
      ...(parsed.data.history ?? []).map((message) => message.content),
      parsed.data.message,
    ].join("\n");
    const fallbackSafetyLevel = urgentGarageTerms.test(fallbackConversation)
      ? "urgent" as const
      : garageIssueTerms.test(fallbackConversation)
        ? "caution" as const
        : "safe" as const;
    const fallbackService = "Service assessment";
    const reply = fallbackSafetyLevel === "urgent"
      ? "I’m sorry—I couldn’t connect just now. Please stop using the door and keep people, pets, and vehicles clear. You can start a service request for the business to review."
      : "I’m sorry—I couldn’t pull that up just now. Tell me what the door is doing, or start a service request for the business to review.";
    return res.json({ reply, safetyLevel: fallbackSafetyLevel, suggestedService: fallbackService, serviceRequestRecommended: true });
  }
});

export default router;