export const GARAGE_CONTENT_KINDS = ["page", "service", "location", "article", "faq", "project", "trust"] as const;
export const GARAGE_CORE_PAGE_SLUGS = new Set(["home", "services", "service-area", "about", "blog", "contact", "gallery", "faqs"]);

export type GarageContentSeed = {
  id: string;
  kind: typeof GARAGE_CONTENT_KINDS[number];
  slug: string;
  aliases: string[];
  title: string;
  summary: string;
  body: string;
  imageUrl: string;
  imageAlt: string;
  beforeImageUrl: string;
  seoTitle: string;
  seoDescription: string;
  parentId: string | null;
  sortOrder: number;
  status: "draft" | "published";
  verificationStatus: "unverified" | "verified";
  featured: boolean;
  serviceCode: string;
};

const record = (
  id: string,
  kind: GarageContentSeed["kind"],
  slug: string,
  title: string,
  summary: string,
  body: string,
  sortOrder: number,
  options: Partial<GarageContentSeed> = {},
): GarageContentSeed => ({
  id, kind, slug, title, summary,
  body: `${body}\n\nBefore contacting a provider, record the door position, visible symptoms, and any unusual sounds from a safe distance. Do not stand beneath a moving or unstable door.\n\nCoverage, scheduling, products, pricing, credentials, and written terms must be confirmed directly by the business; submitting a request does not create an appointment.`,
  sortOrder,
  aliases: [], imageUrl: "/images/garage/hero-door-forward.jpg", imageAlt: "Representative residential garage door", beforeImageUrl: "",
  seoTitle: title, seoDescription: summary,
  parentId: null, status: "published", verificationStatus: "unverified",
  featured: false, serviceCode: "", ...options,
});

