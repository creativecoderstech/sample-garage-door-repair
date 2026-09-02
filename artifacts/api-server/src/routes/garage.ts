import { Router, type IRouter } from "express";
import { desc, eq, sql } from "drizzle-orm";
import { db, businessSettings, googleReviews, serviceRequests } from "@workspace/db";
import {
  AskGarageAssistantBody,
  CreateServiceRequestBody,
  GetAvailabilityQueryParams,
  UpdateBusinessSettingsBody,
  UpdateServiceRequestBody,
  UpdateServiceRequestParams,
} from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

const services = [
  { id: 1, slug: "broken-spring", name: "Broken Spring Repair", description: "High-cycle torsion and extension spring replacement with a complete safety inspection.", startingPrice: 189, duration: "60–90 min", emergency: true },
  { id: 2, slug: "opener-repair", name: "Opener Repair & Installation", description: "Quiet smart openers, remotes, keypads, sensors, gears, and motor diagnostics.", startingPrice: 149, duration: "60–120 min", emergency: false },
  { id: 3, slug: "off-track-door", name: "Off-Track Door Rescue", description: "Safe realignment of rollers, tracks and cables before the door causes more damage.", startingPrice: 169, duration: "60–90 min", emergency: true },
  { id: 4, slug: "new-door", name: "New Garage Door Installation", description: "Insulated steel, carriage-house and modern glass doors measured and installed precisely.", startingPrice: 1299, duration: "4–6 hours", emergency: false },
  { id: 5, slug: "cable-roller", name: "Cable, Roller & Hinge Repair", description: "Restore smooth, quiet travel with matched hardware and professional balancing.", startingPrice: 129, duration: "45–90 min", emergency: true },
  { id: 6, slug: "maintenance", name: "Safety Tune-Up", description: "A 25-point inspection, balance test, lubrication and safety-reversal verification.", startingPrice: 89, duration: "45 min", emergency: false },
];

const testimonials = [
  { id: 1, name: "Melissa R.", city: "Arlington", rating: 5, quote: "The spring snapped before school drop-off. They arrived in under an hour, explained every option, and left the door quieter than it has ever been.", service: "Emergency spring repair" },
  { id: 2, name: "David K.", city: "Plano", rating: 5, quote: "Straightforward estimate, clean installation, and the new smart opener was connected to our phones before the technician left.", service: "Smart opener installation" },
  { id: 3, name: "Jordan T.", city: "Frisco", rating: 5, quote: "No pressure and no mystery fees. They repaired the cable instead of trying to sell us a whole new door.", service: "Cable repair" },
];

const defaultGoogleReviews = [
  {
    googleReviewId: "default-google-1",
    reviewerName: "Melissa R.",
    reviewerPhotoUrl: null,
    rating: 5,
    comment: "Our spring broke before school drop-off. Summit arrived quickly, explained every option, and left the door quieter than it has been in years.",
    publishedAt: new Date("2026-08-26T14:00:00.000Z"),
    relativeTime: "1 week ago",
    isDefault: true,
  },
  {
    googleReviewId: "default-google-2",
    reviewerName: "David K.",
    reviewerPhotoUrl: null,
    rating: 5,
    comment: "Straightforward estimate and a very clean opener installation. The technician connected the remotes, keypad, and our phones before leaving.",
    publishedAt: new Date("2026-08-18T16:30:00.000Z"),
    relativeTime: "2 weeks ago",
    isDefault: true,
  },
  {
    googleReviewId: "default-google-3",
    reviewerName: "Jordan T.",
    reviewerPhotoUrl: null,
    rating: 5,
    comment: "No pressure and no mystery fees. They repaired the damaged cable and rollers instead of trying to sell us a whole new door.",
    publishedAt: new Date("2026-08-05T19:10:00.000Z"),
    relativeTime: "4 weeks ago",
    isDefault: true,
  },
];

const googlePlaceId = () => process.env.GOOGLE_PLACE_ID?.trim();
const googlePlacesApiKey = () => process.env.GOOGLE_PLACES_API_KEY?.trim();
let lastGoogleSyncAt = 0;
let googleSyncPromise: Promise<void> | null = null;

const isExcellentGoogleReview = (review: { rating: number; comment: string }) =>
  review.rating === 5 && review.comment.trim().length >= 40;

