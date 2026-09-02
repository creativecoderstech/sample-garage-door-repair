/**
 * Server-side host predicates for /admin routing.
 *
 * These must stay in sync with the client-side predicates in
 * `src/lib/hosts.ts` — drift between the two layers caused the
 * "dev /admin silently bounces to the production admin domain" bug.
 * Both layers are locked together by `worker/hosts.test.ts`.
 */

/** Production admin dashboard host. */
export const ADMIN_HOST = "admin.pennylanehomesolutions.com";

export function isAdminHostname(hostname: string): boolean {
  return hostname === ADMIN_HOST;
}

/** Keep path-based /admin on local hosts and in any non-production environment. */
export function keepPathBasedAdmin(hostname: string, environment: string): boolean {
  if (environment !== "production") return true;
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".localhost")
  );
}