export const garageContentSeed: GarageContentSeed[] = [
  record("page-home", "page", "home", "Garage Door Trouble? Start Here.", "Practical guidance for garage-door problems, with a clear path to request an assessment.", "Learn the warning signs of common garage-door problems, what information helps during an assessment, and which components should always be left to a trained professional. Business identity, coverage, pricing, and availability remain unconfirmed in this preview.", 10, { featured: true }),
  record("page-services", "page", "services", "Garage Door Service Guides", "Educational overviews of common repair and replacement categories.", "Use these guides to understand symptoms and questions to ask. They do not claim that a particular business offers a service, has parts available, or can respond within a particular time.", 20),
  record("page-service-area", "page", "service-area", "Service-Area Planning", "How to confirm coverage before relying on a garage-door provider.", "Coverage is unconfirmed. Share a ZIP code or address with the business and wait for explicit confirmation before assuming travel area, timing, or appointment availability.", 30),
  record("page-about", "page", "about", "How to Evaluate a Garage Door Provider", "A checklist for comparing safety practices, diagnosis, documentation, and communication.", "Ask who will perform the work, how high-tension components are handled, when pricing is approved, and what written terms apply. Credentials and business history must be verified directly.", 40),
  record("page-blog", "page", "blog", "Garage Door Safety Library", "Original homeowner education about inspection, troubleshooting boundaries, and planning.", "Read practical articles designed to help you observe symptoms without handling springs, cables, bottom brackets, or unstable doors.", 50),
  record("page-contact", "page", "contact", "Prepare a Service Request", "Gather useful details without treating a request as a confirmed appointment.", "Note the door type, symptoms, when the issue began, and whether the door is level and fully closed. A submitted request requires business review and does not confirm coverage, price, or timing.", 60),
  record("page-gallery", "page", "gallery", "Project Planning Gallery", "Representative project concepts and details worth discussing during an assessment.", "Images and descriptions are representative educational material, not evidence of work completed by a particular business.", 70),
  record("page-faqs", "page", "faqs", "Garage Door FAQs", "Safety-first answers to common homeowner questions.", "When a door is crooked, hanging, off track, unusually heavy, or affected by a broken spring or cable, stop using it and keep the area clear.", 80),

  record("service-spring", "service", "broken-spring", "Broken Spring Safety Guide", "Recognize likely spring failure and avoid high-tension hazards.", "A loud bang, a visible spring gap, or a door that suddenly feels extremely heavy may indicate spring failure. Do not touch springs, cables, or bottom brackets and do not force the door. A trained professional should inspect the system.", 110, { parentId: "page-services", serviceCode: "springs", featured: true }),
  record("service-opener", "service", "opener-diagnostics", "Opener and Sensor Diagnostics", "Separate simple power or obstruction checks from adjustments requiring expertise.", "You may check the breaker, remote batteries, and whether an object blocks the photo eyes. Do not bypass sensors or increase force settings to overcome resistance. Stop if the door moves unevenly.", 120, { parentId: "page-services", serviceCode: "opener" }),
  record("service-track", "service", "off-track-door", "Off-Track Door Safety Guide", "What to do when rollers leave the track or the door hangs unevenly.", "Stop operating the door and keep people, pets, and vehicles clear. Do not loosen track hardware, pull cables, or force rollers into place. The door should be stabilized and assessed by a trained professional.", 130, { parentId: "page-services", serviceCode: "repair", featured: true }),
  record("service-hardware", "service", "cables-rollers-hinges", "Cables, Rollers, and Hinges", "Understand the moving hardware that supports controlled door travel.", "Frayed cables, tilted rollers, and cracked hinges can lead to uneven movement. Observe from a safe distance. Cables and bottom fixtures can remain under dangerous tension even when the door is closed.", 140, { parentId: "page-services", serviceCode: "repair" }),
  record("service-replacement", "service", "door-replacement-planning", "Door Replacement Planning", "Compare condition, insulation, fit, safety, and design before selecting a door.", "Document opening dimensions and goals, then have a qualified provider verify measurements, track condition, spring sizing, hardware, and written terms. Product availability and installation service are unconfirmed.", 150, { parentId: "page-services", serviceCode: "installation" }),
  record("service-maintenance", "service", "maintenance-inspection", "Maintenance and Inspection Guide", "Plan periodic observation and professional safety checks without handling tensioned hardware.", "Watch for new noises, uneven travel, damaged weather seals, frayed cables, or loose visible parts without touching them. A qualified provider can assess balance, hardware, safety reversal, and lubrication needs.", 160, { parentId: "page-services", serviceCode: "maintenance" }),

  ...[
    ["atlanta", "Atlanta Coverage Guidance", "Coverage within Atlanta is not confirmed. Ask the business to verify the exact ZIP code, travel limits, schedule, and any location-specific terms."],
    ["marietta", "Marietta Coverage Guidance", "Coverage in Marietta is not confirmed. Submit the address for review and wait for direct confirmation before relying on timing or availability."],
    ["decatur", "Decatur Coverage Guidance", "Coverage in Decatur is not confirmed. A city name alone does not establish a service boundary; confirm the job address with the business."],
    ["alpharetta", "Alpharetta Coverage Guidance", "Coverage in Alpharetta is not confirmed. Confirm travel area, appointment timing, and final pricing directly with the business."],
  ].map(([slug, title, body], index) => record(`location-${slug}`, "location", slug, title, "Location-specific planning with coverage explicitly unconfirmed.", body, 210 + index * 10, { parentId: "page-service-area" })),

  record("article-balance", "article", "why-door-balance-matters", "Why Garage Door Balance Matters", "Balance affects opener strain, movement, and safe inspection.", "A balanced door is supported by a correctly matched spring system. Symptoms such as rapid dropping, uneven travel, or unusual heaviness call for professional assessment. Do not test balance when spring or cable damage is suspected.", 310, { parentId: "page-blog", featured: true }),
  record("article-sensors", "article", "safe-sensor-observations", "Safe Observations for Reversing Doors", "Check for obvious obstructions without bypassing safety systems.", "Clear objects from the opening and gently clean accessible photo-eye lenses. If indicators remain inconsistent, wiring is damaged, or the door strains, stop. Never bypass sensors or raise force settings to make a door close.", 320, { parentId: "page-blog" }),
  record("article-request", "article", "prepare-for-an-assessment", "How to Prepare for a Garage Door Assessment", "Useful notes and photos can support a clearer diagnosis.", "From a safe location, record the symptom, sounds, visible damage, door position, opener model, and when the problem began. Keep away from moving or hanging components. A request is not an appointment until confirmed.", 330, { parentId: "page-blog" }),

  record("faq-heavy", "faq", "door-feels-heavy", "Why does the door feel unusually heavy?", "A spring may not be supporting the door correctly.", "Stop operating it. Do not attempt to lift it, pull the release, or handle springs and cables. Keep the area clear and arrange a professional assessment.", 410, { parentId: "page-faqs" }),
  record("faq-reverses", "faq", "door-reverses", "Why does the door reverse before closing?", "An obstruction, photo-eye issue, binding, or another fault may be involved.", "Clear obvious objects and clean accessible sensor lenses. Do not bypass sensors or change force settings. Seek assessment if the problem continues.", 420, { parentId: "page-faqs" }),
  record("faq-manual", "faq", "manual-opening", "When is manual opening unsafe?", "Manual operation is unsafe when the door is unstable or high-tension parts may be damaged.", "Do not pull the release under a partially open, crooked, unusually heavy, spring-damaged, or cable-damaged door.", 430, { parentId: "page-faqs" }),
  record("faq-price", "faq", "pricing-and-timing", "Are price and arrival time confirmed?", "No business-specific price, coverage, or timing is verified in this preview.", "Diagnosis, written options, coverage, and scheduling must be confirmed directly. Sending a request does not create an appointment.", 440, { parentId: "page-faqs" }),

  record("project-insulated", "project", "insulated-door-concept", "Insulated Door Planning Concept", "Representative example: compare insulation, seals, hardware, and opening fit.", "This is a planning example, not a claim of completed work. Product selection and installation details require onsite verification.", 510, { parentId: "page-gallery", featured: true }),
  record("project-opener", "project", "opener-layout-concept", "Opener Layout Planning Concept", "Representative example: review headroom, power, controls, and safety-sensor placement.", "This example illustrates assessment topics and does not claim product availability or completed work.", 520, { parentId: "page-gallery" }),
  record("project-hardware", "project", "hardware-renewal-concept", "Hardware Renewal Planning Concept", "Representative example: inspect matched rollers, hinges, cables, and balance.", "This is educational material rather than a business portfolio item. High-tension hardware requires trained handling.", 530, { parentId: "page-gallery" }),

  record("trust-identity", "trust", "business-identity", "Business identity", "Awaiting owner verification.", "Business name, ownership, address, and contact channels are not verified.", 610, { status: "draft" }),
  record("trust-credentials", "trust", "credentials", "Credentials and insurance", "Awaiting owner verification.", "Licensing, insurance, training, and trade affiliations are not verified.", 620, { status: "draft" }),
  record("trust-warranty", "trust", "warranty", "Warranty terms", "Awaiting owner verification.", "No warranty, guarantee, or refund terms are confirmed.", 630, { status: "draft" }),
  record("trust-hours", "trust", "hours-and-availability", "Hours and availability", "Awaiting owner verification.", "Hours, urgent response, appointment timing, and service coverage are not confirmed.", 640, { status: "draft" }),
];

export function isSafeGarageImageUrl(value: string): boolean {
  if (!value) return true;
  if (/^(?:javascript|data):/i.test(value.trim())) return false;
  return /^(?:\/(?!\/)|https:\/\/)/i.test(value.trim());
}