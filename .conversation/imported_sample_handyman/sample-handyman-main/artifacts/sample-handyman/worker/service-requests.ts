/** Service request helpers. */

import { mediaUrl } from "./tasks";

export type ServiceRequestUrgency = "flexible" | "soon" | "urgent";

export type ServiceRequestRow = {
  id: number;
  name: string;
  email: string | null;
  phone: string;
  service: string;
  description: string;
  preferred_date: string | null;
  preferred_time: string | null;
  urgency: string;
  status: string;
  source: string;
  job_address: string | null;
  created_at: string;
  updated_at: string;
};

export type ServiceRequestPhotoRow = {
  id: number;
  service_request_id: number;
  image_key: string;
  sort_order: number;
  created_at: string;
};

export type ServiceRequestVideoRow = {
  id: number;
  service_request_id: number;
  video_key: string;
  sort_order: number;
  created_at: string;
};

// ─── Photos ────────────────────────────────────────────────────────────────

export const MAX_SERVICE_REQUEST_PHOTOS = 5;

export const serviceRequestPhotoKey = (requestId: number, ext: string) =>
  `service-requests/${requestId}/${crypto.randomUUID()}.${ext}`;

// ─── Videos ────────────────────────────────────────────────────────────────

export const MAX_SERVICE_REQUEST_VIDEOS = 2;
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MB

export const ALLOWED_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/quicktime", // .mov
  "video/webm",
]);

export const serviceRequestVideoKey = (requestId: number, ext: string) =>
  `service-requests/${requestId}/${crypto.randomUUID()}.${ext}`;

export function extForVideoType(type: string): string {
  if (type === "video/quicktime") return "mov";
  if (type === "video/webm") return "webm";
  return "mp4";
}

/**
 * Validate a video file and return it ready for streaming to R2.
 * We intentionally do NOT convert to ArrayBuffer here — passing the File
 * (a Blob) directly to R2Bucket.put() streams it without loading the whole
 * body into Worker memory, keeping peak usage well within limits.
 */
export async function readVideoFile(
  file: File | null,
  field: string,
): Promise<{ file: File; contentType: string; ext: string } | { error: string }> {
  if (!file || file.size === 0) return { error: `${field} video is required` };
  if (!ALLOWED_VIDEO_TYPES.has(file.type)) {
    return { error: `${field} must be MP4, MOV, or WebM` };
  }
  if (file.size > MAX_VIDEO_BYTES) {
    return { error: `${field} must be 100 MB or smaller` };
  }
  return {
    file,
    contentType: file.type,
    ext: extForVideoType(file.type),
  };
}

// ─── Serializer ────────────────────────────────────────────────────────────

export const serializeServiceRequest = (
  r: ServiceRequestRow,
  photoUrls: string[] = [],
  videoUrls: string[] = [],
) => ({
  id: r.id,
  name: r.name,
  email: r.email,
  phone: r.phone,
  service: r.service,
  description: r.description,
  preferredDate: r.preferred_date,
  preferredTime: r.preferred_time,
  urgency: (r.urgency === "soon" || r.urgency === "urgent"
    ? r.urgency
    : "flexible") as ServiceRequestUrgency,
  status: r.status,
  source: r.source ?? "web",
  photoUrls,
  videoUrls,
  jobAddress: r.job_address ?? null,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

// ─── Bulk loaders ──────────────────────────────────────────────────────────

export async function loadPhotoUrlsByRequestId(
  db: D1Database,
  requestIds: number[],
): Promise<Map<number, string[]>> {
  const map = new Map<number, string[]>();
  if (requestIds.length === 0) return map;

  const placeholders = requestIds.map(() => "?").join(", ");
  const { results } = await db
    .prepare(
      `SELECT service_request_id, image_key
       FROM service_request_photos
       WHERE service_request_id IN (${placeholders})
       ORDER BY sort_order ASC, id ASC`,
    )
    .bind(...requestIds)
    .all<{ service_request_id: number; image_key: string }>();

  for (const row of results ?? []) {
    const list = map.get(row.service_request_id) ?? [];
    list.push(mediaUrl(row.image_key));
    map.set(row.service_request_id, list);
  }
  return map;
}

export async function loadVideoUrlsByRequestId(
  db: D1Database,
  requestIds: number[],
): Promise<Map<number, string[]>> {
  const map = new Map<number, string[]>();
  if (requestIds.length === 0) return map;

  const placeholders = requestIds.map(() => "?").join(", ");
  const { results } = await db
    .prepare(
      `SELECT service_request_id, video_key
       FROM service_request_videos
       WHERE service_request_id IN (${placeholders})
       ORDER BY sort_order ASC, id ASC`,
    )
    .bind(...requestIds)
    .all<{ service_request_id: number; video_key: string }>();

  for (const row of results ?? []) {
    const list = map.get(row.service_request_id) ?? [];
    list.push(mediaUrl(row.video_key));
    map.set(row.service_request_id, list);
  }
  return map;
}

// ─── Full serializer (photos + videos) ────────────────────────────────────

export async function serializeServiceRequestWithPhotos(
  db: D1Database,
  row: ServiceRequestRow,
) {
  const [photoMap, videoMap] = await Promise.all([
    loadPhotoUrlsByRequestId(db, [row.id]),
    loadVideoUrlsByRequestId(db, [row.id]),
  ]);
  return serializeServiceRequest(
    row,
    photoMap.get(row.id) ?? [],
    videoMap.get(row.id) ?? [],
  );
}

// ─── Video cleanup ─────────────────────────────────────────────────────────

/**
 * Delete R2 video objects and their DB rows for a service request.
 * Called when a request is declined or converted (videos no longer needed).
 *
 * Retry-safe design: each DB row is removed only after its R2 object has been
 * confirmed deleted. Any object whose R2 delete fails keeps its DB row, so the
 * next call (e.g. re-PATCHing the same status, or a periodic sweep) will find
 * and retry it — no object is ever permanently orphaned.
 *
 * Throws if any individual delete fails so the caller can surface the error
 * via logs or a response warning. The status update itself is never blocked
 * because callers schedule cleanup with executionCtx.waitUntil().
 */
export async function deleteRequestVideos(
  db: D1Database,
  media: R2Bucket,
  requestId: number,
): Promise<void> {
  const { results } = await db
    .prepare(
      "SELECT id, video_key FROM service_request_videos WHERE service_request_id = ?",
    )
    .bind(requestId)
    .all<{ id: number; video_key: string }>();

  if (!results?.length) return;

  const errors: string[] = [];

  await Promise.all(
    results.map(async (r) => {
      try {
        await media.delete(r.video_key);
        // Only remove the tracking row once R2 confirms the delete.
        await db
          .prepare("DELETE FROM service_request_videos WHERE id = ?")
          .bind(r.id)
          .run();
      } catch (err) {
        // Row intentionally kept — the next cleanup call will retry this key.
        errors.push(r.video_key);
        console.error(
          `Video delete failed for key ${r.video_key} (request ${requestId}):`,
          err,
        );
      }
    }),
  );

  if (errors.length > 0) {
    throw new Error(
      `${errors.length} video(s) could not be deleted for request ${requestId}; ` +
        `DB rows retained for retry: ${errors.join(", ")}`,
    );
  }
}
