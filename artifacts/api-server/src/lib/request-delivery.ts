import net from "node:net";
import { createHash, randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import { and, eq, sql } from "drizzle-orm";
import {
  db,
  pool,
  garageNotificationOutbox,
  garageNotificationSettings,
  garageRequestAttachments,
  garageRequestSubmissions,
  serviceRequests,
} from "@workspace/db";

const IMAGE_LIMIT = 5 * 1024 * 1024;
const VIDEO_LIMIT = 100 * 1024 * 1024;
const TYPES = new Map([
  ["image/jpeg", IMAGE_LIMIT], ["image/png", IMAGE_LIMIT], ["image/webp", IMAGE_LIMIT],
  ["video/mp4", VIDEO_LIMIT], ["video/quicktime", VIDEO_LIMIT], ["video/webm", VIDEO_LIMIT],
]);

const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const production = () => process.env.NODE_ENV === "production";

export async function persistentRateLimit(req: Request, bucket: string, limit: number, seconds: number) {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const key = `${bucket}:${digest(ip)}`;
  const windowStart = Math.floor(Date.now() / 1000 / seconds) * seconds;
  try {
    const result = await pool.query<{ count: number }>(
      `INSERT INTO garage_persistent_rate_limits (rate_key, window_start, count)
       VALUES ($1,$2,1) ON CONFLICT (rate_key,window_start)
       DO UPDATE SET count=garage_persistent_rate_limits.count+1 RETURNING count`,
      [key, windowStart],
    );
    return Number(result.rows[0]?.count || 0) <= limit;
  } catch {
    return false;
  }
}

export async function verifyRequestTurnstile(req: Request, token: unknown, action: "booking" | "assistant") {
  if (!production() && !process.env.TURNSTILE_SECRET_KEY) return true;
  if (typeof token !== "string" || !token || !process.env.TURNSTILE_SECRET_KEY) return false;
  try {
    const body = new URLSearchParams({
      secret: process.env.TURNSTILE_SECRET_KEY,
      response: token,
      remoteip: req.ip || "",
    });
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
    const result = await response.json() as { success?: boolean; action?: string; hostname?: string };
    const host = req.hostname;
    return result.success === true && result.action === action && (!result.hostname || result.hostname === host);
  } catch {
    return false;
  }
}

function objectLocation(objectKey: string) {
  const root = process.env.PRIVATE_OBJECT_DIR;
  if (!root) throw new Error("Private object storage is not configured.");
  const path = `${root.replace(/\/$/, "")}/${objectKey}`.replace(/^\/?/, "/");
  const [, bucket, ...parts] = path.split("/");
  if (!bucket || !parts.length) throw new Error("Private object storage is not configured.");
  return { bucket, object: parts.join("/") };
}

async function signedObjectUrl(objectKey: string, method: "PUT" | "GET", ttlSec = 900) {
  const { bucket, object } = objectLocation(objectKey);
  const response = await fetch("http://127.0.0.1:1106/object-storage/signed-object-url", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      bucket_name: bucket,
      object_name: object,
      method,
      expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error("Private object storage is unavailable.");
  return String((await response.json() as { signed_url: string }).signed_url);
}

function attachmentInput(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  const contentType = String(input.contentType || "").toLowerCase();
  const byteSize = Number(input.byteSize);
  const originalName = String(input.originalName || "").trim().slice(0, 180);
  const limit = TYPES.get(contentType);
  if (!originalName || !limit || !Number.isInteger(byteSize) || byteSize < 1 || byteSize > limit) return null;
  return { contentType, byteSize, originalName };
}

function signatureMatches(type: string, input: Uint8Array) {
  if (type === "image/jpeg") return input[0] === 0xff && input[1] === 0xd8 && input[2] === 0xff;
  if (type === "image/png") return input[0] === 0x89 && input[1] === 0x50 && input[2] === 0x4e && input[3] === 0x47;
  const ascii = (start: number, end: number) => String.fromCharCode(...input.slice(start, end));
  if (type === "image/webp") return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
  if (type === "video/mp4" || type === "video/quicktime") return ascii(4, 8) === "ftyp";
  if (type === "video/webm") return input[0] === 0x1a && input[1] === 0x45 && input[2] === 0xdf && input[3] === 0xa3;
  return false;
}

export function storedObjectMatches(
  declared: { contentType: string; byteSize: number },
  response: { ok: boolean; status: number; headers: { get(name: string): string | null } },
  signature: Uint8Array,
) {
  if (!response.ok || response.status !== 206) return false;
  const contentType = (response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  const range = /^bytes\s+0-(\d+)\/(\d+)$/i.exec(response.headers.get("content-range") || "");
  if (!range || Number(range[1]) + 1 !== signature.byteLength) return false;
  return Number(range[2]) === declared.byteSize &&
    contentType === declared.contentType &&
    signatureMatches(declared.contentType, signature);
}

async function capabilityFor(requestId: number, token: unknown, allowCompleted = false) {
  if (typeof token !== "string" || token.length < 32) return false;
  const [row] = await db.select().from(garageRequestSubmissions)
    .where(eq(garageRequestSubmissions.requestId, requestId)).limit(1);
  return Boolean(row && (allowCompleted || !row.completedAt) && row.uploadCapability === token &&
    Date.now() - row.createdAt.getTime() < 60 * 60 * 1000);
}

export async function prepareAttachment(req: Request, res: Response) {
  const requestId = Number(req.params.id);
  if (!Number.isInteger(requestId) || !await capabilityFor(requestId, req.headers["x-upload-capability"])) {
    return res.status(403).json({ error: "This upload link is invalid or expired." });
  }
  const input = attachmentInput(req.body);
  if (!input) return res.status(400).json({ error: "Use a JPEG, PNG, or WebP image up to 5 MB, or MP4, MOV, or WebM video up to 100 MB." });
  const prepareKey = String(req.headers["idempotency-key"] || "");
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(prepareKey)) return res.status(400).json({ error: "A valid per-file Idempotency-Key is required." });
  const id = randomUUID();
  const objectKey = `customer-requests/${requestId}/${id}`;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock($1)", [requestId]);
    const submission = await client.query<{ upload_capability: string; created_at: Date; completed_at: Date | null }>("SELECT upload_capability,created_at,completed_at FROM garage_request_submissions WHERE request_id=$1 FOR UPDATE", [requestId]);
    const authorization = submission.rows[0];
    if (!authorization || authorization.upload_capability !== req.headers["x-upload-capability"] || authorization.completed_at || Date.now() - authorization.created_at.getTime() >= 60 * 60 * 1000) {
      await client.query("ROLLBACK");
      return res.status(403).json({ error: authorization?.completed_at ? "This request upload phase is already complete." : "This upload link is invalid or expired." });
    }
    const prior = await client.query<{ id: string; object_key: string; original_name: string; content_type: string; byte_size: number; status: string }>("SELECT * FROM garage_request_attachments WHERE request_id=$1 AND prepare_key=$2", [requestId, prepareKey]);
    if (prior.rows[0]) {
      const row = prior.rows[0];
      await client.query("COMMIT");
      if (row.original_name !== input.originalName || row.content_type !== input.contentType || row.byte_size !== input.byteSize) return res.status(409).json({ error: "This file reservation key was already used for different file metadata." });
      return res.json({ attachmentId: row.id, uploadUrl: row.status === "uploaded" ? "" : await signedObjectUrl(row.object_key, "PUT"), method: "PUT", headers: { "Content-Type": input.contentType }, status: row.status });
    }
    await client.query("DELETE FROM garage_request_attachments WHERE request_id=$1 AND status='pending' AND created_at < now() - interval '15 minutes'", [requestId]);
    const count = await client.query<{ count: string }>("SELECT count(*) count FROM garage_request_attachments WHERE request_id=$1 AND content_type LIKE $2", [requestId, input.contentType.startsWith("image/") ? "image/%" : "video/%"]);
    if (Number(count.rows[0]?.count) >= (input.contentType.startsWith("image/") ? 5 : 2)) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "Attachment limit reached." });
    }
    await client.query("INSERT INTO garage_request_attachments (id,request_id,object_key,original_name,content_type,byte_size,prepare_key) VALUES ($1,$2,$3,$4,$5,$6,$7)", [id, requestId, objectKey, input.originalName, input.contentType, input.byteSize, prepareKey]);
    await client.query("COMMIT");
  } catch {
    await client.query("ROLLBACK");
    return res.status(503).json({ error: "The private file reservation could not be saved." });
  } finally {
    client.release();
  }
  return res.status(201).json({ attachmentId: id, uploadUrl: await signedObjectUrl(objectKey, "PUT"), method: "PUT", headers: { "Content-Type": input.contentType }, status: "pending" });
}