const relativeGoogleTime = (publishedAt: Date) => {
  const days = Math.max(1, Math.floor((Date.now() - publishedAt.getTime()) / 86_400_000));
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? "" : "s"} ago`;
};

async function ensureDefaultGoogleReviews() {
  await db.insert(googleReviews).values(defaultGoogleReviews).onConflictDoNothing({
    target: googleReviews.googleReviewId,
  });
}

async function syncGoogleReviews() {
  const placeId = googlePlaceId();
  const apiKey = googlePlacesApiKey();
  if (!placeId || !apiKey || Date.now() - lastGoogleSyncAt < 15 * 60 * 1000) return;
  if (googleSyncPromise) return googleSyncPromise;

  googleSyncPromise = (async () => {
    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=reviews&key=${encodeURIComponent(apiKey)}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Google Places returned ${response.status}`);
      const payload = (await response.json()) as {
        status?: string;
        result?: {
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
  await ensureDefaultGoogleReviews();
  await syncGoogleReviews();

  const connected = Boolean(googlePlaceId() && googlePlacesApiKey());
  const stored = await db
    .select()
    .from(googleReviews)
    .orderBy(desc(googleReviews.rating), desc(googleReviews.publishedAt));
  const liveReviews = stored.filter((review) => !review.isDefault && isExcellentGoogleReview(review));
  const selected = (liveReviews.length > 0 ? liveReviews : connected ? [] : stored.filter((review) => review.isDefault)).slice(0, 3);

  return {
    mode: liveReviews.length > 0 ? "live" as const : "demo" as const,
    connectionStatus: connected ? "connected" as const : "disconnected" as const,
    locationName: "Summit Garage Door Co.",
    aggregateRating: selected.length > 0 ? selected.reduce((sum, review) => sum + review.rating, 0) / selected.length : 0,
    totalReviewCount: selected.length,
    lastSyncedAt: liveReviews[0]?.syncedAt?.toISOString() ?? null,
    profileUrl: null,
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

const mapRequest = (row: typeof serviceRequests.$inferSelect) => ({
  ...row,
  createdAt: row.createdAt.toISOString(),
});

router.get("/garage/services", (_req, res) => res.json(services));
router.get("/garage/testimonials", (_req, res) => res.json(testimonials));
router.get("/garage/reviews", async (_req, res) => {
  res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=3600");
  res.json(await getGoogleReviewFeed());
});

router.get("/garage/availability", (req, res) => {
  const parsed = GetAvailabilityQueryParams.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "Enter a valid ZIP code." });
  const available = /^\d{5}(-\d{4})?$/.test(parsed.data.zip);
  return res.json({
    available,
    zip: parsed.data.zip,
    eta: available ? "Technician available today" : "Call for availability",
    message: available ? "You're in our service area. Same-day windows are open." : "We may still be able to help—call our dispatch team.",
  });
});

router.get("/garage/requests", async (_req, res) => {
  const rows = await db.select().from(serviceRequests).orderBy(desc(serviceRequests.createdAt));
  res.json(rows.map(mapRequest));
});

router.post("/garage/requests", async (req, res) => {
  const parsed = CreateServiceRequestBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Please check the request details." });
  const [created] = await db.insert(serviceRequests).values({ ...parsed.data, details: parsed.data.details ?? "" }).returning();
  return res.status(201).json(mapRequest(created));
});

router.patch("/garage/requests/:id", async (req, res) => {
  const params = UpdateServiceRequestParams.safeParse(req.params);
  const body = UpdateServiceRequestBody.safeParse(req.body);
  if (!params.success || !body.success) return res.status(400).json({ error: "Invalid update." });
  const [updated] = await db.update(serviceRequests).set(body.data).where(eq(serviceRequests.id, params.data.id)).returning();
  if (!updated) return res.status(404).json({ error: "Request not found." });
  return res.json(mapRequest(updated));
});

router.get("/garage/dashboard", async (_req, res) => {
  const rows = await db.select().from(serviceRequests).orderBy(desc(serviceRequests.createdAt));
  res.json({
    newRequests: rows.filter((r) => r.status === "new").length,
    scheduledToday: rows.filter((r) => r.status === "scheduled").length,
    emergencyCalls: rows.filter((r) => r.urgency === "emergency" && r.status !== "completed").length,
    completedThisWeek: rows.filter((r) => r.status === "completed").length,
    estimatedRevenue: rows.reduce((total, r) => total + (services.find((s) => s.slug === r.service)?.startingPrice ?? 149), 0),
    requests: rows.slice(0, 8).map(mapRequest),
  });
});

router.get("/garage/settings", async (_req, res) => {
  const [settings] = await db.select().from(businessSettings).limit(1);
  if (!settings) return res.json(defaultSettings);
  return res.json(withRefreshedSeedImages(settings));
});

router.patch("/garage/settings", async (req, res) => {
  const parsed = UpdateBusinessSettingsBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid settings." });
  const [settings] = await db.insert(businessSettings).values({ ...defaultSettings, ...parsed.data }).onConflictDoUpdate({
    target: businessSettings.id,
    set: parsed.data,
  }).returning();
  return res.json(settings);
});

router.post("/garage/assistant", async (req, res) => {
  const parsed = AskGarageAssistantBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Ask a question about your garage door." });
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5.4-mini",
      max_completion_tokens: 900,
      messages: [
        { role: "system", content: "You are a concise garage door repair intake assistant for a US service company. Prioritize safety. Never tell users to adjust torsion springs, cables, bottom brackets, or operate a door that is crooked, hanging, or has a broken spring. Recommend professional service and 911 for immediate threats. Reply in 2-4 short sentences, then name the most relevant service." },
        { role: "user", content: parsed.data.message },
      ],
    });
    const reply = completion.choices[0]?.message?.content ?? "Please stop operating the door and schedule a professional inspection.";
    const urgent = /spring|cable|crooked|off.?track|fell|trapped/i.test(parsed.data.message);
    return res.json({ reply, safetyLevel: urgent ? "urgent" : "caution", suggestedService: urgent ? "Emergency door repair" : "Safety tune-up" });
  } catch (error) {
    req.log.error({ error }, "Garage assistant failed");
    return res.json({ reply: "For safety, stop using the door if it is crooked, unusually heavy, or has a loose cable. Our dispatch team can help identify the right repair and arrange an inspection.", safetyLevel: "caution", suggestedService: "Safety inspection" });
  }
});

export default router;