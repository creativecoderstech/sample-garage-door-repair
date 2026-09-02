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

export const MAX_SERVICE_REQUEST_PHOTOS = 5;

export const serviceRequestPhotoKey = (requestId: number, ext: string) =>
  `service-requests/${requestId}/${crypto.randomUUID()}.${ext}`;

export const serializeServiceRequest = (
  r: ServiceRequestRow,
  photoUrls: string[] = [],
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
  source: r.source ?? 'web',
  photoUrls,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

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

export async function serializeServiceRequestWithPhotos(
  db: D1Database,
  row: ServiceRequestRow,
) {
  const photos = await loadPhotoUrlsByRequestId(db, [row.id]);
  return serializeServiceRequest(row, photos.get(row.id) ?? []);
}
