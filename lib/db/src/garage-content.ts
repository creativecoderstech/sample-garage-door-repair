export const GARAGE_CONTENT_KINDS = ["page", "service", "location", "article", "faq", "project", "trust"] as const;
export const GARAGE_CORE_PAGE_SLUGS = new Set([
  "home", "services", "service-area", "about", "blog", "contact", "gallery", "faqs",
]);

export type GarageServiceFaq = { question: string; answer: string };
export type GarageMediaMetadata = {
  sourceUrl: string;
  license: string;
  attribution: string;
  representative: boolean;
};

export type GarageContentSeed = {
  id: string;
  kind: typeof GARAGE_CONTENT_KINDS[number];
  slug: string;
  aliases: string[];
  title: string;
  navigationLabel: string;
  navigationGroup: string;
  summary: string;
  body: string;
  symptoms: string[];
  expectations: string[];
  serviceFaqs: GarageServiceFaq[];
  imageUrl: string;
  imageAlt: string;
  mediaMetadata: GarageMediaMetadata;
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

const localMedia = (sourceUrl = "https://www.pexels.com/photo/garage-door-in-building-7996765/"): GarageMediaMetadata => ({
  sourceUrl,
  license: "Pexels License — free commercial use; source verified in PHOTO_SOURCES.md",
  attribution: "Tasso Mitsarakis / Pexels",
  representative: true,
});

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
  id, kind, slug, title, summary, body, sortOrder,
  navigationLabel: title,
  navigationGroup: kind === "page" ? "main" : "",
  aliases: [],
  symptoms: [],
  expectations: [],
  serviceFaqs: [],
  imageUrl: "/images/hero-desktop.webp",
  imageAlt: "Representative residential garage door",
  mediaMetadata: localMedia(),
  beforeImageUrl: "",
  seoTitle: title,
  seoDescription: summary,
  parentId: null,
  status: "published",
  verificationStatus: "verified",
  featured: false,
  serviceCode: "",
  ...options,
});

const service = (
  id: string,
  slug: string,
  title: string,
  summary: string,
  body: string,
  symptoms: string[],
  expectations: string[],
  serviceFaqs: GarageServiceFaq[],
  sortOrder: number,
  options: Partial<GarageContentSeed> = {},
) => record(id, "service", slug, title, summary, body, sortOrder, {
  parentId: "page-services",
  navigationGroup: "services",
  serviceCode: slug,
  symptoms,
  expectations,
  serviceFaqs,
  ...options,
});

