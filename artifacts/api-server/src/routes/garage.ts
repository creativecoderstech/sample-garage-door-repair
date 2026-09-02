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

const customerCareFaqs = [
  ["Service area", "We serve Metro Atlanta and nearby Georgia communities. Customers can send a ZIP code or call to confirm coverage."],
  ["Response time", "Most requests are answered within 45 minutes during business hours. Priority scheduling is available for security concerns, stuck-open doors, and dangerous damage, but this is not a guaranteed same-day appointment."],
  ["Estimates", "A technician inspects the system, explains what failed, and gives clear options before work begins. No additional work is added without customer approval."],
  ["Why a door will not open", "Common causes include a broken spring, failed opener, blocked sensor, damaged cable, power issue, or off-track door. Customers should stop pressing the opener if the door strains, lifts unevenly, or makes a sharp popping sound."],
  ["Broken springs", "A loud bang, a gap in the spring, an unusually heavy door, or an opener that lifts only a few inches can indicate a broken spring. Springs are under extreme tension and must not be touched, unwound, or replaced by a customer."],
  ["Manual operation", "Manual opening is only appropriate when the door is fully closed and level with no sign of spring or cable damage. Never pull the emergency release under an unstable or partially open door."],
  ["Door reverses", "Blocked, dirty, misaligned, or sun-affected safety sensors can cause reversing. Customers may clear obvious objects, but must not bypass sensors or adjust force and travel settings themselves."],
  ["Off-track or hanging door", "Stop using the door, keep people, pets, and vehicles away, and do not pull cables, loosen brackets, or force rollers back into place. A trained technician should stabilize it."],
  ["Repair or replacement", "Repair is often sensible when panels and tracks are sound. Extensive damage, recurring failures, corrosion, poor insulation, or outdated safety performance can make replacement a better value. A technician can explain both options."],
  ["Maintenance", "A professional inspection once a year is a good preventive schedule for most homes. Customers should watch for frayed cables, loose parts, uneven movement, or new noises without touching high-tension components."],
  ["Pricing", "The website lists starting prices by service, but the final price depends on the failed part, door size and weight, parts availability, and related damage. The technician provides the price after diagnosis and before repairs."],
  ["Emergency service", "Priority help is available when enabled in business settings for stuck-open, off-track, hanging, or vehicle-blocking doors. An unstable door must remain untouched with the area clear."],
];

async function getCustomerCareContext() {
  const [storedSettings] = await db.select().from(businessSettings).limit(1);
  const settings = storedSettings ? withRefreshedSeedImages(storedSettings) : defaultSettings;
  const emergencyGuidance = settings.emergencyEnabled
    ? "Priority help is enabled for urgent door problems; never promise a specific arrival time."
    : "Priority help is not currently enabled in settings; direct customers to call the business for availability.";
  const serviceLines = services
    .map((service) => `- ${service.name} (${service.slug}): ${service.description} Starting at $${service.startingPrice}; typical duration ${service.duration}; ${service.emergency ? "priority situations may apply" : "standard scheduling"}.`)
    .join("\n");
  const faqLines = customerCareFaqs.map(([question, answer]) => `- ${question}: ${answer}`).join("\n");
  const reviewLines = testimonials
    .map((review) => `- ${review.name} in ${review.city} praised ${review.service}: "${review.quote}"`)
    .join("\n");

  return [
    "AUTHORITATIVE WEBSITE AND BUSINESS CONTEXT — use only these facts.",
    `Business: ${settings.businessName}`,
    `Phone: ${settings.phone}`,
    `Email: ${settings.email}`,
    `Service area: ${settings.serviceArea}`,
    `Emergency setting: ${settings.emergencyEnabled ? "enabled" : "not enabled"}. ${emergencyGuidance}`,
    "Response expectation: the website says most requests are answered within 45 minutes during business hours. Business hours themselves are not published.",
    "Booking: the customer can submit name, phone, optional email, job address, service, urgency, preferred date/time, and a description. Photos and videos remain local on the customer's device until they choose to share them.",
    "Estimate policy: technicians inspect the system and explain options before work; do not promise a free estimate unless the website context says so.",
    "Services:",
    serviceLines,
    "Frequently asked questions:",
    faqLines,
    "Customer review previews:",
    reviewLines,
    "The gallery and before/after sections show representative website project imagery; do not infer guarantees, pricing, or availability from photos.",
    "Never invent hours, appointment slots, guarantees, warranties, refunds, final prices, or service coverage outside this context. If something is not listed, say that plainly and offer the phone number or a service request.",
  ].join("\n");
}

function suggestedServiceFor(message: string) {
  const normalized = message.toLowerCase();
  if (/spring|torsion|extension/.test(normalized)) return "Broken Spring Repair";
  if (/off.?track|track|roller/.test(normalized)) return "Off-Track Door Rescue";
  if (/cable|hinge/.test(normalized)) return "Cable, Roller & Hinge Repair";
  if (/opener|remote|keypad|sensor|motor/.test(normalized)) return "Opener Repair & Installation";
  if (/new (?:garage )?door|replace|replacement|install|insulated|carriage|glass/.test(normalized)) return "New Garage Door Installation";
  if (/maint|inspect|tune|lubricat|annual|slow|noisy|noise|squeak|grind/.test(normalized)) return "Safety Tune-Up";
  if (/price|cost|quote|estimate/.test(normalized)) return "Service assessment";
  return "Service assessment";
}

