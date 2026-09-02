/**
 * Service card helpers for the public home page + admin CRUD.
 */

export type ServiceRow = {
  id: number;
  title: string;
  benefit: string;
  description: string;
  icon_slug: string;
  sort_order: number;
  published: number;
  created_at: string;
  updated_at: string;
};

export const serializeService = (row: ServiceRow) => ({
  id: row.id,
  title: row.title,
  benefit: row.benefit,
  description: row.description,
  iconSlug: row.icon_slug,
  sortOrder: row.sort_order,
  published: row.published === 1,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});