export const garageContentSeed: GarageContentSeed[] = [
  record("page-home", "page", "home", "Garage Door Repair & Installation in Cumming, GA", "Straightforward garage-door repair, installation, opener, and maintenance service for homes and businesses.", "When a garage door stops moving, hangs unevenly, or no longer fits the way you use your property, Cumming Garage Door Service provides a clear path from inspection to repair or replacement. Tell us what you are seeing and request service; the team will review the details and confirm coverage, timing, and next steps.\n\nExplore seven focused service options, compare door styles, learn what to expect during an assessment, and use practical safety guidance when a spring, cable, or track may be damaged.", 10, { navigationLabel: "Home", featured: true, imageAlt: "Contemporary home with a representative garage door" }),
  record("page-services", "page", "services", "Our Garage Door Services", "Repair, replacement, opener, maintenance, and commercial garage-door services.", "Choose the service that best matches the problem. You do not need to diagnose the door before requesting help; describe the movement, sound, visible damage, and door position, and the business will confirm the appropriate next step.", 20, { navigationLabel: "Services" }),
  record("page-service-area", "page", "service-area", "Service Area", "Provisional coverage centered on Cumming and Forsyth County.", "Cumming and Forsyth County are the current provisional service-area examples. Enter the job address in a service request so coverage can be confirmed before relying on availability or travel timing.", 30, { navigationLabel: "Service Area", verificationStatus: "unverified" }),
  record("page-about", "page", "about", "About Cumming Garage Door Service", "A focused local service experience built around careful assessment, clear options, and safe work.", "Cumming Garage Door Service is designed to make a disruptive door problem easier to explain and resolve. The process starts with the symptoms at your property, continues with an assessment of the complete door system, and gives you a chance to review the recommended work before it begins.\n\nTeam history, credentials, insurance, brands, warranties, payment options, and financing will appear here only after the owner verifies each claim.", 40, { navigationLabel: "About" }),
  record("page-blog", "page", "blog", "Garage Door Advice", "Useful articles about door safety, operation, maintenance, and replacement planning.", "Use these articles to recognize common symptoms and prepare for service without handling high-tension parts. Springs, cables, bottom brackets, and unstable doors should be left to a trained professional.", 50, { navigationLabel: "Blog" }),
  record("page-contact", "page", "contact", "Request Garage Door Service", "Send the property and door details the business needs to review your request.", "Describe the problem, choose a preferred date and time, and include accurate contact and job-location details. Submitting a request does not confirm an appointment, price, coverage, or arrival time; the business must review and respond.", 60, { navigationLabel: "Contact" }),
  record("page-gallery", "page", "gallery", "Garage Door Style Inspiration", "Explore representative door styles and planning ideas for your home or commercial property.", "These licensed, representative images are design inspiration rather than a portfolio of completed Cumming Garage Door Service projects. Use them to discuss panel design, windows, finish, insulation, hardware, and fit.", 70, { navigationLabel: "Gallery" }),
  record("page-faqs", "page", "faqs", "Garage Door FAQs", "Clear answers about common problems, service requests, and safety.", "Find practical answers about springs, openers, uneven doors, maintenance, estimates, coverage, and the request process.", 80, { navigationLabel: "FAQs" }),
  record("page-privacy", "page", "privacy", "Privacy Notice", "How service-request and website information is handled.", "When you submit a service request, the site collects your name and contact details, job address and ZIP code, service or issue details, urgency, contact and scheduling preferences, description, and any photos you deliberately attach. Development records are stored persistently in PostgreSQL and app storage; the production Pages runtime stores records in D1 and private photos in R2. Authorized staff can review the request. When the owner configures a real HTTPS notification receiver, request details needed for follow-up are also sent to that receiver. The owner must review that receiver’s data practices before launch.\n\nMaya’s full transcript stays in temporary browser-session state. Only the selected service and a brief issue summary are handed to the request draft; the full chat is not stored with a request. If you use speech input, your browser or its configured speech provider may process audio under that provider’s terms.\n\nThere is currently no automatic retention schedule. Do not include unnecessary sensitive information. To ask for access, correction, or removal, use the verified contact channel shown on the site or submit a request asking the business to follow up. No statement here promises deletion timing, a sale policy, security certification, or a level of protection beyond the systems actually configured.", 90, { navigationLabel: "Privacy", navigationGroup: "legal" }),
  record("page-request-terms", "page", "request-terms", "Service Request Terms", "What submitting a request does—and does not—confirm.", "A service request asks Cumming Garage Door Service to review the contact details, job address and ZIP, issue, preferences, and photos you choose to provide. Authorized staff and, when configured, the verified HTTPS notification receiver can see request details for follow-up.\n\nSubmitting the form is a receipt of your request, not a confirmed appointment, dispatch, service-area decision, estimate, contract, price, or response-time promise. The business must contact you to confirm coverage, scheduling, scope, and written terms.\n\nFor a crooked, hanging, fallen, off-track, unusually heavy, spring-damaged, or cable-damaged door, stop using it and keep people, pets, and vehicles clear. Call 911 for an immediate threat to life or serious injury. Website information does not replace an onsite assessment.", 100, { navigationLabel: "Request Terms", navigationGroup: "legal" }),

  service("service-repair", "garage-door-repair", "Garage Door Repair", "Diagnosis and repair for doors that are stuck, noisy, uneven, damaged, or unreliable.", "A garage door works as a balanced system. An assessment checks the door, tracks, rollers, hinges, cables, springs, opener connection, and safety features to identify the cause rather than masking a symptom.", ["Door will not open or close", "Grinding, popping, scraping, or new vibration", "Slow, uneven, or jerky movement", "Loose or visibly damaged hardware"], ["Whole-system inspection", "Explanation of the fault and repair options", "Approval before work begins", "Operational and safety check after the repair"], [{ question: "Do I need to know which part failed?", answer: "No. Describe what the door is doing and any sound or visible damage; the assessment determines the cause." }, { question: "Should I keep trying the opener?", answer: "Stop if the door strains, moves unevenly, hangs, or makes a sharp pop." }], 110, { featured: true, imageUrl: "/images/service-repair.webp", imageAlt: "Representative suburban home garage", mediaMetadata: { ...localMedia("https://www.pexels.com/photo/white-and-gray-house-near-green-trees-8031881/"), attribution: "Curtis Adams / Pexels" } }),
  service("service-spring", "broken-spring-replacement", "Broken Spring Replacement", "Replacement and system checks when a spring breaks or no longer balances the door.", "Garage-door springs carry extreme tension and are sized to the door. A trained professional should identify the spring system, inspect related cables and hardware, replace appropriate components, and verify balance and travel.", ["A loud bang from the garage", "A visible gap in a torsion spring", "A door that feels unusually heavy", "An opener that lifts only a few inches"], ["Door secured before inspection", "Spring system and related hardware evaluated", "Correct replacement options explained", "Balance and travel tested before return to use"], [{ question: "Can I open a door with a broken spring?", answer: "Do not force or lift an unusually heavy door. Keep it closed when safely possible and arrange professional service." }, { question: "Is spring replacement a DIY repair?", answer: "No. Springs, cables, and bottom brackets can cause severe injury when handled incorrectly." }], 120, { featured: true }),
  service("service-cable-track", "cable-roller-off-track-repair", "Cable, Roller & Off-Track Repair", "Stabilization and repair for frayed cables, failed rollers, damaged tracks, and crooked or hanging doors.", "A door that has left its track or lost cable tension can shift or fall without warning. Stop operating it and keep the opening clear until the system can be stabilized and inspected.", ["Rollers outside the track", "A crooked or hanging door", "Frayed, loose, or displaced cables", "Binding, scraping, or gaps along the track"], ["Immediate attention to door stability", "Inspection of tracks, rollers, cables, hinges, and brackets", "Repair options based on the cause and damage", "Alignment and controlled-travel check"], [{ question: "Can I push a roller back into the track?", answer: "No. Do not loosen track hardware, pull cables, or force the door into position." }, { question: "Can I park beneath a hanging door?", answer: "Keep people, pets, and vehicles away from an unstable door." }], 130, { featured: true }),
  service("service-opener", "garage-door-opener-repair-installation", "Garage Door Opener Repair & Installation", "Troubleshooting, repair, and installation for opener, control, and safety-sensor problems.", "Opener service separates a drive-unit or control fault from resistance elsewhere in the door. Replacement planning considers door compatibility, controls, power, lighting, access, and required safety features.", ["Remote, keypad, or wall control does not respond", "Motor runs but the door does not move correctly", "Door reverses or will not close", "Excessive opener noise or intermittent operation"], ["Door movement checked independently of the opener when safe", "Power, controls, drive, limits, and sensors assessed", "Repair or compatible replacement options", "Safety reversal and control testing"], [{ question: "Can I bypass the photo eyes?", answer: "No. Clear obvious objects and gently clean accessible lenses, but never bypass a safety device." }, { question: "Does a noisy opener always need replacement?", answer: "Not necessarily. Noise can come from the opener or the door system, so both should be assessed." }], 140, { imageUrl: "/images/service-opener.webp", imageAlt: "Representative contemporary garage-door exterior" }),
  service("service-installation", "new-garage-door-installation", "New Garage Door Installation", "Measured replacement and installation for updated appearance, fit, insulation, and operation.", "A new-door plan considers the opening, headroom, track layout, spring sizing, hardware, insulation, windows, finish, opener compatibility, and local property needs before product selection.", ["Severe panel or structural damage", "Recurring failures or extensive corrosion", "Poor fit, weather sealing, or insulation", "A planned exterior or commercial-property update"], ["Opening and existing system measured", "Style, material, insulation, and hardware options reviewed", "Written scope confirmed before ordering or installation", "Final fit, balance, travel, and safety checks"], [{ question: "Can I choose a door from a photo?", answer: "A photo is a useful starting point, but measurements, construction, track layout, and product availability must be confirmed." }, { question: "Will my existing opener work?", answer: "Compatibility depends on the new door and current equipment and is checked during planning." }], 150),
  service("service-maintenance", "garage-door-maintenance-tune-ups", "Garage Door Maintenance & Tune-Ups", "Inspection and adjustment intended to catch wear, noise, and movement problems early.", "Maintenance reviews the complete operating system and identifies developing wear before it becomes a larger interruption. Customers should observe visible symptoms but leave tensioned hardware and balance adjustments to a professional.", ["New squeaks, rattles, or vibration", "Slower or less even travel", "Worn weather seals or visible hardware wear", "A door due for a preventive inspection"], ["Visual and operational inspection", "Hardware, balance, travel, and safety-system review", "Appropriate adjustment and lubrication", "Clear report of items needing separate repair"], [{ question: "How often should a door be inspected?", answer: "Annual professional inspection is a common preventive schedule, with earlier service whenever movement, sound, or visible condition changes." }, { question: "What can I inspect safely?", answer: "From a safe distance, note noise, movement, seals, and visible damage. Do not touch springs, cables, or bottom brackets." }], 160),
  service("service-commercial", "commercial-garage-door-services", "Commercial Garage Door Services", "Assessment, repair, maintenance, opener, and replacement planning for commercial overhead doors.", "Commercial door service begins with the opening, equipment, duty cycle, access needs, safety systems, and operational impact. The business must confirm property coverage, equipment scope, scheduling, and written terms for each request.", ["Commercial overhead door will not operate correctly", "Damaged sections, tracks, rollers, cables, or controls", "Recurring noise, binding, or unreliable travel", "Planned maintenance or replacement evaluation"], ["Site and equipment details reviewed", "Safety and operational priorities identified", "Scope and scheduling confirmed with the business", "Work and return-to-service checks documented as applicable"], [{ question: "Are all commercial door types covered?", answer: "Equipment scope is confirmed after the business reviews the door type, location, and issue." }, { question: "Is emergency commercial response available?", answer: "Urgent and after-hours availability is not confirmed unless a verified urgent-request policy is published." }], 170, { imageUrl: "/images/service-commercial.webp", imageAlt: "Representative commercial metal overhead door", mediaMetadata: { ...localMedia("https://www.pexels.com/photo/industrial-brick-warehouse-with-metal-garage-door-28453365/"), attribution: "Airam Dato-on / Pexels" } }),

  record("location-cumming", "location", "cumming", "Garage Door Service in Cumming", "Provisional coverage for homes and businesses in Cumming, Georgia.", "Cumming is included as an owner-authorized temporary coverage example. Submit the exact job address so the business can verify final coverage and scheduling before an appointment is confirmed.", 210, { parentId: "page-service-area", verificationStatus: "unverified" }),
  record("location-forsyth", "location", "forsyth-county", "Garage Door Service in Forsyth County", "Provisional coverage across Forsyth County, subject to address confirmation.", "Forsyth County is included as an owner-authorized temporary coverage example. Coverage boundaries, travel, and timing remain unverified until the owner replaces or verifies this setting.", 220, { parentId: "page-service-area", verificationStatus: "unverified" }),

  record("article-balance", "article", "why-door-balance-matters", "Why Garage Door Balance Matters", "How balance affects door movement, opener strain, and safety.", "The spring system supports most of a garage door’s weight so the door and opener can move it in a controlled way. Rapid dropping, unusual heaviness, uneven travel, or an opener that strains can signal a balance or hardware problem.\n\nDo not disconnect or test a door when spring or cable damage is suspected. Stop operation and arrange an assessment.", 310, { parentId: "page-blog", featured: true }),
  record("article-sensors", "article", "garage-door-sensor-problems", "What to Check When a Garage Door Reverses", "Safe observations before requesting opener or sensor service.", "Remove obvious objects from the opening and gently clean accessible photo-eye lenses. Notice whether indicator lights are steady and whether sunlight or visible damage may be involved.\n\nDo not bypass sensors or increase force settings to make the door close. Continued reversal, binding, or uneven movement calls for assessment.", 320, { parentId: "page-blog" }),
  record("article-replace", "article", "repair-or-replace-garage-door", "Repair or Replace Your Garage Door?", "Questions that help frame a repair-versus-replacement decision.", "A focused repair may be appropriate when the door structure and track system remain sound. Extensive panel damage, corrosion, recurring failures, poor fit, outdated safety performance, or changing insulation and design goals can support replacement planning.\n\nAn onsite assessment should compare the complete scope and written options rather than treating age alone as the answer.", 330, { parentId: "page-blog" }),

  record("faq-heavy", "faq", "door-feels-heavy", "Why does my garage door feel unusually heavy?", "A spring may no longer be supporting the door correctly.", "Stop operating or lifting it. Do not pull the release or handle springs and cables. Keep the area clear and request professional assessment.", 410, { parentId: "page-faqs" }),
  record("faq-request", "faq", "does-request-confirm-appointment", "Does submitting a service request confirm an appointment?", "No. The business must review and confirm it.", "A request does not confirm coverage, dispatch, timing, price, or an appointment. The business will need to contact you about next steps.", 420, { parentId: "page-faqs" }),
  record("faq-price", "faq", "garage-door-repair-price", "How is garage door repair pricing determined?", "Final pricing follows diagnosis and a confirmed scope.", "Door size, system, failed parts, condition, access, and selected work can affect the scope. No website price is confirmed unless the business publishes and verifies it.", 430, { parentId: "page-faqs" }),
  record("faq-urgent", "faq", "urgent-garage-door-problem", "What should I do with an unsafe or unstable door?", "Stop using it and keep the area clear.", "For a crooked, hanging, off-track, fallen, unusually heavy, spring-damaged, or cable-damaged door, keep people, pets, and vehicles away. Urgent response availability is not confirmed unless a verified policy is published.", 440, { parentId: "page-faqs" }),

  record("project-modern", "project", "modern-panel-inspiration", "Modern Panel Door Inspiration", "Representative inspiration for clean lines, restrained windows, and contemporary finishes.", "Use this representative image to discuss design direction; it is not a claim of completed work or product availability.", 510, { parentId: "page-gallery", featured: true, imageUrl: "/images/gallery-modern.webp", imageAlt: "Representative modern white garage door on a home" }),
  record("project-classic", "project", "classic-door-inspiration", "Classic Garage Door Inspiration", "Representative inspiration for traditional panels and window details.", "This licensed local asset is presented as style inspiration, not a customer project or installation claim.", 520, { parentId: "page-gallery", imageUrl: "/images/gallery-classic.webp", imageAlt: "Representative classic white paneled garage door", mediaMetadata: { ...localMedia("https://www.pexels.com/photo/white-and-gray-house-near-green-trees-8031881/"), attribution: "Curtis Adams / Pexels" } }),
  record("project-wood", "project", "wood-look-door-inspiration", "Warm Wood-Look Door Inspiration", "Representative inspiration for natural color and architectural contrast.", "Materials, finishes, fit, availability, and installation scope must be confirmed during replacement planning.", 530, { parentId: "page-gallery", imageUrl: "/images/gallery-wood.webp", imageAlt: "Representative wood-look sectional garage door", mediaMetadata: { ...localMedia("https://www.pexels.com/photo/charming-green-doors-in-edinburgh-street-scene-31402862/"), attribution: "Gül Işık / Pexels" } }),

  record("trust-team", "trust", "owner-and-team", "Owner and team", "Not yet verified.", "Owner and team information will be published after explicit claim verification.", 610, { status: "draft", verificationStatus: "unverified" }),
  record("trust-credentials", "trust", "licenses-and-insurance", "Licenses and insurance", "Not yet verified.", "No license or insurance claim is published until the owner supplies and verifies it.", 620, { status: "draft", verificationStatus: "unverified" }),
  record("trust-warranty", "trust", "warranty", "Warranty terms", "Not yet verified.", "Warranty and guarantee terms must be entered and individually verified before publication.", 630, { status: "draft", verificationStatus: "unverified" }),
  record("trust-urgent", "trust", "urgent-request-policy", "Urgent-request policy", "Not yet verified.", "No emergency, after-hours, immediate-response, or arrival-time promise is currently approved.", 640, { status: "draft", verificationStatus: "unverified" }),
];

export function isSafeGarageImageUrl(value: string): boolean {
  if (!value) return true;
  if (/^(?:javascript|data):/i.test(value.trim())) return false;
  return /^(?:\/(?!\/)|https:\/\/)/i.test(value.trim());
}