export async function finalizeAttachment(req: Request, res: Response) {
  const requestId = Number(req.params.id);
  if (!Number.isInteger(requestId) || !await capabilityFor(requestId, req.headers["x-upload-capability"])) {
    return res.status(403).json({ error: "This upload link is invalid or expired." });
  }
  const id = String(req.params.attachmentId || "");
  const [row] = await db.select().from(garageRequestAttachments).where(eq(garageRequestAttachments.id, id)).limit(1);
  if (!row || row.requestId !== requestId) return res.status(404).json({ error: "Attachment not found." });
  const signatureResponse = await fetch(await signedObjectUrl(row.objectKey, "GET"), { headers: { range: "bytes=0-15" } });
  const signature = signatureResponse.ok ? new Uint8Array(await signatureResponse.arrayBuffer()) : new Uint8Array();
  if (!storedObjectMatches(row, signatureResponse, signature)) {
    return res.status(400).json({ error: "The uploaded file did not match its declared type or size." });
  }
  await db.update(garageRequestAttachments).set({ status: "uploaded" }).where(eq(garageRequestAttachments.id, id));
  return res.json({ id, status: "uploaded" });
}

export async function completeRequestUploads(req: Request, res: Response) {
  const requestId = Number(req.params.id);
  if (!Number.isInteger(requestId) || !await capabilityFor(requestId, req.headers["x-upload-capability"], true)) return res.status(403).json({ error: "This upload capability is invalid or expired. The saved request remains visible to staff as upload incomplete." });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock($1)", [requestId]);
    const submission = await client.query<{ upload_capability: string; created_at: Date; completed_at: Date | null }>("SELECT upload_capability,created_at,completed_at FROM garage_request_submissions WHERE request_id=$1 FOR UPDATE", [requestId]);
    const row = submission.rows[0];
    if (!row || row.upload_capability !== req.headers["x-upload-capability"] || Date.now() - row.created_at.getTime() >= 60 * 60 * 1000) {
      await client.query("ROLLBACK");
      return res.status(403).json({ error: "This upload capability is invalid or expired. The saved request remains visible to staff as upload incomplete." });
    }
    if (!row.completed_at) {
      const pending = await client.query("SELECT 1 FROM garage_request_attachments WHERE request_id=$1 AND status='pending' LIMIT 1", [requestId]);
      if (pending.rowCount) {
        await client.query("ROLLBACK");
        return res.status(409).json({ error: "All prepared attachments must finish uploading before this request can be completed." });
      }
      await client.query("UPDATE garage_request_submissions SET completed_at=now() WHERE request_id=$1", [requestId]);
    }
    await client.query("COMMIT");
  } catch {
    await client.query("ROLLBACK");
    return res.status(503).json({ error: "Upload completion could not be saved. The request remains visible to staff." });
  } finally {
    client.release();
  }
  const claimed = await pool.query("UPDATE garage_notification_outbox SET status='processing',updated_at=now() WHERE request_id=$1 AND (status='pending_uploads' OR (status='processing' AND updated_at < now() - interval '2 minutes')) RETURNING request_id", [requestId]);
  if (claimed.rowCount) {
    await deliverNotification(requestId);
  }
  return res.json(await requestDeliveryDetails(requestId));
}

