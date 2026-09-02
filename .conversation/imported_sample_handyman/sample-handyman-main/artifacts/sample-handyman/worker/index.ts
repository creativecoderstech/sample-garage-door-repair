import { Hono } from "hono";
import { cors } from "hono/cors";
import {
  ConfirmServiceRequestBody,
  ConfirmServiceRequestResponse,
  CreateChatInquiryBody,
  CreateChatInquiryResponse,
  CreatePhoneBookingBody,
  CreatePhoneBookingResponse,
  CreateReviewBody,
  CreateReviewResponse,
  CreateServiceRequestBody,
  CreateServiceRequestResponse,
  GetNotifyStatusResponse,
  GetServiceRequestSummaryResponse,
  GetSiteSettingsResponse,
  HealthCheckResponse,
  ListBookingsResponse,
  ListChatInquiriesResponse,
  ListReviewsResponse,
  ListServiceRequestsResponse,
  SendChatMessageBody,
  SendChatMessageResponse,
  UpdateBookingBody,
  UpdateBookingResponse,
  UpdateChatInquiryBody,
  UpdateChatInquiryResponse,
  UpdateServiceRequestBody,
  UpdateServiceRequestResponse,
  UpdateSiteSettingsBody,
  UpdateSiteSettingsResponse,
} from "@workspace/api-zod";
import { classifyReviewExcellence } from "./reviewClassifier";
import { getChatReply, type AssistantContext } from "./assistant";
import { isRateLimited, isActionRateLimited } from "./rate-limit";
import { transcribeAudio, isAllowedAudioType, MAX_AUDIO_BYTES } from "./transcribe";
import {
  mediaUrl,
  objectKey,
  parsePublished,
  parseSortOrder,
  readImageFile,
  readOptionalImageFile,
  serializeTask,
  type TaskRow,
} from "./tasks";
import {
  galleryObjectKey,
  serializeGalleryItem,
  type GalleryRow,
} from "./gallery";
import {
  parsePublishedJson,
  parseSortOrderJson,
  serializeFaq,
  type FaqRow,
} from "./faqs";
import { serializeService, type ServiceRow } from "./services";
import {
  CHAT_INQUIRY_RETENTION_DAYS,
  chatInquiryRetentionCutoffIso,
  purgeExpiredChatInquiries,
  serializeChatInquiry,
  type ChatInquiryRow,
  type StoredChatMessage,
} from "./inquiries";
import { parseLimitOffset } from "./pagination";
import { serializeBooking, type BookingRow } from "./bookings";
import {
  deleteRequestVideos,
  loadPhotoUrlsByRequestId,
  loadVideoUrlsByRequestId,
  MAX_SERVICE_REQUEST_PHOTOS,
  MAX_SERVICE_REQUEST_VIDEOS,
  readVideoFile,
  serializeServiceRequest,
  serializeServiceRequestWithPhotos,
  serviceRequestPhotoKey,
  serviceRequestVideoKey,
  type ServiceRequestRow,
} from "./service-requests";
import {
  getEmailNotifyStatus,
  notifyClientBookingConfirmed,
  notifyClientJobCompleted,
  notifyOwnerNewServiceRequest,
  readNotifySettings,
} from "./notify";
import { isPublicApiRoute } from "./api-guards";
import { isAdminHostname, keepPathBasedAdmin } from "./hosts";
import {
  getMe,
  handleGoogleCallback,
  logout,
  readSessionUser,
  sealSession,
  setSessionCookie,
  startGoogleOAuth,
  type AuthVariables,
} from "./auth";
import {
  createUser,
  deleteUser,
  findUserByEmail,
  listUsers,
  serializeUser,
  updateUser,
  type UserRole,
  type UserStatus,
} from "./users";

type Env = {
  DB: D1Database;
  ASSETS: Fetcher;
  RATE_LIMIT: KVNamespace;
  MEDIA: R2Bucket;
  EMAIL?: {
    send: (msg: {
      to: string | string[];
      from: { email: string; name?: string } | string;
      subject: string;
      html?: string;
      text?: string;
      replyTo?: string;
    }) => Promise<{ messageId?: string }>;
  };
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_FROM_NUMBER?: string;
  ENVIRONMENT: string;
  /** Production admin dashboard origin, e.g. https://admin.sample-handyman.samples.creativecoders.tech */
  ADMIN_ORIGIN?: string;
  /** Public marketing site origin, e.g. https://sample-handyman.com */
  PUBLIC_ORIGIN?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  SESSION_SECRET?: string;
  /** Google Places API key for syncing reviews from the Place Details endpoint */
  GOOGLE_PLACES_API_KEY?: string;
  /** Workers AI binding for speech-to-text (Whisper) */
  AI?: { run: (model: string, input: Record<string, unknown>) => Promise<unknown> };
};

const DEFAULT_ADMIN_ORIGIN = "https://admin.sample-handyman.samples.creativecoders.tech";

function adminOrigin(env: Env): string {
  return (env.ADMIN_ORIGIN || DEFAULT_ADMIN_ORIGIN).replace(/\/$/, "");
}

type ReviewRow = {
  id: number;
  name: string;
  location: string | null;
  service: string | null;
  rating: number;
  text: string;
  approved: number; // 0 = pending, 1 = approved
  created_at: string;
};

const serializeReview = (r: ReviewRow) => ({
  id: r.id,
  name: r.name,
  location: r.location,
  service: r.service,
  rating: r.rating,
  text: r.text,
  approved: r.approved === 1,
  createdAt: r.created_at,
});

type GoogleReviewRow = {
  id: number;
  author_name: string;
  author_photo_url: string | null;
  rating: number;
  text: string;
  google_time: number;
  synced_at: string;
};

const serializeGoogleReview = (r: GoogleReviewRow) => ({
  id: r.id,
  authorName: r.author_name,
  authorPhotoUrl: r.author_photo_url || null,
  rating: r.rating,
  text: r.text,
  googleTime: r.google_time,
  syncedAt: r.synced_at,
});

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// Disable all caching in dev so every page load fetches fresh JS/CSS.
app.use("*", async (c, next) => {
  await next();
  if (c.env.ENVIRONMENT === "dev") {
    c.res.headers.set("Cache-Control", "no-store");
  }
});

app.use(
  "/api/*",
  cors({
    origin: (origin) => origin || "*",
    credentials: true,
  }),
);

/** Auth gate for non-public admin APIs. */
app.use("/api/*", async (c, next) => {
  const url = new URL(c.req.url);
  if (isPublicApiRoute(c.req.method, url.pathname, url.search)) {
    return next();
  }
  const path = url.pathname;

  const user = await readSessionUser(c);
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  c.set("user", user);

  if (path === "/api/users" || path.startsWith("/api/users/")) {
    if (user.role !== "super_admin") {
      return c.json({ error: "Forbidden" }, 403);
    }
  }

  return next();
});

app.get("/api/auth/google", (c) => startGoogleOAuth(c));
app.get("/api/auth/callback", (c) => handleGoogleCallback(c));
app.get("/api/auth/me", (c) => getMe(c));
app.post("/api/auth/logout", (c) => logout(c));

/** Returns the current environment so the frontend can show dev-only UI. */
app.get("/api/auth/env", (c) => {
  return c.json({ environment: c.env.ENVIRONMENT ?? "production" });
});

/**
 * Dev-only bypass: sign in as the seeded super_admin without Google OAuth.
 * Hard-blocked in production — never reachable on the live site.
 */
app.get("/api/auth/dev-login", async (c) => {
  if (c.env.ENVIRONMENT !== "dev") {
    return c.json({ error: "Not available outside the dev environment" }, 403);
  }
  const secret = c.env.SESSION_SECRET;
  if (!secret) {
    return c.json(
      { error: "SESSION_SECRET is not set. Add it to .dev.vars or wrangler secrets." },
      500,
    );
  }
  const user = await c.env.DB.prepare(
    "SELECT * FROM users WHERE role = 'super_admin' AND status = 'active' ORDER BY is_system DESC, id ASC LIMIT 1",
  ).first<{ id: number; email: string; role: string }>();
  if (!user) {
    return c.json(
      { error: "No active super_admin found. Run: wrangler d1 migrations apply sample-handyman-db-dev --local --env dev" },
      500,
    );
  }
  const token = await sealSession(secret, {
    userId: user.id,
    email: user.email,
    role: user.role as "super_admin",
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 8, // 8-hour dev session
  });
  setSessionCookie(c, token);
  // Redirect to /admin?ok=1 rather than /admin — the query string bypasses any
  // browser-cached 301 redirect that may point /admin to the production domain.
  const res = c.redirect("/admin?ok=1", 302);
  res.headers.set("Cache-Control", "no-store");
  return res;
});

app.get("/api/users", async (c) => {
  const rows = await listUsers(c.env.DB);
  return c.json({ users: rows.map(serializeUser) });
});

app.post("/api/users", async (c) => {
  const actor = c.get("user");
  const body = await c.req.json().catch(() => null);
  const email =
    typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const role = body?.role as UserRole | undefined;
  const name = typeof body?.name === "string" ? body.name.trim() : undefined;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return c.json({ error: "Valid email is required" }, 400);
  }
  if (role !== "admin" && role !== "member") {
    return c.json({ error: "Role must be admin or member" }, 400);
  }

  const existing = await findUserByEmail(c.env.DB, email);
  if (existing) {
    return c.json({ error: "A user with that email already exists" }, 409);
  }

  const created = await createUser(c.env.DB, {
    email,
    role,
    name,
    createdBy: actor.id,
  });

  return c.json({ user: serializeUser(created) }, 201);
});

app.patch("/api/users/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isFinite(id)) return c.json({ error: "Invalid id" }, 400);

  const body = await c.req.json().catch(() => null);
  const patch: {
    name?: string | null;
    role?: "admin" | "member";
    status?: UserStatus;
  } = {};

  if (body?.name !== undefined) {
    patch.name =
      typeof body.name === "string" ? body.name.trim() || null : null;
  }
  if (body?.role !== undefined) {
    if (body.role !== "admin" && body.role !== "member") {
      return c.json({ error: "Role must be admin or member" }, 400);
    }
    patch.role = body.role;
  }
  if (body?.status !== undefined) {
    if (!["invited", "active", "disabled"].includes(body.status)) {
      return c.json({ error: "Invalid status" }, 400);
    }
    patch.status = body.status;
  }

  const updated = await updateUser(c.env.DB, id, patch);
  if (!updated) {
    return c.json(
      { error: "User not found or protected system Super Admin" },
      404,
    );
  }
  return c.json({ user: serializeUser(updated) });
});

app.delete("/api/users/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isFinite(id)) return c.json({ error: "Invalid id" }, 400);
  const actor = c.get("user");
  if (actor.id === id) {
    return c.json({ error: "You cannot delete your own account" }, 400);
  }
  const ok = await deleteUser(c.env.DB, id);
  if (!ok) {
    return c.json(
      { error: "User not found or protected system Super Admin" },
      404,
    );
  }
  return c.json({ ok: true });
});

/**
 * /admin path handling:
 * - admin subdomain → redirect to `/` (dashboard lives at the root)
 * - local / dev → serve SPA (path-based admin for DX)
 * - production marketing host → redirect to admin subdomain root
 */
