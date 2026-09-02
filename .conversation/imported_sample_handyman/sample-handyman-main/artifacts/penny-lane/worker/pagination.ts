/** Shared limit/offset parsing for list endpoints. */

export function parseLimitOffset(
  query: { limit?: string; offset?: string },
  defaults: { limit?: number; maxLimit?: number } = {},
): { limit: number; offset: number } {
  const defaultLimit = defaults.limit ?? 12;
  const maxLimit = defaults.maxLimit ?? 48;

  const limitRaw = Number(query.limit);
  const offsetRaw = Number(query.offset);

  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(Math.trunc(limitRaw), 1), maxLimit)
    : defaultLimit;
  const offset =
    Number.isFinite(offsetRaw) && offsetRaw > 0 ? Math.trunc(offsetRaw) : 0;

  return { limit, offset };
}
