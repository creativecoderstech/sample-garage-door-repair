// Runtime readiness is intentionally not editable through the business profile.
// Never expose credential values in the returned checks.
export function launchRuntime(env, requestUrl) {
  let canonicalOrigin = "";
  try {
    const url = new URL(env.PUBLIC_SITE_ORIGIN);
    if (url.protocol === "https:" && url.pathname === "/" && !url.search && !url.hash && !url.username && !url.password &&
        !url.hostname.endsWith(".example") && !url.hostname.endsWith(".pages.dev") && !url.hostname.endsWith(".replit.dev") &&
        url.hostname !== "example.com" && url.hostname !== "localhost") {
      canonicalOrigin = url.origin;
    }
  } catch { /* Missing production domain keeps every preview non-indexed. */ }
  const checks = {
    productionEnvironment: env.CLOUDFLARE_ENV === "production",
    canonicalHost: !!canonicalOrigin && new URL(requestUrl).origin === canonicalOrigin,
    database: typeof env.DB?.prepare === "function",
    privateStorage: typeof env.MEDIA?.get === "function" && typeof env.MEDIA?.put === "function",
    aiProvider: typeof env.AI?.run === "function",
    pagesAssets: typeof env.ASSETS?.fetch === "function",
    googleAuth: !!env.GOOGLE_OAUTH_CLIENT_ID,
    turnstile: !!env.TURNSTILE_SITE_KEY && !!env.TURNSTILE_SECRET_KEY &&
      !/^[123]x0{10}/.test(String(env.TURNSTILE_SITE_KEY)) &&
      !/^[123]x0{10}/.test(String(env.TURNSTILE_SECRET_KEY)),
  };
  return { canonicalOrigin, runtimeReady: Object.values(checks).every(Boolean), runtimeChecks: checks };
}