/** Fetch index.html from ASSETS and strip caching in dev. */
/**
 * In dev: auto-create a super_admin session if none exists, then serve the
 * SPA with no-store headers so the browser never caches the HTML.
 * In production: serve the SPA as-is (the React app handles auth state).
 */
async function serveAdminSpa(c: any): Promise<Response> {
  const url = new URL(c.req.url);
  url.pathname = "/";
  const res = await c.env.ASSETS.fetch(new Request(url.toString(), c.req.raw));
  const isDev = c.env.ENVIRONMENT === "dev";

  // Always apply security headers; add Cache-Control: no-store only in dev.
  const headers = applySecurityHeaders(res.headers, isDev);
  if (!isDev) {
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
  }

  // Dev auto-login: if the request has no valid session, stamp a super_admin
  // session cookie directly on this response. We must append Set-Cookie on
  // the returned Response ourselves — Hono's setCookie(c, ...) headers are
  // lost when a handler returns a raw Response object.
  const existing = await readSessionUser(c);
  if (!existing && c.env.SESSION_SECRET) {
    const user = await c.env.DB.prepare(
      "SELECT * FROM users WHERE role = 'super_admin' AND status = 'active' ORDER BY id ASC LIMIT 1",
    ).first<{ id: number; email: string; role: string }>();
    if (user) {
      const token = await sealSession(c.env.SESSION_SECRET, {
        userId: user.id,
        email: user.email,
        role: user.role as "super_admin",
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 8,
      });
      const secure = new URL(c.req.url).protocol === "https:" ? "; Secure" : "";
      headers.append(
        "Set-Cookie",
        `pl_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 8}${secure}`,
      );
    }
  }

  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

app.get("/admin", async (c) => {
  const hostname = new URL(c.req.url).hostname;
  if (isAdminHostname(hostname)) return c.redirect("/", 302);
  if (keepPathBasedAdmin(hostname, c.env.ENVIRONMENT)) return serveAdminSpa(c);
  return c.redirect(`${adminOrigin(c.env)}/`, 302);
});
app.get("/admin/*", async (c) => {
  const hostname = new URL(c.req.url).hostname;
  if (isAdminHostname(hostname)) return c.redirect("/", 302);
  if (keepPathBasedAdmin(hostname, c.env.ENVIRONMENT)) return serveAdminSpa(c);
  return c.redirect(`${adminOrigin(c.env)}/`, 302);
});

app.get("/api/healthz", (c) => {
  c.header("X-Sample-Handyman-Env", c.env.ENVIRONMENT || "production");
  return c.json(HealthCheckResponse.parse({ status: "ok" }));
});

// --- Service requests (pending leads) ---

app.get("/api/service-requests", async (c) => {
  const status = c.req.query("status") ?? "open";
  const { limit, offset } = parseLimitOffset(
    {
      limit: c.req.query("limit"),
      offset: c.req.query("offset"),
    },
    { limit: 20 },
  );
  const allowed = new Set([
    "open",
    "pending",
    "contacted",
    "converted",
    "declined",
    "all",
  ]);
  const filter = allowed.has(status) ? status : "open";

  let where = "";
  const binds: string[] = [];
  if (filter === "open") {
    where = "WHERE status IN ('pending', 'contacted')";
  } else if (filter !== "all") {
    where = "WHERE status = ?";
    binds.push(filter);
  }

  const countRow = await c.env.DB.prepare(
    `SELECT COUNT(*) AS total FROM service_requests ${where}`,
  )
    .bind(...binds)
    .first<{ total: number }>();
  const pendingRow = await c.env.DB.prepare(
    "SELECT COUNT(*) AS total FROM service_requests WHERE status = 'pending'",
  ).first<{ total: number }>();
  const { results } = await c.env.DB.prepare(
    `SELECT * FROM service_requests ${where}
     ORDER BY
       CASE urgency WHEN 'urgent' THEN 0 WHEN 'soon' THEN 1 ELSE 2 END,
       created_at DESC,
       id DESC
     LIMIT ? OFFSET ?`,
  )
    .bind(...binds, limit, offset)
    .all<ServiceRequestRow>();
  const rows = results ?? [];
  const ids = rows.map((r) => r.id);
  const [photoMap, videoMap] = await Promise.all([
    loadPhotoUrlsByRequestId(c.env.DB, ids),
    loadVideoUrlsByRequestId(c.env.DB, ids),
  ]);
  return c.json(
    ListServiceRequestsResponse.parse({
      items: rows.map((r) =>
        serializeServiceRequest(r, photoMap.get(r.id) ?? [], videoMap.get(r.id) ?? []),
      ),
      total: Number(countRow?.total ?? 0),
      limit,
      offset,
      pendingCount: Number(pendingRow?.total ?? 0),
    }),
  );
});

app.get("/api/service-requests/summary", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT service, COUNT(*) as count FROM service_requests GROUP BY service",
  ).all<{ service: string; count: number }>();
  const pendingRow = await c.env.DB.prepare(
    "SELECT COUNT(*) AS total FROM service_requests WHERE status = 'pending'",
  ).first<{ total: number }>();
  const byService = (results ?? []).map((row) => ({
    service: row.service,
    count: Number(row.count),
  }));
  const totalRequests = byService.reduce((acc, row) => acc + row.count, 0);
  return c.json(
    GetServiceRequestSummaryResponse.parse({
      totalRequests,
      pendingCount: Number(pendingRow?.total ?? 0),
      byService,
    }),
  );
});

app.post("/api/service-requests", async (c) => {
  const form = await c.req.formData().catch(() => null);
  if (!form) {
    return c.json({ error: "Expected multipart form data" }, 400);
  }

  const preferredTimeRaw = String(form.get("preferredTime") ?? "").trim();
  const urgencyRaw = String(form.get("urgency") ?? "flexible").trim();
  const parsed = CreateServiceRequestBody.safeParse({
    name: String(form.get("name") ?? "").trim(),
    email: String(form.get("email") ?? "").trim(),
    phone: String(form.get("phone") ?? "").trim(),
    service: String(form.get("service") ?? "").trim(),
    description: String(form.get("description") ?? "").trim(),
    urgency:
      urgencyRaw === "soon" || urgencyRaw === "urgent" || urgencyRaw === "flexible"
        ? urgencyRaw
        : "flexible",
    preferredDate: String(form.get("preferredDate") ?? "").trim() || undefined,
    preferredTime:
      preferredTimeRaw === "morning" ||
      preferredTimeRaw === "afternoon" ||
      preferredTimeRaw === "evening"
        ? preferredTimeRaw
        : undefined,
  });
  if (!parsed.success) {
    return c.json({ error: parsed.error.message }, 400);
  }

  const photoEntries = form
    .getAll("photos")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);
  if (photoEntries.length > MAX_SERVICE_REQUEST_PHOTOS) {
    return c.json(
      { error: `At most ${MAX_SERVICE_REQUEST_PHOTOS} photos allowed` },
      400,
    );
  }

  const photos: Array<{
    bytes: ArrayBuffer;
    contentType: string;
    ext: string;
  }> = [];
  for (let i = 0; i < photoEntries.length; i++) {
    const read = await readImageFile(photoEntries[i], `photos[${i}]`);
    if ("error" in read) {
      return c.json({ error: read.error }, 400);
    }
    photos.push(read);
  }

  const videoEntries = form
    .getAll("videos")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);
  if (videoEntries.length > MAX_SERVICE_REQUEST_VIDEOS) {
    return c.json(
      { error: `At most ${MAX_SERVICE_REQUEST_VIDEOS} videos allowed` },
      400,
    );
  }

  const videos: Array<{
    file: File;
    contentType: string;
    ext: string;
  }> = [];
  for (let i = 0; i < videoEntries.length; i++) {
    const read = await readVideoFile(videoEntries[i], `videos[${i}]`);
    if ("error" in read) {
      return c.json({ error: read.error }, 400);
    }
    videos.push(read);
  }

  const {
    name,
    email,
    phone,
    service,
    description,
    urgency,
    preferredDate,
    preferredTime,
  } = parsed.data;

  const jobStreet = String(form.get("jobStreet") ?? "").trim();
  const jobCity = String(form.get("jobCity") ?? "").trim();
  const jobZipRaw = String(form.get("jobZip") ?? "").trim();

  if (!jobStreet) {
    return c.json({ error: "Street address is required" }, 400);
  }
  if (!jobCity) {
    return c.json({ error: "City is required" }, 400);
  }
  if (jobZipRaw && !/^\d{5}$/.test(jobZipRaw)) {
    return c.json({ error: "ZIP code must be 5 digits" }, 400);
  }
  if (jobZipRaw && jobZipRaw[0] !== "7") {
    return c.json(
      {
        error:
          "That ZIP is outside Texas — we serve the Greater Austin Area. Call (512) 244-8550 to check availability.",
      },
      400,
    );
  }

  const jobAddress = jobZipRaw
    ? `${jobStreet}, ${jobCity}, TX ${jobZipRaw}`
    : `${jobStreet}, ${jobCity}, TX`;

  const result = await c.env.DB.prepare(
    `INSERT INTO service_requests
      (name, email, phone, service, description, preferred_date, preferred_time, urgency, status, source, job_address)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'web', ?)
     RETURNING *`,
  )
    .bind(
      name,
      email ?? null,
      phone,
      service,
      description,
      preferredDate ?? null,
      preferredTime ?? null,
      urgency ?? "flexible",
      jobAddress,
    )
    .first<ServiceRequestRow>();

  if (!result) {
    return c.json({ error: "Failed to create service request" }, 500);
  }

  const uploadedKeys: string[] = [];
  try {
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      const key = serviceRequestPhotoKey(result.id, photo.ext);
      await c.env.MEDIA.put(key, photo.bytes, {
        httpMetadata: { contentType: photo.contentType },
      });
      uploadedKeys.push(key);
      await c.env.DB.prepare(
        `INSERT INTO service_request_photos
          (service_request_id, image_key, sort_order)
         VALUES (?, ?, ?)`,
      )
        .bind(result.id, key, i)
        .run();
    }
    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];
      const key = serviceRequestVideoKey(result.id, video.ext);
      // Pass the File (Blob) directly so wrangler streams it to R2 without
      // materialising the full video body as an ArrayBuffer in Worker memory.
      await c.env.MEDIA.put(key, video.file, {
        httpMetadata: { contentType: video.contentType },
      });
      uploadedKeys.push(key);
      await c.env.DB.prepare(
        `INSERT INTO service_request_videos
          (service_request_id, video_key, sort_order)
         VALUES (?, ?, ?)`,
      )
        .bind(result.id, key, i)
        .run();
    }
  } catch (err) {
    console.error("Service request media upload failed", err);
    await Promise.all(
      uploadedKeys.map((key) => c.env.MEDIA.delete(key).catch(() => undefined)),
    );
    await c.env.DB.prepare(
      "DELETE FROM service_request_photos WHERE service_request_id = ?",
    )
      .bind(result.id)
      .run();
    await c.env.DB.prepare(
      "DELETE FROM service_request_videos WHERE service_request_id = ?",
    )
      .bind(result.id)
      .run();
    await c.env.DB.prepare("DELETE FROM service_requests WHERE id = ?")
      .bind(result.id)
      .run();
    return c.json({ error: "Failed to upload media" }, 500);
  }

  const serialized = await serializeServiceRequestWithPhotos(c.env.DB, result);
  c.executionCtx.waitUntil(
    notifyOwnerNewServiceRequest(c.env, {
      id: serialized.id,
      name: serialized.name,
      phone: serialized.phone,
      email: serialized.email ?? null,
      service: serialized.service,
      description: serialized.description,
      preferredDate: serialized.preferredDate ?? null,
      preferredTime: serialized.preferredTime ?? null,
      urgency: serialized.urgency,
      photoCount: serialized.photoUrls.length,
      jobAddress: serialized.jobAddress ?? null,
    }).catch((err) => console.error("Owner notify failed", err)),
  );

  return c.json(CreateServiceRequestResponse.parse(serialized), 201);
});

