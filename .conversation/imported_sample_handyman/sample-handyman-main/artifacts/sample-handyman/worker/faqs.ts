/**
 * FAQ helpers for public home + admin CRUD.
 */

export type FaqRow = {
  id: number;
  question: string;
  answer: string;
  sort_order: number;
  published: number;
  created_at: string;
  updated_at: string;
};

export const serializeFaq = (row: FaqRow) => ({
  id: row.id,
  question: row.question,
  answer: row.answer,
  sortOrder: row.sort_order,
  published: row.published === 1,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export function parsePublishedJson(
  value: unknown,
  fallback = true,
): boolean {
  if (value == null) return fallback;
  if (typeof value === "boolean") return value;
  const s = String(value).toLowerCase();
  if (s === "1" || s === "true" || s === "on" || s === "yes") return true;
  if (s === "0" || s === "false" || s === "off" || s === "no") return false;
  return fallback;
}

export function parseSortOrderJson(value: unknown, fallback = 0): number {
  if (value == null || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}
