/** Production admin dashboard host. */
export const ADMIN_HOST = 'admin.pennylanehomesolutions.com';
export const ADMIN_ORIGIN = `https://${ADMIN_HOST}`;
/** Admin dashboard URL (root of the admin subdomain). */
export const ADMIN_URL = `${ADMIN_ORIGIN}/`;

/** Production marketing site. */
export const PUBLIC_HOST = 'pennylanehomesolutions.com';
export const PUBLIC_ORIGIN = `https://${PUBLIC_HOST}`;

export function isAdminHost(hostname: string = window.location.hostname): boolean {
  return hostname === ADMIN_HOST;
}

/** Home URL for “Back to Site” — absolute on the admin subdomain. */
export function siteHomeUrl(hostname: string = window.location.hostname): string {
  if (isAdminHost(hostname)) return `${PUBLIC_ORIGIN}/`;
  return '/';
}

/** Local / preview hosts keep path-based `/admin` for development. */
export function keepPathBasedAdmin(
  hostname: string = window.location.hostname,
): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.replit.dev') ||
    hostname.endsWith('.replit.app') ||
    hostname.endsWith('.workers.dev') ||
    hostname.includes('penny-lane-home-solutions-dev')
  );
}

/** Whether `/admin` on this host should redirect to the admin subdomain. */
export function shouldRedirectAdminPath(
  hostname: string = window.location.hostname,
): boolean {
  return !isAdminHost(hostname) && !keepPathBasedAdmin(hostname);
}