app.patch("/api/service-requests/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isFinite(id) || id < 1) {
    return c.json({ error: "Invalid service request id" }, 400);
  }
  const body = await c.req.json().catch(() => null);
  const parsed = UpdateServiceRequestBody.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.message }, 400);
  }

  const existing = await c.env.DB.prepare(
    "SELECT * FROM service_requests WHERE id = ?",
  )
    .bind(id)
    .first<ServiceRequestRow>();
  if (!existing) {
    return c.json({ error: "Service request not found" }, 404);
  }
  if (existing.status === "converted") {
    return c.json({ error: "Converted requests cannot change status" }, 409);
  }

  const updated = await c.env.DB.prepare(
    `UPDATE service_requests
     SET status = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     WHERE id = ?
     RETURNING *`,
  )
    .bind(parsed.data.status, id)
    .first<ServiceRequestRow>();

  if (!updated) {
    return c.json({ error: "Failed to update service request" }, 500);
  }

  // Auto-delete videos when a request is declined.
  // Scheduled via waitUntil so cleanup never blocks the status-update response.
  // deleteRequestVideos keeps DB rows for any R2 object it couldn't delete, so
  // re-PATCHing with status=declined retries the cleanup automatically.
  if (parsed.data.status === "declined") {
    c.executionCtx.waitUntil(
      deleteRequestVideos(c.env.DB, c.env.MEDIA, id).catch((err) =>
        console.error("Video cleanup partial failure (declined):", err),
      ),
    );
  }

  return c.json(
    UpdateServiceRequestResponse.parse(
      await serializeServiceRequestWithPhotos(c.env.DB, updated),
    ),
  );
});

/** Admin: record a booking that came in via phone call (create + confirm in one step). */
app.post("/api/service-requests/phone", async (c) => {
  const PARSE_FAILED = Symbol();
  const body = await c.req.json().catch(() => PARSE_FAILED as unknown);
  if (body === PARSE_FAILED) {
    return c.json({ error: "Request body must be valid JSON" }, 400);
  }
  const parsed = CreatePhoneBookingBody.safeParse(body);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`);
    return c.json({ error: "Validation failed", details: issues }, 422);
  }

  // Validate specific slot belongs to the chosen window.
  const WINDOW_SLOTS: Record<string, string[]> = {
    morning:   ["9:00 AM","9:30 AM","10:00 AM","10:30 AM","11:00 AM","11:30 AM"],
    afternoon: ["12:00 PM","12:30 PM","1:00 PM","1:30 PM","2:00 PM","2:30 PM","3:00 PM","3:30 PM","4:00 PM","4:30 PM"],
    evening:   ["5:00 PM","5:30 PM","6:00 PM","6:30 PM","7:00 PM","7:30 PM"],
  };
  const specificTime = parsed.data.scheduledSpecificTime ?? null;
  if (specificTime !== null && specificTime !== "") {
    const allowed = WINDOW_SLOTS[parsed.data.scheduledTime] ?? [];
    if (!allowed.includes(specificTime)) {
      return c.json(
        { error: `"${specificTime}" is not a valid slot for the ${parsed.data.scheduledTime} window` },
        400,
      );
    }
  }

  const { name, phone, email, service, description, preferredDate, preferredTime,
          scheduledDate, scheduledTime, scheduledSpecificTime } = parsed.data;

  // Insert service request (source=phone, status=converted — already confirmed on the call).
  const serviceRequest = await c.env.DB.prepare(
    `INSERT INTO service_requests
      (name, email, phone, service, description, preferred_date, preferred_time, urgency, status, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'flexible', 'converted', 'phone')
     RETURNING *`,
  )
    .bind(name, email ?? null, phone, service, description, preferredDate ?? null, preferredTime ?? null)
    .first<ServiceRequestRow>();

  if (!serviceRequest) {
    return c.json({ error: "Failed to create service request" }, 500);
  }

  // Insert booking linked to the service request.
  const booking = await c.env.DB.prepare(
    `INSERT INTO bookings (
      service_request_id, name, email, phone, service, description,
      scheduled_date, scheduled_time, scheduled_specific_time, status, source
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', 'phone')
    RETURNING *`,
  )
    .bind(
      serviceRequest.id,
      name, email ?? null, phone, service, description,
      scheduledDate, scheduledTime, scheduledSpecificTime ?? null,
    )
    .first<BookingRow>();

  if (!booking) {
    return c.json({ error: "Failed to create booking" }, 500);
  }

  const serializedBooking = serializeBooking(booking);
  const notify = await notifyClientBookingConfirmed(c.env, {
    name: serializedBooking.name,
    phone: serializedBooking.phone,
    email: serializedBooking.email ?? null,
    service: serializedBooking.service,
    scheduledDate: serializedBooking.scheduledDate,
    scheduledTime: serializedBooking.scheduledTime,
    scheduledSpecificTime: serializedBooking.scheduledSpecificTime ?? null,
  });

  return c.json(
    CreatePhoneBookingResponse.parse({
      booking: serializedBooking,
      notifications: {
        emailSent: notify.emailSent,
        smsSent: notify.smsSent,
        warning: notify.warning ?? null,
      },
    }),
    201,
  );
});

app.post("/api/service-requests/:id/confirm", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isFinite(id) || id < 1) {
    return c.json({ error: "Invalid service request id" }, 400);
  }
  const PARSE_FAILED = Symbol();
  const body = await c.req.json().catch(() => PARSE_FAILED as unknown);
  if (body === PARSE_FAILED) {
    return c.json({ error: "Request body must be valid JSON" }, 400);
  }
  const parsed = ConfirmServiceRequestBody.safeParse(body);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`);
    return c.json({ error: "Validation failed", details: issues }, 422);
  }

  // Validate that the specific time, if supplied, belongs to the chosen window.
  const WINDOW_SLOTS: Record<string, string[]> = {
    morning:   ["9:00 AM","9:30 AM","10:00 AM","10:30 AM","11:00 AM","11:30 AM"],
    afternoon: ["12:00 PM","12:30 PM","1:00 PM","1:30 PM","2:00 PM","2:30 PM","3:00 PM","3:30 PM","4:00 PM","4:30 PM"],
    evening:   ["5:00 PM","5:30 PM","6:00 PM","6:30 PM","7:00 PM","7:30 PM"],
  };
  const specificTime = parsed.data.scheduledSpecificTime ?? null;
  if (specificTime !== null && specificTime !== "") {
    const allowed = WINDOW_SLOTS[parsed.data.scheduledTime] ?? [];
    if (!allowed.includes(specificTime)) {
      return c.json(
        { error: `"${specificTime}" is not a valid slot for the ${parsed.data.scheduledTime} window` },
        400,
      );
    }
  }

  const existing = await c.env.DB.prepare(
    "SELECT * FROM service_requests WHERE id = ?",
  )
    .bind(id)
    .first<ServiceRequestRow>();
  if (!existing) {
    return c.json({ error: "Service request not found" }, 404);
  }
  if (existing.status === "converted") {
    return c.json({ error: "Request already converted to a booking" }, 409);
  }
  if (existing.status === "declined") {
    return c.json({ error: "Declined requests cannot be confirmed" }, 409);
  }

  const booking = await c.env.DB.prepare(
    `INSERT INTO bookings (
      service_request_id, name, email, phone, service, description,
      scheduled_date, scheduled_time, scheduled_specific_time, status, source
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', 'web')
    RETURNING *`,
  )
    .bind(
      existing.id,
      existing.name,
      existing.email,
      existing.phone,
      existing.service,
      existing.description,
      parsed.data.scheduledDate,
      parsed.data.scheduledTime,
      parsed.data.scheduledSpecificTime ?? null,
    )
    .first<BookingRow>();

  if (!booking) {
    return c.json({ error: "Failed to create booking" }, 500);
  }

  const updatedRequest = await c.env.DB.prepare(
    `UPDATE service_requests
     SET status = 'converted', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     WHERE id = ?
     RETURNING *`,
  )
    .bind(id)
    .first<ServiceRequestRow>();

  if (!updatedRequest) {
    return c.json({ error: "Booking created but failed to update request" }, 500);
  }

  // Videos served their purpose — the job is booked. Delete them to reclaim R2 space.
  // Scheduled via waitUntil so cleanup never blocks the confirm response.
  // deleteRequestVideos keeps DB rows for any R2 object it couldn't delete;
  // re-PATCHing the request with status=declined retries the remaining objects.
  c.executionCtx.waitUntil(
    deleteRequestVideos(c.env.DB, c.env.MEDIA, id).catch((err) =>
      console.error("Video cleanup partial failure (converted):", err),
    ),
  );

  const serializedBooking = serializeBooking(booking);
  const serializedRequest = await serializeServiceRequestWithPhotos(
    c.env.DB,
    updatedRequest,
  );
  const notify = await notifyClientBookingConfirmed(c.env, {
    name: serializedBooking.name,
    phone: serializedBooking.phone,
    email: serializedBooking.email ?? null,
    service: serializedBooking.service,
    scheduledDate: serializedBooking.scheduledDate,
    scheduledTime: serializedBooking.scheduledTime,
    scheduledSpecificTime: serializedBooking.scheduledSpecificTime ?? null,
  });

  return c.json(
    ConfirmServiceRequestResponse.parse({
      booking: serializedBooking,
      serviceRequest: serializedRequest,
      notifications: {
        emailSent: notify.emailSent,
        smsSent: notify.smsSent,
        warning: notify.warning ?? null,
      },
    }),
    201,
  );
});

// --- Confirmed bookings (schedule) ---

app.get("/api/bookings", async (c) => {
  const from = c.req.query("from");
  const to = c.req.query("to");
  const clauses: string[] = [];
  const binds: string[] = [];
  if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) {
    clauses.push("scheduled_date >= ?");
    binds.push(from);
  }
  if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
    clauses.push("scheduled_date <= ?");
    binds.push(to);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const stmt = c.env.DB.prepare(
    `SELECT * FROM bookings ${where}
     ORDER BY scheduled_date ASC, scheduled_time ASC, id ASC`,
  );
  const { results } = binds.length
    ? await stmt.bind(...binds).all<BookingRow>()
    : await stmt.all<BookingRow>();
  return c.json(
    ListBookingsResponse.parse((results ?? []).map(serializeBooking)),
  );
});

