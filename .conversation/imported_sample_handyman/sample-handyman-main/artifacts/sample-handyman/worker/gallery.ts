/**
 * Gallery item helpers.
 * Write endpoints are intentionally unauthenticated for now.
 */

import { mediaUrl, parsePublished, parseSortOrder, readImageFile } from "./tasks";

export type GalleryRow = {
  id: number;
  label: string;
  alt: string;
  image_key: string;
  sort_order: number;
  published: number;
  created_at: string;
};

export const serializeGalleryItem = (row: GalleryRow) => ({
  id: row.id,
  label: row.label,
  alt: row.alt,
  imageUrl: mediaUrl(row.image_key),
  sortOrder: row.sort_order,
  published: row.published === 1,
  createdAt: row.created_at,
});

export function galleryObjectKey(id: number, ext: string): string {
  return `gallery/${id}/${crypto.randomUUID()}.${ext}`;
}

export { parsePublished, parseSortOrder, readImageFile };
