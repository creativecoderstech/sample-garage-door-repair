/**
 * Which /api routes remain public (marketing site + OAuth entrypoints).
 */
export function isPublicApiRoute(
  method: string,
  pathname: string,
  search = "",
): boolean {
  const path = pathname.replace(/\/+$/, "") || "/";
  const m = method.toUpperCase();
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);

  if (path === "/api/healthz" && m === "GET") return true;

  // Auth entrypoints (me/logout still work; me returns 401 when anonymous)
  if (path === "/api/auth/google" && m === "GET") return true;
  if (path === "/api/auth/callback" && m === "GET") return true;
  if (path === "/api/auth/me" && m === "GET") return true;
  if (path === "/api/auth/logout" && m === "POST") return true;
  // Public: environment probe (tells the frontend dev vs production)
  if (path === "/api/auth/env" && m === "GET") return true;
  // Dev-only bypass login (hard-blocked in production at the route level)
  if (path === "/api/auth/dev-login" && m === "GET") return true;

  // Public marketing / lead capture
  if (path === "/api/service-requests" && m === "POST") return true;
  if (path === "/api/reviews" && (m === "GET" || m === "POST")) return true;
  if (path === "/api/chat" && m === "POST") return true;
  if (path === "/api/transcribe" && m === "POST") return true;
  if (path === "/api/chat/inquiries" && m === "POST") return true;
  if (path === "/api/tasks" && m === "GET") {
    // Published tasks only for anonymous; all=1 is staff
    return params.get("all") !== "1";
  }
  if (/^\/api\/tasks\/\d+$/.test(path) && m === "GET") return true;
  if (path === "/api/gallery" && m === "GET") {
    return params.get("all") !== "1";
  }
  if (path === "/api/faqs" && m === "GET") {
    // Published FAQs only for anonymous; all=1 is staff
    return params.get("all") !== "1";
  }
  if (path === "/api/services" && m === "GET") {
    // Published services only for anonymous; all=1 is staff
    return params.get("all") !== "1";
  }
  if (path.startsWith("/api/media/") && m === "GET") return true;
  if (path === "/api/settings" && m === "GET") return true;
  if (path === "/api/settings/ratings" && m === "GET") return true;
  if (path === "/api/google-reviews" && m === "GET") return true;

  return false;
}