app.patch("/api/bookings/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isFinite(id) || id < 1) {
    return c.json({ error: "Invalid booking id" }, 400);
  }
  const body = await c.req.json().catch(() => null);
  const parsed = UpdateBookingBody.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.message }, 400);
  }

  const existing = await c.env.DB.prepare("SELECT id FROM bookings WHERE id = ?")
    .bind(id)
    .first<{ id: number }>();
  if (!existing) {
    return c.json({ error: "Booking not found" }, 404);
  }

  // When moving to "completed", claim the transition atomically (the WHERE
  // status filter guarantees exactly one request wins even under concurrent
  // PATCHes) — the winner owns sending the thank-you email below.
  const toCompleted = parsed.data.status === "completed";
  let ownsCompletionTransition = false;
  let updated: BookingRow | null = null;
  if (toCompleted) {
    updated = await c.env.DB.prepare(
      `UPDATE bookings
       SET status = 'completed', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
       WHERE id = ? AND status != 'completed'
       RETURNING *`,
    )
      .bind(id)
      .first<BookingRow>();
    ownsCompletionTransition = updated !== null;
  }
  if (!updated) {
    // Not a completion transition (other status, or already completed —
    // keep the PATCH idempotent for the losers/repeats).
    updated = await c.env.DB.prepare(
      `UPDATE bookings
       SET status = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
       WHERE id = ?
       RETURNING *`,
    )
      .bind(parsed.data.status, id)
      .first<BookingRow>();
  }

  if (!updated) {
    return c.json({ error: "Failed to update booking" }, 500);
  }

  // Thank-you + review-request email, only on the transition INTO completed
  // (repeat "completed" updates must not re-send). Fire-safe: never blocks
  // or fails the status update.
  if (ownsCompletionTransition) {
    c.executionCtx.waitUntil(
      notifyClientJobCompleted(c.env, {
        name: updated.name,
        email: updated.email,
        service: updated.service,
      })
        .then((r) => {
          if (r.warning) console.warn("Completion email:", r.warning);
        })
        .catch((err) => console.error("Completion email failed", err)),
    );
  }

  return c.json(UpdateBookingResponse.parse(serializeBooking(updated)));
});

app.get("/api/reviews", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM reviews WHERE approved = 1 ORDER BY created_at DESC",
  ).all<ReviewRow>();
  return c.json(ListReviewsResponse.parse((results ?? []).map(serializeReview)));
});

// ── Voice-to-text transcription (public booking + review forms) ──────────────
app.post("/api/transcribe", async (c) => {
  const ip =
    c.req.header("cf-connecting-ip") ??
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";

  // Max 10 transcriptions per IP per 10 minutes.
  if (await isActionRateLimited(c.env.RATE_LIMIT, "transcribe", ip, 10, 10 * 60 * 1000)) {
    return c.json({ error: "Too many recordings. Please try again later." }, 429);
  }

  const contentType = c.req.header("content-type") ?? "";
  if (!isAllowedAudioType(contentType)) {
    return c.json({ error: "Unsupported audio format." }, 400);
  }

  // Reject oversized uploads before buffering the body.
  const declaredLength = Number(c.req.header("content-length") ?? "0");
  if (!Number.isFinite(declaredLength) || declaredLength <= 0) {
    return c.json({ error: "Empty recording." }, 400);
  }
  if (declaredLength > MAX_AUDIO_BYTES) {
    return c.json({ error: "Recording too large (max 5 MB)." }, 413);
  }

  const audio = await c.req.arrayBuffer();
  if (audio.byteLength === 0) {
    return c.json({ error: "Empty recording." }, 400);
  }
  if (audio.byteLength > MAX_AUDIO_BYTES) {
    return c.json({ error: "Recording too large (max 5 MB)." }, 413);
  }

  try {
    const text = await transcribeAudio(c.env, audio, contentType);
    return c.json({ text });
  } catch (err) {
    console.error("Transcription failed:", err);
    return c.json(
      { error: "Couldn't transcribe that recording. Please try again or type instead." },
      502,
    );
  }
});

app.post("/api/reviews", async (c) => {
  const ip =
    c.req.header("cf-connecting-ip") ??
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";

  if (await isRateLimited(c.env.RATE_LIMIT, ip)) {
    return c.json(
      { error: "Too many reviews submitted. Please try again later." },
      429,
    );
  }

  const body = await c.req.json().catch(() => null);
  const parsed = CreateReviewBody.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.message }, 400);
  }

  const name = parsed.data.name.trim();
  const location = parsed.data.location?.trim();
  const service = parsed.data.service?.trim();
  const text = parsed.data.text.trim();
  const rating = Math.round(parsed.data.rating);

  if (!name || text.length < 10) {
    return c.json({ error: "Name and review text are required." }, 400);
  }

  // Advisory verdict for the frontend (Google handoff prompt). Runs
  // concurrently with the insert to keep submission latency low; it is
  // internally capped (~2.5 s) and never throws — falls back to a heuristic.
  const excellentPromise = classifyReviewExcellence(
    c.env.AI,
    rating,
    text,
  );

  const result = await c.env.DB.prepare(
    `INSERT INTO reviews (name, location, service, rating, text, approved)
     VALUES (?, ?, ?, ?, ?, 0)
     RETURNING *`,
  )
    .bind(name, location || null, service || null, rating, text)
    .first<ReviewRow>();

  if (!result) {
    return c.json({ error: "Failed to create review" }, 500);
  }

  const excellent = await excellentPromise;

  return c.json(
    CreateReviewResponse.parse({ ...serializeReview(result), excellent }),
    201,
  );
});

// ── Google Reviews (public — synced by daily cron from Places API) ────────────

app.get("/api/google-reviews", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM google_reviews WHERE text != '' ORDER BY google_time DESC LIMIT 10",
  ).all<GoogleReviewRow>();
  return c.json((results ?? []).map(serializeGoogleReview));
});

// ── Admin review moderation routes ────────────────────────────────────────────
// All three require an authenticated session (handled by the /api/* middleware).

app.get("/api/admin/reviews", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM reviews ORDER BY approved ASC, created_at DESC",
  ).all<ReviewRow>();
  return c.json({ reviews: (results ?? []).map(serializeReview) });
});

app.put("/api/admin/reviews/:id/approve", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isFinite(id)) return c.json({ error: "Invalid id" }, 400);
  const updated = await c.env.DB.prepare(
    "UPDATE reviews SET approved = 1 WHERE id = ? RETURNING *",
  )
    .bind(id)
    .first<ReviewRow>();
  if (!updated) return c.json({ error: "Review not found" }, 404);
  return c.json({ review: serializeReview(updated) });
});

app.put("/api/admin/reviews/:id/unapprove", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isFinite(id)) return c.json({ error: "Invalid id" }, 400);
  const updated = await c.env.DB.prepare(
    "UPDATE reviews SET approved = 0 WHERE id = ? RETURNING *",
  )
    .bind(id)
    .first<ReviewRow>();
  if (!updated) return c.json({ error: "Review not found" }, 404);
  return c.json({ review: serializeReview(updated) });
});

app.delete("/api/admin/reviews/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isFinite(id)) return c.json({ error: "Invalid id" }, 400);
  await c.env.DB.prepare("DELETE FROM reviews WHERE id = ?").bind(id).run();
  return c.body(null, 204);
});

async function persistInquiryMessages(
  db: D1Database,
  inquiryId: number,
  messages: StoredChatMessage[],
) {
  await db
    .prepare(
      `UPDATE chat_inquiries
       SET messages_json = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
       WHERE id = ?`,
    )
    .bind(JSON.stringify(messages), inquiryId)
    .run();
}

app.post("/api/chat", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = SendChatMessageBody.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.message }, 400);
  }

  if (parsed.data.messages.length === 0) {
    return c.json({ error: "messages must not be empty" }, 400);
  }

  // Stale browser sessions can hold deleted inquiry IDs — still answer the chat.
  let inquiryId = parsed.data.inquiryId ?? null;
  let inquiryOrphaned = false;
  if (inquiryId != null) {
    const existing = await c.env.DB.prepare(
      "SELECT id FROM chat_inquiries WHERE id = ?",
    )
      .bind(inquiryId)
      .first<{ id: number }>();
    if (!existing) {
      console.warn("Chat inquiry missing; continuing without transcript persist", {
        inquiryId,
      });
      inquiryId = null;
      inquiryOrphaned = true;
    }
  }

  const history = parsed.data.messages.map((m) => ({
    role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
    content: m.content,
  }));

  // Fetch live context from D1 in parallel — services, FAQs, phone setting.
  const [serviceRows, faqRows, phoneRow] = await Promise.all([
    c.env.DB.prepare(
      "SELECT title, description FROM services WHERE published = 1 ORDER BY sort_order ASC, id ASC",
    ).all<{ title: string; description: string }>(),
    c.env.DB.prepare(
      "SELECT question, answer FROM faqs WHERE published = 1 ORDER BY sort_order ASC, id ASC",
    ).all<{ question: string; answer: string }>(),
    c.env.DB.prepare("SELECT value FROM site_settings WHERE key = 'phone'")
      .first<{ value: string }>(),
  ]);

  const ctx: AssistantContext = {
    services: serviceRows.results ?? [],
    faqs: faqRows.results ?? [],
    phone: phoneRow?.value?.trim() || "(512) 244-8550",
    bookingUrl: `${new URL(c.req.url).origin}/#booking`,
  };

  if (!c.env.AI) {
    return c.json(
      { error: "The assistant is temporarily unavailable." },
      503,
    );
  }

  try {
    const reply = await getChatReply(c.env.AI, history, ctx);
    if (inquiryId != null) {
      await persistInquiryMessages(c.env.DB, inquiryId, [
        ...history,
        { role: "assistant", content: reply },
      ]);
    }
    return c.json(
      SendChatMessageResponse.parse({ reply, inquiryOrphaned: inquiryOrphaned || undefined }),
    );
  } catch (err) {
    console.error("Chat completion failed", err);
    if (inquiryId != null) {
      try {
        await persistInquiryMessages(c.env.DB, inquiryId, history);
      } catch (persistErr) {
        console.error("Failed to persist chat inquiry after AI error", persistErr);
      }
    }
    return c.json(
      { error: "The assistant is unavailable right now. Please try again." },
      500,
    );
  }
});

// --- Chat inquiries (write APIs unauthenticated for now) ---

app.get("/api/chat/inquiries", async (c) => {
  const { limit, offset } = parseLimitOffset(
    {
      limit: c.req.query("limit"),
      offset: c.req.query("offset"),
    },
    { limit: 20 },
  );
  // Drop expired rows on read so admin never sees >7 days even before cron runs.
  await purgeExpiredChatInquiries(c.env.DB);
  const cutoff = chatInquiryRetentionCutoffIso();
  const countRow = await c.env.DB.prepare(
    "SELECT COUNT(*) AS total FROM chat_inquiries WHERE created_at >= ?",
  )
    .bind(cutoff)
    .first<{ total: number }>();
  const { results } = await c.env.DB.prepare(
    `SELECT * FROM chat_inquiries
     WHERE created_at >= ?
     ORDER BY created_at DESC, id DESC
     LIMIT ? OFFSET ?`,
  )
    .bind(cutoff, limit, offset)
    .all<ChatInquiryRow>();
  return c.json(
    ListChatInquiriesResponse.parse({
      items: (results ?? []).map(serializeChatInquiry),
      total: Number(countRow?.total ?? 0),
      limit,
      offset,
    }),
  );
});