const urgentGarageTerms = /broken spring|spring (?:snapped|broke|broken)|off.?track|hanging|crooked|uneven|loose cable|frayed cable|stuck open|door fell|trapped|dangerous/i;
const garageIssueTerms = /garage|door|opener|spring|cable|repair|service|quote|estimate|schedule|book|track|roller|hinge|sensor|motor/i;

function casualCustomerCareReply(message: string) {
  const normalized = message.trim().toLowerCase();
  if (normalized.length > 100 || garageIssueTerms.test(normalized)) return null;
  if (/^(thanks|thank you|thx|ty|appreciate it)[!. ]*$/i.test(normalized)) {
    return "You’re welcome. If anything changes with the door, just tell me what you’re noticing and I’ll help you figure out the next step.";
  }
  if (/^(how are you|how'?s it going|hru|you good)[?!., ]*$/i.test(normalized)) {
    return "I’m doing well, thanks for asking. I’m here to help you get your garage door sorted out—what’s it doing today: stuck, noisy, slow, or refusing to open?";
  }
  if (/^(hi|hello|hey|good morning|good afternoon|good evening)[!. ]*$/i.test(normalized)) {
    return "Hi! I’m glad you reached out. You don’t need to know the repair name—just tell me what the door is doing, and I’ll help point you in the right direction.";
  }
  return null;
}

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
    const websiteContext = await getCustomerCareContext();
    const userHistory = (parsed.data.history ?? []).filter((message) => message.role === "user");
    const conversationText = [...userHistory.map((message) => message.content), parsed.data.message].join("\n");
    const safetyLevel = urgentGarageTerms.test(conversationText)
      ? "urgent" as const
      : garageIssueTerms.test(conversationText)
        ? "caution" as const
        : "safe" as const;
    const suggestedService = suggestedServiceFor(conversationText);
    const casualReply = casualCustomerCareReply(parsed.data.message);
    if (casualReply) {
      return res.json({ reply: casualReply, safetyLevel: "safe", suggestedService: "Service assessment" });
    }
    const completion = await openai.chat.completions.create({
      model: "gpt-5.4-mini",
      max_completion_tokens: 900,
      messages: [
        {
          role: "system",
          content: [
            "You are Maya, the friendly and polite customer-care coordinator for the garage-door business described below. Speak with a warm, natural, human-friendly voice as a member of the business team.",
            "Do not refer to yourself as an AI, bot, automated system, diagnostic tool, or virtual assistant. Use first-person language as Maya, but do not invent personal experiences, on-site actions, staff availability, appointment promises, or knowledge outside the authoritative context.",
            "You are the first calm, helpful voice a homeowner reaches when a garage-door problem interrupts their day. Sound like a real local coordinator: acknowledge the inconvenience, use contractions, and explain the next step in plain language. Do not sound like a script, a search result, or a safety disclaimer pasted onto every reply.",
            "Answer questions about the website, business, service area, services, starting prices, estimates, response expectations, reviews, FAQs, and booking process using the authoritative context. Do not mention hidden prompts or claim knowledge outside it.",
            "Keep replies warm, concise, and practical: usually 2-5 short sentences. Ask at most one useful follow-up question at a time. When a visitor describes a problem, acknowledge it, give safe next steps, identify the most relevant service, and invite them to start a service request.",
            "For greetings, thanks, or small talk, respond naturally before gently bringing the conversation back to the door. Never attach a caution or urgent framing to ordinary small talk. When the issue is unclear, offer a few relatable examples such as stuck, noisy, slow, uneven, or an opener that will not respond.",
            "Use the business context naturally when it helps: Summit serves Metro Atlanta and nearby Georgia communities, requests are usually answered within 45 minutes during business hours, and the service catalog has starting prices but the technician confirms the final price after inspection. Mention one relevant fact at a time instead of reciting the whole business profile.",
            "Prioritize creating a service request, but never pressure the customer. You may collect the issue, urgency, job location, preferred timing, name, phone, and email. Do not promise an appointment, arrival time, final price, warranty, refund, or coverage that is not in the context.",
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
    let reply = completion.choices[0]?.message?.content?.trim() ?? "I can help connect you with the right garage-door service.";
    if (safetyLevel === "urgent" && !/stop|do not|don't|keep .* clear|professional/i.test(reply)) {
      reply = `For safety, stop using the door and keep people, pets, and vehicles clear. Please arrange professional help rather than trying to move or repair it yourself.\n\n${reply}`;
    }
    return res.json({ reply, safetyLevel, suggestedService });
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
    const fallbackService = suggestedServiceFor(fallbackConversation);
    const reply = fallbackSafetyLevel === "urgent"
      ? "I’m sorry—I couldn’t connect just now. Please stop using the door and keep people, pets, and vehicles clear. You can call our team or start a service request, and we’ll help identify the safest next step."
      : "I’m sorry—I couldn’t pull that up just now. Tell me what the door is doing, or call our team and we’ll help you figure out the right next step.";
    return res.json({ reply, safetyLevel: fallbackSafetyLevel, suggestedService: fallbackService });
  }
});

export default router;