export async function getPrivateAttachment(req: Request, res: Response) {
  const attachmentId = String(req.params.attachmentId || "");
  const [row] = await db.select().from(garageRequestAttachments).where(eq(garageRequestAttachments.id, attachmentId)).limit(1);
  if (!row || row.status !== "uploaded") return res.status(404).json({ error: "Attachment not found." });
  const source = await fetch(await signedObjectUrl(row.objectKey, "GET", 60));
  if (!source.ok || !source.body) return res.status(502).json({ error: "Attachment storage is unavailable." });
  res.setHeader("Content-Type", row.contentType);
  res.setHeader("Content-Disposition", `inline; filename="${row.originalName.replace(/["\r\n]/g, "_")}"`);
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  const reader = source.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    res.write(Buffer.from(value));
  }
  res.end();
  return undefined;
}

function allowedNotificationHosts() {
  const raw = process.env.NOTIFICATION_ALLOWED_HOSTS || "";
  const hosts = raw.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
  if (!hosts.length) throw new Error("Notification delivery is unconfigured. A deployment owner must authorize the receiver domain securely.");
  for (const host of hosts) {
    if (host.includes("*") || net.isIP(host) || host === "localhost" || /\.(?:localhost|local|internal|example|invalid|test)$/.test(host) || host === "example.com") throw new Error("NOTIFICATION_ALLOWED_HOSTS contains a prohibited receiver host.");
  }
  return new Set(hosts);
}