app.post("/api/chat/inquiries", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = CreateChatInquiryBody.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.message }, 400);
  }

  const name = parsed.data.name.trim();
  const phoneRaw = parsed.data.phone?.trim() ?? "";
  const phone = phoneRaw.length > 0 ? phoneRaw : null;

  if (!name) {
    return c.json({ error: "Name is required" }, 400);
  }

  const result = await c.env.DB.prepare(
    `INSERT INTO chat_inquiries (name, phone, messages_json)
     VALUES (?, ?, '[]')
     RETURNING *`,
  )
    .bind(name, phone)
    .first<ChatInquiryRow>();

  if (!result) {
    return c.json({ error: "Failed to create chat inquiry" }, 500);
  }

  return c.json(
    CreateChatInquiryResponse.parse(serializeChatInquiry(result)),
    201,
  );
});

app.patch("/api/chat/inquiries/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isFinite(id) || id < 1) {
    return c.json({ error: "Invalid inquiry id" }, 400);
  }

  const body = await c.req.json().catch(() => null);
  const parsed = UpdateChatInquiryBody.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.message }, 400);
  }

  const existing = await c.env.DB.prepare(
    "SELECT * FROM chat_inquiries WHERE id = ?",
  )
    .bind(id)
    .first<ChatInquiryRow>();
  if (!existing) {
    return c.json({ error: "Chat inquiry not found" }, 404);
  }

  const updated = await c.env.DB.prepare(
    `UPDATE chat_inquiries
     SET status = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     WHERE id = ?
     RETURNING *`,
  )
    .bind(parsed.data.status, id)
    .first<ChatInquiryRow>();

  if (!updated) {
    return c.json({ error: "Failed to update chat inquiry" }, 500);
  }

  return c.json(
    UpdateChatInquiryResponse.parse(serializeChatInquiry(updated)),
  );
});

app.delete("/api/chat/inquiries/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isFinite(id) || id < 1) {
    return c.json({ error: "Invalid inquiry id" }, 400);
  }

  const existing = await c.env.DB.prepare(
    "SELECT id FROM chat_inquiries WHERE id = ?",
  )
    .bind(id)
    .first<{ id: number }>();
  if (!existing) {
    return c.json({ error: "Chat inquiry not found" }, 404);
  }

  await c.env.DB.prepare("DELETE FROM chat_inquiries WHERE id = ?")
    .bind(id)
    .run();

  return c.body(null, 204);
});

// --- Before & After tasks (write APIs unauthenticated for now) ---

app.get("/api/tasks", async (c) => {
  const includeAll = c.req.query("all") === "1";
  const { limit, offset } = parseLimitOffset({
    limit: c.req.query("limit"),
    offset: c.req.query("offset"),
  });
  const where = includeAll ? "" : "WHERE published = 1";
  const countRow = await c.env.DB.prepare(
    `SELECT COUNT(*) AS total FROM tasks ${where}`,
  ).first<{ total: number }>();
  const { results } = await c.env.DB.prepare(
    `SELECT * FROM tasks ${where} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
  )
    .bind(limit, offset)
    .all<TaskRow>();
  return c.json({
    items: (results ?? []).map(serializeTask),
    total: Number(countRow?.total ?? 0),
    limit,
    offset,
  });
});

app.get("/api/tasks/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isFinite(id)) {
    return c.json({ error: "Invalid task id" }, 400);
  }
  const row = await c.env.DB.prepare("SELECT * FROM tasks WHERE id = ?")
    .bind(id)
    .first<TaskRow>();
  if (!row) {
    return c.json({ error: "Task not found" }, 404);
  }
  return c.json(serializeTask(row));
});

app.post("/api/tasks", async (c) => {
  const form = await c.req.formData().catch(() => null);
  if (!form) {
    return c.json({ error: "Expected multipart form data" }, 400);
  }

  const title = String(form.get("title") ?? "").trim();
  if (!title || title.length > 120) {
    return c.json({ error: "title is required (max 120 characters)" }, 400);
  }

  const location = String(form.get("location") ?? "").trim().slice(0, 80) || null;
  const description =
    String(form.get("description") ?? "").trim().slice(0, 500) || null;
  const sortOrder = parseSortOrder(form.get("sortOrder") ?? form.get("sort_order"));
  const published = parsePublished(form.get("published"), true);

  const beforeFile = form.get("before");
  const afterFile = form.get("after");
  const before = await readImageFile(
    beforeFile instanceof File ? beforeFile : null,
    "before",
  );
  if ("error" in before) {
    return c.json({ error: before.error }, 400);
  }
  const after = await readImageFile(
    afterFile instanceof File ? afterFile : null,
    "after",
  );
  if ("error" in after) {
    return c.json({ error: after.error }, 400);
  }

  // Placeholder keys so we can get an id, then overwrite with real keys.
  const placeholder = `tasks/pending/${crypto.randomUUID()}`;
  const inserted = await c.env.DB.prepare(
    `INSERT INTO tasks (title, location, description, before_key, after_key, sort_order, published)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     RETURNING *`,
  )
    .bind(title, location, description, placeholder, placeholder, sortOrder, published ? 1 : 0)
    .first<TaskRow>();

  if (!inserted) {
    return c.json({ error: "Failed to create task" }, 500);
  }

  const beforeKey = objectKey(inserted.id, "before", before.ext);
  const afterKey = objectKey(inserted.id, "after", after.ext);

  try {
    await Promise.all([
      c.env.MEDIA.put(beforeKey, before.bytes, {
        httpMetadata: { contentType: before.contentType },
      }),
      c.env.MEDIA.put(afterKey, after.bytes, {
        httpMetadata: { contentType: after.contentType },
      }),
    ]);
  } catch (err) {
    console.error("R2 upload failed", err);
    await c.env.DB.prepare("DELETE FROM tasks WHERE id = ?").bind(inserted.id).run();
    return c.json({ error: "Failed to upload images" }, 500);
  }

  const updated = await c.env.DB.prepare(
    `UPDATE tasks
     SET before_key = ?, after_key = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     WHERE id = ?
     RETURNING *`,
  )
    .bind(beforeKey, afterKey, inserted.id)
    .first<TaskRow>();

  return c.json(serializeTask(updated ?? { ...inserted, before_key: beforeKey, after_key: afterKey }), 201);
});

app.put("/api/tasks/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isFinite(id)) {
    return c.json({ error: "Invalid task id" }, 400);
  }

  const existing = await c.env.DB.prepare("SELECT * FROM tasks WHERE id = ?")
    .bind(id)
    .first<TaskRow>();
  if (!existing) {
    return c.json({ error: "Task not found" }, 404);
  }

  const form = await c.req.formData().catch(() => null);
  if (!form) {
    return c.json({ error: "Expected multipart form data" }, 400);
  }

  const titleRaw = form.get("title");
  const title =
    titleRaw != null ? String(titleRaw).trim() : existing.title;
  if (!title || title.length > 120) {
    return c.json({ error: "title is required (max 120 characters)" }, 400);
  }

  const location =
    form.has("location")
      ? String(form.get("location") ?? "").trim().slice(0, 80) || null
      : existing.location;
  const description =
    form.has("description")
      ? String(form.get("description") ?? "").trim().slice(0, 500) || null
      : existing.description;
  const sortOrder = form.has("sortOrder") || form.has("sort_order")
    ? parseSortOrder(form.get("sortOrder") ?? form.get("sort_order"), existing.sort_order)
    : existing.sort_order;
  const published = form.has("published")
    ? parsePublished(form.get("published"), existing.published === 1)
    : existing.published === 1;

  const beforeFile = form.get("before");
  const afterFile = form.get("after");
  const before = await readOptionalImageFile(
    beforeFile instanceof File ? beforeFile : null,
    "before",
  );
  if (before && "error" in before) {
    return c.json({ error: before.error }, 400);
  }
  const after = await readOptionalImageFile(
    afterFile instanceof File ? afterFile : null,
    "after",
  );
  if (after && "error" in after) {
    return c.json({ error: after.error }, 400);
  }

  let beforeKey = existing.before_key;
  let afterKey = existing.after_key;
  const keysToDelete: string[] = [];

  try {
    if (before) {
      beforeKey = objectKey(id, "before", before.ext);
      await c.env.MEDIA.put(beforeKey, before.bytes, {
        httpMetadata: { contentType: before.contentType },
      });
      keysToDelete.push(existing.before_key);
    }
    if (after) {
      afterKey = objectKey(id, "after", after.ext);
      await c.env.MEDIA.put(afterKey, after.bytes, {
        httpMetadata: { contentType: after.contentType },
      });
      keysToDelete.push(existing.after_key);
    }
  } catch (err) {
    console.error("R2 upload failed", err);
    return c.json({ error: "Failed to upload images" }, 500);
  }

  const updated = await c.env.DB.prepare(
    `UPDATE tasks
     SET title = ?, location = ?, description = ?, before_key = ?, after_key = ?,
         sort_order = ?, published = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     WHERE id = ?
     RETURNING *`,
  )
    .bind(
      title,
      location,
      description,
      beforeKey,
      afterKey,
      sortOrder,
      published ? 1 : 0,
      id,
    )
    .first<TaskRow>();

  if (keysToDelete.length > 0) {
    await Promise.all(keysToDelete.map((key) => c.env.MEDIA.delete(key)));
  }

  return c.json(serializeTask(updated!));
});

app.delete("/api/tasks/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isFinite(id)) {
    return c.json({ error: "Invalid task id" }, 400);
  }

  const existing = await c.env.DB.prepare("SELECT * FROM tasks WHERE id = ?")
    .bind(id)
    .first<TaskRow>();
  if (!existing) {
    return c.json({ error: "Task not found" }, 404);
  }

  await c.env.DB.prepare("DELETE FROM tasks WHERE id = ?").bind(id).run();
  await Promise.all([
    c.env.MEDIA.delete(existing.before_key),
    c.env.MEDIA.delete(existing.after_key),
  ]);

  return c.body(null, 204);
});

// --- Gallery items (write APIs unauthenticated for now) ---

app.get("/api/gallery", async (c) => {
  const includeAll = c.req.query("all") === "1";
  const { limit, offset } = parseLimitOffset({
    limit: c.req.query("limit"),
    offset: c.req.query("offset"),
  });
  const where = includeAll ? "" : "WHERE published = 1";
  const countRow = await c.env.DB.prepare(
    `SELECT COUNT(*) AS total FROM gallery_items ${where}`,
  ).first<{ total: number }>();
  const { results } = await c.env.DB.prepare(
    `SELECT * FROM gallery_items ${where} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
  )
    .bind(limit, offset)
    .all<GalleryRow>();
  return c.json({
    items: (results ?? []).map(serializeGalleryItem),
    total: Number(countRow?.total ?? 0),
    limit,
    offset,
  });
});

