/**
 * Before & After task routes.
 *
 * Write endpoints (POST/PUT/DELETE) are intentionally unauthenticated for now.
 * Add token/password auth before exposing admin outside a trusted network.
 */

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024;

export type TaskRow = {
  id: number;
  title: string;
  location: string | null;
  description: string | null;
  before_key: string;
  after_key: string;
  sort_order: number;
  published: number;
  created_at: string;
  updated_at: string;
};

export const mediaUrl = (key: string) =>
  `/api/media/${key.split("/").map(encodeURIComponent).join("/")}`;

export const serializeTask = (row: TaskRow) => ({
  id: row.id,
  title: row.title,
  location: row.location,
  description: row.description,
  beforeUrl: mediaUrl(row.before_key),
  afterUrl: mediaUrl(row.after_key),
  sortOrder: row.sort_order,
  published: row.published === 1,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export function extForType(type: string): string {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

export async function readImageFile(
  file: File | null,
  field: string,
): Promise<{ bytes: ArrayBuffer; contentType: string; ext: string } | { error: string }> {
  if (!file || file.size === 0) {
    return { error: `${field} image is required` };
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return { error: `${field} must be JPEG, PNG, or WebP` };
  }
  if (file.size > MAX_BYTES) {
    return { error: `${field} must be 5MB or smaller` };
  }
  return {
    bytes: await file.arrayBuffer(),
    contentType: file.type,
    ext: extForType(file.type),
  };
}

export async function readOptionalImageFile(
  file: File | null,
  field: string,
): Promise<
  | { bytes: ArrayBuffer; contentType: string; ext: string }
  | { error: string }
  | null
> {
  if (!file || file.size === 0) return null;
  return readImageFile(file, field);
}

export function parsePublished(value: FormDataEntryValue | null, fallback = true): boolean {
  if (value == null || value === "") return fallback;
  const s = String(value).toLowerCase();
  if (s === "1" || s === "true" || s === "on" || s === "yes") return true;
  if (s === "0" || s === "false" || s === "off" || s === "no") return false;
  return fallback;
}

export function parseSortOrder(value: FormDataEntryValue | null, fallback = 0): number {
  if (value == null || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

export function objectKey(taskId: number, kind: "before" | "after", ext: string): string {
  return `tasks/${taskId}/${kind}-${crypto.randomUUID()}.${ext}`;
}