export async function validateWebhookDestination(raw: string) {
  let url: URL;
  try { url = new URL(raw); } catch { throw new Error("Enter a valid HTTPS webhook URL."); }
  if (url.protocol !== "https:" || url.username || url.password || url.port) throw new Error("Webhook destinations must use standard HTTPS without embedded credentials.");
  const host = url.hostname.toLowerCase();
  if (!allowedNotificationHosts().has(host)) throw new Error("This receiver domain is not authorized. A deployment owner must add its exact host to NOTIFICATION_ALLOWED_HOSTS securely.");
  return url.toString();
}

export async function deliverNotification(requestId: number) {
  const [settings] = await db.select().from(garageNotificationSettings).where(eq(garageNotificationSettings.id, 1)).limit(1);
  if (!settings?.enabled || !settings.webhookUrl) {
    await db.update(garageNotificationOutbox).set({ status: "unconfigured", lastError: "Notification destination is not configured.", updatedAt: new Date() }).where(eq(garageNotificationOutbox.requestId, requestId));
    return "unconfigured";
  }
  try {
    const destination = await validateWebhookDestination(settings.webhookUrl);
    const [request] = await db.select().from(serviceRequests).where(eq(serviceRequests.id, requestId)).limit(1);
    const attachments = await db.select({ id: garageRequestAttachments.id, originalName: garageRequestAttachments.originalName, contentType: garageRequestAttachments.contentType })
      .from(garageRequestAttachments).where(eq(garageRequestAttachments.requestId, requestId));
    const response = await fetch(destination, {
      method: "POST",
      redirect: "error",
      headers: { "content-type": "application/json", "user-agent": "CummingGarageDoorService/1.0" },
      body: JSON.stringify({ event: "service_request.created", eventId: `service-request:${requestId}`, request: { ...request, attachments } }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`Destination returned HTTP ${response.status}.`);
    await db.update(garageNotificationOutbox).set({ status: "delivered", attempts: sql`${garageNotificationOutbox.attempts} + 1`, lastError: null, deliveredAt: new Date(), nextAttemptAt: null, updatedAt: new Date() }).where(eq(garageNotificationOutbox.requestId, requestId));
    return "delivered";
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : "Delivery failed.";
    await db.update(garageNotificationOutbox).set({ status: "failed", attempts: sql`${garageNotificationOutbox.attempts} + 1`, lastError: `${message} Staff must retry delivery manually.`, nextAttemptAt: null, updatedAt: new Date() }).where(eq(garageNotificationOutbox.requestId, requestId));
    return "failed";
  }
}

export async function requestDeliveryDetails(requestId: number) {
  const [delivery] = await db.select().from(garageNotificationOutbox).where(eq(garageNotificationOutbox.requestId, requestId)).limit(1);
  const attachments = await db.select({
    id: garageRequestAttachments.id,
    originalName: garageRequestAttachments.originalName,
    contentType: garageRequestAttachments.contentType,
    byteSize: garageRequestAttachments.byteSize,
    status: garageRequestAttachments.status,
  }).from(garageRequestAttachments).where(eq(garageRequestAttachments.requestId, requestId));
  const [submission] = await db.select({ completedAt: garageRequestSubmissions.completedAt }).from(garageRequestSubmissions).where(eq(garageRequestSubmissions.requestId, requestId)).limit(1);
  return { uploadStatus: submission?.completedAt ? "completed" : "incomplete", delivery: delivery ? { ...delivery, deliveredAt: delivery.deliveredAt?.toISOString() ?? null, updatedAt: delivery.updatedAt.toISOString() } : null, attachments };
}