app.post("/api/gallery", async (c) => {
  const form = await c.req.formData().catch(() => null);
  if (!form) {
    return c.json({ error: "Expected multipart form data" }, 400);
  }

  const label = String(form.get("label") ?? "").trim();
  if (!label || label.length > 80) {
    return c.json({ error: "label is required (max 80 characters)" }, 400);
  }

  const alt =
    String(form.get("alt") ?? "").trim().slice(0, 160) || label;
  const sortOrder = parseSortOrder(form.get("sortOrder") ?? form.get("sort_order"));
  const published = parsePublished(form.get("published"), true);

  const imageFile = form.get("image");
  const image = await readImageFile(
    imageFile instanceof File ? imageFile : null,
    "image",
  );
  if ("error" in image) {
    return c.json({ error: image.error }, 400);
  }

  const placeholder = `gallery/pending/${crypto.randomUUID()}`;
  const inserted = await c.env.DB.prepare(
    `INSERT INTO gallery_items (label, alt, image_key, sort_order, published)
     VALUES (?, ?, ?, ?, ?)
     RETURNING *`,
  )
    .bind(label, alt, placeholder, sortOrder, published ? 1 : 0)
    .first<GalleryRow>();

  if (!inserted) {
    return c.json({ error: "Failed to create gallery item" }, 500);
  }

  const imageKey = galleryObjectKey(inserted.id, image.ext);
  try {
    await c.env.MEDIA.put(imageKey, image.bytes, {
      httpMetadata: { contentType: image.contentType },
    });
  } catch (err) {
    console.error("R2 gallery upload failed", err);
    await c.env.DB.prepare("DELETE FROM gallery_items WHERE id = ?")
      .bind(inserted.id)
      .run();
    return c.json({ error: "Failed to upload image" }, 500);
  }

  const updated = await c.env.DB.prepare(
    `UPDATE gallery_items SET image_key = ? WHERE id = ? RETURNING *`,
  )
    .bind(imageKey, inserted.id)
    .first<GalleryRow>();

  return c.json(
    serializeGalleryItem(updated ?? { ...inserted, image_key: imageKey }),
    201,
  );
});

app.delete("/api/gallery/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isFinite(id)) {
    return c.json({ error: "Invalid gallery item id" }, 400);
  }

  const existing = await c.env.DB.prepare(
    "SELECT * FROM gallery_items WHERE id = ?",
  )
    .bind(id)
    .first<GalleryRow>();
  if (!existing) {
    return c.json({ error: "Gallery item not found" }, 404);
  }

  await c.env.DB.prepare("DELETE FROM gallery_items WHERE id = ?").bind(id).run();
  await c.env.MEDIA.delete(existing.image_key).catch(() => undefined);

  return c.body(null, 204);
});

// --- FAQs (writes require auth; public GET returns published only) ---

app.get("/api/faqs", async (c) => {
  const includeAll = c.req.query("all") === "1";
  const { limit, offset } = parseLimitOffset({
    limit: c.req.query("limit"),
    offset: c.req.query("offset"),
  });
  const where = includeAll ? "" : "WHERE published = 1";
  const countRow = await c.env.DB.prepare(
    `SELECT COUNT(*) AS total FROM faqs ${where}`,
  ).first<{ total: number }>();
  const { results } = await c.env.DB.prepare(
    `SELECT * FROM faqs ${where}
     ORDER BY sort_order ASC, id ASC
     LIMIT ? OFFSET ?`,
  )
    .bind(limit, offset)
    .all<FaqRow>();
  return c.json({
    items: (results ?? []).map(serializeFaq),
    total: Number(countRow?.total ?? 0),
    limit,
    offset,
  });
});

app.post("/api/faqs", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return c.json({ error: "Expected JSON body" }, 400);
  }

  const question =
    typeof body.question === "string" ? body.question.trim() : "";
  const answer = typeof body.answer === "string" ? body.answer.trim() : "";
  if (!question || question.length > 200) {
    return c.json({ error: "question is required (max 200 characters)" }, 400);
  }
  if (!answer || answer.length > 2000) {
    return c.json({ error: "answer is required (max 2000 characters)" }, 400);
  }

  const sortOrder = parseSortOrderJson(body.sortOrder ?? body.sort_order, 0);
  const published = parsePublishedJson(body.published, true);

  const inserted = await c.env.DB.prepare(
    `INSERT INTO faqs (question, answer, sort_order, published)
     VALUES (?, ?, ?, ?)
     RETURNING *`,
  )
    .bind(question, answer, sortOrder, published ? 1 : 0)
    .first<FaqRow>();

  if (!inserted) {
    return c.json({ error: "Failed to create FAQ" }, 500);
  }
  return c.json(serializeFaq(inserted), 201);
});

app.put("/api/faqs/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isFinite(id) || id < 1) {
    return c.json({ error: "Invalid FAQ id" }, 400);
  }

  const existing = await c.env.DB.prepare("SELECT * FROM faqs WHERE id = ?")
    .bind(id)
    .first<FaqRow>();
  if (!existing) {
    return c.json({ error: "FAQ not found" }, 404);
  }

  const body = await c.req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return c.json({ error: "Expected JSON body" }, 400);
  }

  const question =
    body.question !== undefined
      ? typeof body.question === "string"
        ? body.question.trim()
        : ""
      : existing.question;
  const answer =
    body.answer !== undefined
      ? typeof body.answer === "string"
        ? body.answer.trim()
        : ""
      : existing.answer;
  if (!question || question.length > 200) {
    return c.json({ error: "question is required (max 200 characters)" }, 400);
  }
  if (!answer || answer.length > 2000) {
    return c.json({ error: "answer is required (max 2000 characters)" }, 400);
  }

  const sortOrder =
    body.sortOrder !== undefined || body.sort_order !== undefined
      ? parseSortOrderJson(body.sortOrder ?? body.sort_order, existing.sort_order)
      : existing.sort_order;
  const published =
    body.published !== undefined
      ? parsePublishedJson(body.published, existing.published === 1)
      : existing.published === 1;

  const updated = await c.env.DB.prepare(
    `UPDATE faqs
     SET question = ?, answer = ?, sort_order = ?, published = ?,
         updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     WHERE id = ?
     RETURNING *`,
  )
    .bind(question, answer, sortOrder, published ? 1 : 0, id)
    .first<FaqRow>();

  if (!updated) {
    return c.json({ error: "Failed to update FAQ" }, 500);
  }
  return c.json(serializeFaq(updated));
});

app.delete("/api/faqs/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isFinite(id) || id < 1) {
    return c.json({ error: "Invalid FAQ id" }, 400);
  }

  const existing = await c.env.DB.prepare("SELECT id FROM faqs WHERE id = ?")
    .bind(id)
    .first<{ id: number }>();
  if (!existing) {
    return c.json({ error: "FAQ not found" }, 404);
  }

  await c.env.DB.prepare("DELETE FROM faqs WHERE id = ?").bind(id).run();
  return c.body(null, 204);
});

// --- Services (writes require auth; public GET returns published only) ---

app.get("/api/services", async (c) => {
  const includeAll = c.req.query("all") === "1";
  const { limit, offset } = parseLimitOffset({
    limit: c.req.query("limit"),
    offset: c.req.query("offset"),
  });
  const where = includeAll ? "" : "WHERE published = 1";
  const countRow = await c.env.DB.prepare(
    `SELECT COUNT(*) AS total FROM services ${where}`,
  ).first<{ total: number }>();
  const { results } = await c.env.DB.prepare(
    `SELECT * FROM services ${where}
     ORDER BY sort_order ASC, id ASC
     LIMIT ? OFFSET ?`,
  )
    .bind(limit, offset)
    .all<ServiceRow>();
  return c.json({
    items: (results ?? []).map(serializeService),
    total: Number(countRow?.total ?? 0),
    limit,
    offset,
  });
});

app.post("/api/services", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return c.json({ error: "Expected JSON body" }, 400);
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const benefit = typeof body.benefit === "string" ? body.benefit.trim() : "";
  const description =
    typeof body.description === "string" ? body.description.trim() : "";
  if (!title || title.length > 100) {
    return c.json({ error: "title is required (max 100 characters)" }, 400);
  }
  if (!benefit || benefit.length > 200) {
    return c.json(
      { error: "benefit is required (max 200 characters)" },
      400,
    );
  }
  if (!description || description.length > 1000) {
    return c.json(
      { error: "description is required (max 1000 characters)" },
      400,
    );
  }

  const iconSlug =
    typeof body.iconSlug === "string" && body.iconSlug.trim()
      ? body.iconSlug.trim()
      : "wrench";
  const sortOrder = parseSortOrderJson(body.sortOrder ?? body.sort_order, 0);
  const published = parsePublishedJson(body.published, true);

  const inserted = await c.env.DB.prepare(
    `INSERT INTO services (title, benefit, description, icon_slug, sort_order, published)
     VALUES (?, ?, ?, ?, ?, ?)
     RETURNING *`,
  )
    .bind(title, benefit, description, iconSlug, sortOrder, published ? 1 : 0)
    .first<ServiceRow>();

  if (!inserted) {
    return c.json({ error: "Failed to create service" }, 500);
  }
  return c.json(serializeService(inserted), 201);
});

app.put("/api/services/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isFinite(id) || id < 1) {
    return c.json({ error: "Invalid service id" }, 400);
  }

  const existing = await c.env.DB.prepare(
    "SELECT * FROM services WHERE id = ?",
  )
    .bind(id)
    .first<ServiceRow>();
  if (!existing) {
    return c.json({ error: "Service not found" }, 404);
  }

  const body = await c.req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return c.json({ error: "Expected JSON body" }, 400);
  }

  const title =
    body.title !== undefined
      ? typeof body.title === "string"
        ? body.title.trim()
        : ""
      : existing.title;
  const benefit =
    body.benefit !== undefined
      ? typeof body.benefit === "string"
        ? body.benefit.trim()
        : ""
      : existing.benefit;
  const description =
    body.description !== undefined
      ? typeof body.description === "string"
        ? body.description.trim()
        : ""
      : existing.description;
  if (!title || title.length > 100) {
    return c.json({ error: "title is required (max 100 characters)" }, 400);
  }
  if (!benefit || benefit.length > 200) {
    return c.json(
      { error: "benefit is required (max 200 characters)" },
      400,
    );
  }
  if (!description || description.length > 1000) {
    return c.json(
      { error: "description is required (max 1000 characters)" },
      400,
    );
  }

  const iconSlug =
    body.iconSlug !== undefined
      ? typeof body.iconSlug === "string" && body.iconSlug.trim()
        ? body.iconSlug.trim()
        : existing.icon_slug
      : existing.icon_slug;
  const sortOrder =
    body.sortOrder !== undefined || body.sort_order !== undefined
      ? parseSortOrderJson(
          body.sortOrder ?? body.sort_order,
          existing.sort_order,
        )
      : existing.sort_order;
  const published =
    body.published !== undefined
      ? parsePublishedJson(body.published, existing.published === 1)
      : existing.published === 1;

  const updated = await c.env.DB.prepare(
    `UPDATE services
     SET title = ?, benefit = ?, description = ?, icon_slug = ?,
         sort_order = ?, published = ?,
         updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     WHERE id = ?
     RETURNING *`,
  )
    .bind(
      title,
      benefit,
      description,
      iconSlug,
      sortOrder,
      published ? 1 : 0,
      id,
    )
    .first<ServiceRow>();

  if (!updated) {
    return c.json({ error: "Failed to update service" }, 500);
  }
  return c.json(serializeService(updated));
});

app.delete("/api/services/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isFinite(id) || id < 1) {
    return c.json({ error: "Invalid service id" }, 400);
  }

  const existing = await c.env.DB.prepare(
    "SELECT id FROM services WHERE id = ?",
  )
    .bind(id)
    .first<{ id: number }>();
  if (!existing) {
    return c.json({ error: "Service not found" }, 404);
  }

  await c.env.DB.prepare("DELETE FROM services WHERE id = ?").bind(id).run();
  return c.body(null, 204);
});

app.get("/api/media/*", async (c) => {
  const key = decodeURIComponent(c.req.path.replace(/^\/api\/media\//, ""));
  if (!key || key.includes("..")) {
    return c.json({ error: "Invalid media key" }, 400);
  }

  const object = await c.env.MEDIA.get(key);
  if (!object) {
    return c.json({ error: "Not found" }, 404);
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");

  return new Response(object.body, { headers });
});

// --- Site settings ---

const DEFAULT_PHONE = "(512) 244-8550";
const HERO_IMAGE_KEY = "hero_image_key";

async function upsertSetting(db: D1Database, key: string, value: string) {
  await db
    .prepare(
      `INSERT INTO site_settings (key, value, updated_at)
       VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
       ON CONFLICT(key) DO UPDATE SET
         value = excluded.value,
         updated_at = excluded.updated_at`,
    )
    .bind(key, value)
    .run();
}

async function readSettingValue(db: D1Database, key: string): Promise<string> {
  const row = await db
    .prepare("SELECT value FROM site_settings WHERE key = ?")
    .bind(key)
    .first<{ value: string }>();
  return row?.value?.trim() ?? "";
}

function heroObjectKey(ext: string): string {
  return `hero/${crypto.randomUUID()}.${ext}`;
}

const VALID_THEME_IDS = ["craftsman", "blueprint", "toolbelt", "cedar-ridge", "austin-steel"];
const VALID_FONT_IDS  = ["workhorse", "trademaster", "hometown", "established"];

async function serializeSiteSettings(db: D1Database) {
  const [settings, heroKey, ttRating, ttCount, trRating, trCount, googleReviewUrl, googlePlaceId, themeId, themeMode, fontId] =
    await Promise.all([
      readNotifySettings(db),
      readSettingValue(db, HERO_IMAGE_KEY),
      readSettingValue(db, "thumbtack_rating"),
      readSettingValue(db, "thumbtack_review_count"),
      readSettingValue(db, "taskrabbit_rating"),
      readSettingValue(db, "taskrabbit_review_count"),
      readSettingValue(db, "google_review_url"),
      readSettingValue(db, "google_place_id"),
      readSettingValue(db, "theme_id"),
      readSettingValue(db, "theme_mode"),
      readSettingValue(db, "font_id"),
    ]);
  return {
    phone: settings.phone || DEFAULT_PHONE,
    ownerEmail: settings.ownerEmail,
    notifyFromEmail: settings.notifyFromEmail,
    notifyFromName: settings.notifyFromName,
    heroImageUrl: heroKey ? mediaUrl(heroKey) : "",
    thumbtackRating: ttRating || "4.9",
    thumbtackReviewCount: ttCount || "110",
    taskrabbitRating: trRating || "5.0",
    taskrabbitReviewCount: trCount || "384",
    googleReviewUrl: googleReviewUrl || "",
    googlePlaceId: googlePlaceId || "",
    themeId: VALID_THEME_IDS.includes(themeId) ? themeId : "craftsman",
    themeMode: themeMode === "dark" ? "dark" : "light",
    fontId: VALID_FONT_IDS.includes(fontId) ? fontId : "workhorse",
  };
}

app.get("/api/settings", async (c) => {
  return c.json(
    GetSiteSettingsResponse.parse(await serializeSiteSettings(c.env.DB)),
  );
});

app.get("/api/settings/notify-status", async (c) => {
  const settings = await readNotifySettings(c.env.DB);
  return c.json(
    GetNotifyStatusResponse.parse(getEmailNotifyStatus(c.env, settings)),
  );
});

app.put("/api/settings", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = UpdateSiteSettingsBody.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.message }, 400);
  }

  const actor = c.get("user");
  const current = await readNotifySettings(c.env.DB);
  const isMember = actor.role === "member";

  if (isMember) {
    const nextPhone = parsed.data.phone.trim();
    const currentPhone = (current.phone || DEFAULT_PHONE).trim();
    if (nextPhone !== currentPhone) {
      return c.json(
        { error: "Members cannot change the site phone number" },
        403,
      );
    }
    if (
      parsed.data.ownerEmail !== undefined &&
      parsed.data.ownerEmail.trim() !== (current.ownerEmail || "").trim()
    ) {
      return c.json(
        { error: "Members cannot change the owner email" },
        403,
      );
    }
  }

  // --- Pre-validate ALL rating fields before any write ---
  // Use Number() (strict) not parseFloat() so "4.9junk" → NaN and is rejected.
  const ratingWrites: [string, string][] = [];
  if (parsed.data.thumbtackRating !== undefined) {
    const v = Number(parsed.data.thumbtackRating.trim());
    if (!isFinite(v) || v < 1 || v > 5) {
      return c.json({ error: "thumbtackRating must be a number between 1 and 5" }, 400);
    }
    ratingWrites.push(["thumbtack_rating", v.toFixed(1)]);
  }
  if (parsed.data.thumbtackReviewCount !== undefined) {
    const v = Number(parsed.data.thumbtackReviewCount.trim());
    if (!isFinite(v) || !Number.isInteger(v) || v < 0) {
      return c.json({ error: "thumbtackReviewCount must be a non-negative integer" }, 400);
    }
    ratingWrites.push(["thumbtack_review_count", String(v)]);
  }
  if (parsed.data.taskrabbitRating !== undefined) {
    const v = Number(parsed.data.taskrabbitRating.trim());
    if (!isFinite(v) || v < 1 || v > 5) {
      return c.json({ error: "taskrabbitRating must be a number between 1 and 5" }, 400);
    }
    ratingWrites.push(["taskrabbit_rating", v.toFixed(1)]);
  }
  if (parsed.data.taskrabbitReviewCount !== undefined) {
    const v = Number(parsed.data.taskrabbitReviewCount.trim());
    if (!isFinite(v) || !Number.isInteger(v) || v < 0) {
      return c.json({ error: "taskrabbitReviewCount must be a non-negative integer" }, 400);
    }
    ratingWrites.push(["taskrabbit_review_count", String(v)]);
  }

  // Validate googleReviewUrl: must be empty or an HTTPS URL on a known Google domain.
  // Blocks javascript: and other dangerous schemes, and non-Google phishing URLs.
  const GOOGLE_REVIEW_HOSTS = new Set([
    "g.page",
    "google.com",
    "www.google.com",
    "maps.google.com",
    "maps.app.goo.gl",
    "goo.gl",
  ]);
  let googleReviewUrlToSave: string | undefined;
  if (parsed.data.googleReviewUrl !== undefined) {
    const raw = parsed.data.googleReviewUrl.trim();
    if (raw !== "") {
      let parsed_url: URL;
      try {
        parsed_url = new URL(raw);
      } catch {
        return c.json(
          { error: "googleReviewUrl must be a valid HTTPS URL on a Google domain (e.g. https://g.page/r/...)" },
          400,
        );
      }
      if (parsed_url.protocol !== "https:") {
        return c.json(
          { error: "googleReviewUrl must use HTTPS" },
          400,
        );
      }
      // Extract the registered domain (last two segments) for subdomain-agnostic matching
      const hostname = parsed_url.hostname.toLowerCase();
      const isAllowed =
        GOOGLE_REVIEW_HOSTS.has(hostname) ||
        hostname.endsWith(".google.com");
      if (!isAllowed) {
        return c.json(
          { error: "googleReviewUrl must be a Google review link (google.com, g.page, goo.gl, or maps.app.goo.gl)" },
          400,
        );
      }
    }
    googleReviewUrlToSave = raw;
  }

  // All validation passed — write atomically as a single D1 batch.
  const upsertStmt = (key: string, value: string) =>
    c.env.DB.prepare(
      `INSERT INTO site_settings (key, value, updated_at)
       VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
       ON CONFLICT(key) DO UPDATE SET
         value = excluded.value,
         updated_at = excluded.updated_at`,
    ).bind(key, value);

  const stmts = [upsertStmt("phone", parsed.data.phone.trim())];
  if (parsed.data.ownerEmail !== undefined && !isMember) {
    stmts.push(upsertStmt("owner_email", parsed.data.ownerEmail.trim()));
  }
  if (parsed.data.notifyFromEmail !== undefined) {
    stmts.push(upsertStmt("notify_from_email", parsed.data.notifyFromEmail.trim()));
  }
  if (parsed.data.notifyFromName !== undefined) {
    stmts.push(
      upsertStmt(
        "notify_from_name",
        parsed.data.notifyFromName.trim() || "Mike's Handyman Service",
      ),
    );
  }
  for (const [key, value] of ratingWrites) {
    stmts.push(upsertStmt(key, value));
  }
  if (googleReviewUrlToSave !== undefined) {
    stmts.push(upsertStmt("google_review_url", googleReviewUrlToSave));
  }
  if (parsed.data.googlePlaceId !== undefined) {
    const newPlaceId = parsed.data.googlePlaceId.trim();
    const currentPlaceId = await readSettingValue(c.env.DB, "google_place_id");
    stmts.push(upsertStmt("google_place_id", newPlaceId));
    if (newPlaceId !== currentPlaceId) {
      // Place ID changed or cleared — discard stale Google reviews immediately
      // so the public endpoint never serves rows from a different business.
      stmts.push(c.env.DB.prepare("DELETE FROM google_reviews"));
    }
  }
  // Appearance settings (theme, mode, font) — optional, admin-only in practice
  if (parsed.data.themeId !== undefined) {
    const tid = parsed.data.themeId.trim();
    if (VALID_THEME_IDS.includes(tid)) {
      stmts.push(upsertStmt("theme_id", tid));
    }
  }
  if (parsed.data.themeMode !== undefined) {
    const tm = parsed.data.themeMode.trim();
    if (tm === "light" || tm === "dark") {
      stmts.push(upsertStmt("theme_mode", tm));
    }
  }
  if (parsed.data.fontId !== undefined) {
    const fid = parsed.data.fontId.trim();
    if (VALID_FONT_IDS.includes(fid)) {
      stmts.push(upsertStmt("font_id", fid));
    }
  }
  await c.env.DB.batch(stmts);

  return c.json(
    UpdateSiteSettingsResponse.parse(await serializeSiteSettings(c.env.DB)),
  );
});

app.post("/api/settings/hero-image", async (c) => {
  const form = await c.req.formData().catch(() => null);
  if (!form) {
    return c.json({ error: "Expected multipart form data" }, 400);
  }

  const imageFile = form.get("image");
  const image = await readImageFile(
    imageFile instanceof File ? imageFile : null,
    "image",
  );
  if ("error" in image) {
    return c.json({ error: image.error }, 400);
  }

  const previousKey = await readSettingValue(c.env.DB, HERO_IMAGE_KEY);
  const imageKey = heroObjectKey(image.ext);

  try {
    await c.env.MEDIA.put(imageKey, image.bytes, {
      httpMetadata: { contentType: image.contentType },
    });
  } catch (err) {
    console.error("R2 hero upload failed", err);
    return c.json({ error: "Failed to upload image" }, 500);
  }

  await upsertSetting(c.env.DB, HERO_IMAGE_KEY, imageKey);

  if (previousKey && previousKey !== imageKey) {
    c.executionCtx.waitUntil(
      c.env.MEDIA.delete(previousKey).catch(() => undefined),
    );
  }

  return c.json(
    GetSiteSettingsResponse.parse(await serializeSiteSettings(c.env.DB)),
  );
});

app.delete("/api/settings/hero-image", async (c) => {
  const previousKey = await readSettingValue(c.env.DB, HERO_IMAGE_KEY);
  await upsertSetting(c.env.DB, HERO_IMAGE_KEY, "");

  if (previousKey) {
    c.executionCtx.waitUntil(
      c.env.MEDIA.delete(previousKey).catch(() => undefined),
    );
  }

  return c.json(
    GetSiteSettingsResponse.parse(await serializeSiteSettings(c.env.DB)),
  );
});

// --- Platform review ratings ---

interface RatingSettings {
  thumbtackReviewCount: number;
  thumbtackRatingValue: number;
  taskrabbitReviewCount: number;
  taskrabbitRatingValue: number;
}

async function readRatingSettings(db: D1Database): Promise<RatingSettings> {
  const [ttCount, ttRating, trCount, trRating] = await Promise.all([
    readSettingValue(db, "thumbtack_review_count"),
    readSettingValue(db, "thumbtack_rating"),
    readSettingValue(db, "taskrabbit_review_count"),
    readSettingValue(db, "taskrabbit_rating"),
  ]);
  return {
    thumbtackReviewCount: Math.max(0, parseInt(ttCount || "110", 10) || 0),
    thumbtackRatingValue: parseFloat(ttRating || "4.9") || 4.9,
    taskrabbitReviewCount: Math.max(0, parseInt(trCount || "384", 10) || 0),
    taskrabbitRatingValue: parseFloat(trRating || "5.0") || 5.0,
  };
}

function aggregateRatings(s: RatingSettings): { reviewCount: number; ratingValue: number } {
  const reviewCount = s.thumbtackReviewCount + s.taskrabbitReviewCount;
  const weighted =
    reviewCount > 0
      ? (s.thumbtackReviewCount * s.thumbtackRatingValue +
          s.taskrabbitReviewCount * s.taskrabbitRatingValue) /
        reviewCount
      : 5.0;
  const ratingValue = Math.round(weighted * 10) / 10;
  return { reviewCount, ratingValue };
}

async function injectRatingValues(html: string, db: D1Database): Promise<string> {
  const hasAggregate =
    html.includes("__AGGREGATE_REVIEW_COUNT__") ||
    html.includes("__AGGREGATE_RATING_VALUE__");
  const hasPlatform =
    html.includes("__THUMBTACK_RATING__") ||
    html.includes("__TASKRABBIT_RATING__");
  if (!hasAggregate && !hasPlatform) {
    return html;
  }
  const settings = await readRatingSettings(db);
  let out = html;
  if (hasAggregate) {
    const { reviewCount, ratingValue } = aggregateRatings(settings);
    out = out
      .replace("__AGGREGATE_REVIEW_COUNT__", String(reviewCount))
      .replace("__AGGREGATE_RATING_VALUE__", ratingValue.toFixed(1));
  }
  if (hasPlatform) {
    out = out
      .replaceAll("__THUMBTACK_RATING__", settings.thumbtackRatingValue.toFixed(1))
      .replaceAll("__TASKRABBIT_RATING__", settings.taskrabbitRatingValue.toFixed(1));
  }
  return out;
}

/** Public: return current platform review counts and computed aggregate. */
app.get("/api/settings/ratings", async (c) => {
  const settings = await readRatingSettings(c.env.DB);
  const { reviewCount, ratingValue } = aggregateRatings(settings);
  return c.json({
    thumbtackReviewCount: settings.thumbtackReviewCount,
    thumbtackRatingValue: settings.thumbtackRatingValue,
    taskrabbitReviewCount: settings.taskrabbitReviewCount,
    taskrabbitRatingValue: settings.taskrabbitRatingValue,
    aggregateReviewCount: reviewCount,
    aggregateRatingValue: ratingValue,
  });
});

/** Staff-only: update platform review counts and rating values. */
app.put("/api/settings/ratings", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return c.json({ error: "Invalid request body" }, 400);
  }
  const {
    thumbtackReviewCount,
    thumbtackRatingValue,
    taskrabbitReviewCount,
    taskrabbitRatingValue,
  } = body as Record<string, unknown>;

  if (
    typeof thumbtackReviewCount !== "number" ||
    typeof thumbtackRatingValue !== "number" ||
    typeof taskrabbitReviewCount !== "number" ||
    typeof taskrabbitRatingValue !== "number"
  ) {
    return c.json({ error: "All four rating fields are required (numbers)" }, 400);
  }
  // Reject fractional counts (e.g. 100.6) and ratings out of [1,5].
  if (
    !isFinite(thumbtackReviewCount) ||
    !Number.isInteger(thumbtackReviewCount) ||
    thumbtackReviewCount < 0
  ) {
    return c.json({ error: "thumbtackReviewCount must be a non-negative integer" }, 400);
  }
  if (
    !isFinite(taskrabbitReviewCount) ||
    !Number.isInteger(taskrabbitReviewCount) ||
    taskrabbitReviewCount < 0
  ) {
    return c.json({ error: "taskrabbitReviewCount must be a non-negative integer" }, 400);
  }
  if (!isFinite(thumbtackRatingValue) || thumbtackRatingValue < 1 || thumbtackRatingValue > 5) {
    return c.json({ error: "thumbtackRatingValue must be a number between 1 and 5" }, 400);
  }
  if (!isFinite(taskrabbitRatingValue) || taskrabbitRatingValue < 1 || taskrabbitRatingValue > 5) {
    return c.json({ error: "taskrabbitRatingValue must be a number between 1 and 5" }, 400);
  }

  // All validation passed — write atomically.
  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO site_settings (key, value, updated_at)
       VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    ).bind("thumbtack_review_count", String(thumbtackReviewCount)),
    c.env.DB.prepare(
      `INSERT INTO site_settings (key, value, updated_at)
       VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    ).bind("thumbtack_rating", thumbtackRatingValue.toFixed(1)),
    c.env.DB.prepare(
      `INSERT INTO site_settings (key, value, updated_at)
       VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    ).bind("taskrabbit_review_count", String(taskrabbitReviewCount)),
    c.env.DB.prepare(
      `INSERT INTO site_settings (key, value, updated_at)
       VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    ).bind("taskrabbit_rating", taskrabbitRatingValue.toFixed(1)),
  ]);

  const settings = await readRatingSettings(c.env.DB);
  const { reviewCount, ratingValue } = aggregateRatings(settings);
  return c.json({
    thumbtackReviewCount: settings.thumbtackReviewCount,
    thumbtackRatingValue: settings.thumbtackRatingValue,
    taskrabbitReviewCount: settings.taskrabbitReviewCount,
    taskrabbitRatingValue: settings.taskrabbitRatingValue,
    aggregateReviewCount: reviewCount,
    aggregateRatingValue: ratingValue,
  });
});

app.all("/api/*", (c) => c.json({ error: "Not found" }, 404));

const SECURITY_HEADERS: Record<string, string> = {
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com; object-src 'none';",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

function applySecurityHeaders(headers: Headers, isDev: boolean): Headers {
  const out = new Headers(headers);
  if (isDev) out.set("Cache-Control", "no-store");
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    out.set(k, v);
  }
  return out;
}

/** SPA + static assets (Worker runs first so host redirects can apply). */
app.all("*", async (c) => {
  const res = await c.env.ASSETS.fetch(c.req.raw);
  const isDev = c.env.ENVIRONMENT === "dev";
  // Only add headers to HTML responses (security headers are not useful on images/JS/CSS).
  const contentType = res.headers.get("Content-Type") ?? "";
  if (!contentType.startsWith("text/html") && !isDev) return res;
  const headers = applySecurityHeaders(res.headers, isDev);
  // Inject live rating values into the JSON-LD placeholders in index.html.
  if (contentType.startsWith("text/html")) {
    const html = await injectRatingValues(await res.text(), c.env.DB);
    return new Response(html, { status: res.status, statusText: res.statusText, headers });
  }
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
});

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    if (url.hostname === "www.sample-handyman.com") {
      url.hostname = "sample-handyman.com";
      return Response.redirect(url.toString(), 301);
    }
    return app.fetch(request, env, ctx);
  },
  async scheduled(_controller: ScheduledController, env: Env) {
    // 1. Purge expired chat inquiries (older than retention window)
    const deleted = await purgeExpiredChatInquiries(env.DB);
    console.log(
      JSON.stringify({
        event: "chat_inquiry_retention_purge",
        deleted,
        retentionDays: CHAT_INQUIRY_RETENTION_DAYS,
      }),
    );

    // 2. Sync Google reviews from Places API
    const placeId = await readSettingValue(env.DB, "google_place_id");
    const apiKey = env.GOOGLE_PLACES_API_KEY;
    if (!placeId || !apiKey) {
      console.log(
        JSON.stringify({
          event: "google_reviews_sync_skipped",
          reason: !placeId ? "google_place_id not configured" : "GOOGLE_PLACES_API_KEY not set",
        }),
      );
      return;
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=reviews,rating,user_ratings_total&key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Places API returned ${res.status}`);
      }
      const data = (await res.json()) as {
        status: string;
        result?: {
          rating?: number;
          user_ratings_total?: number;
          reviews?: Array<{
            author_name: string;
            profile_photo_url?: string;
            rating: number;
            text?: string;
            time: number;
          }>;
        };
      };

      if (data.status !== "OK" || !data.result) {
        throw new Error(`Places API status: ${data.status}`);
      }

      const reviews = (data.result.reviews ?? []).filter(
        (r) => typeof r.text === "string" && r.text.trim().length > 0,
      );
      const syncedAt = new Date().toISOString();

      // Atomically replace the full stored set: delete all existing rows then
      // insert the current snapshot so removed Google reviews do not linger.
      const replaceBatch: D1PreparedStatement[] = [
        env.DB.prepare("DELETE FROM google_reviews"),
        ...reviews.map((r) =>
          env.DB
            .prepare(
              `INSERT INTO google_reviews
                 (author_name, author_photo_url, rating, text, google_time, synced_at)
               VALUES (?, ?, ?, ?, ?, ?)`,
            )
            .bind(
              r.author_name,
              r.profile_photo_url || null,
              Math.min(5, Math.max(1, Math.round(r.rating))),
              r.text!.trim(),
              r.time,
              syncedAt,
            )
        ),
      ];
      await env.DB.batch(replaceBatch);

      console.log(
        JSON.stringify({
          event: "google_reviews_sync_complete",
          synced: reviews.length,
          placeId,
        }),
      );
    } catch (err) {
      console.error(
        JSON.stringify({
          event: "google_reviews_sync_error",
          error: err instanceof Error ? err.message : String(err),
        }),
      );
    }
  },
} satisfies ExportedHandler<Env>;
