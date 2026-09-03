type AnalyticsEvent =
  | "referral"
  | "phone_link_click"
  | "service_navigation_click"
  | "service_view"
  | "booking_start";

type AnalyticsPayload = {
  event: AnalyticsEvent;
  source?: "direct" | "referral";
};

let referralTracked = false;

export function trackGarageEvent(
  event: AnalyticsEvent,
  source?: AnalyticsPayload["source"],
): void {
  if (import.meta.env.DEV) return;

  const eventNames: Record<AnalyticsEvent, string> = {
    referral: "iframe_referral",
    phone_link_click: "phone_click",
    service_navigation_click: "service_view",
    service_view: "service_view",
    booking_start: "booking_start",
  };
  const payload = {
    event: eventNames[event],
    path: typeof window === "undefined" ? "" : window.location.pathname,
    ...(source ? { source } : {}),
  };
  const body = JSON.stringify(payload);
  const url = "/api/garage/analytics";

  try {
    if (navigator.sendBeacon?.(url, new Blob([body], { type: "application/json" }))) return;
  } catch {
    // The keepalive fetch below is the fallback.
  }

  void fetch(url, {
    method: "POST",
    body,
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    keepalive: true,
  }).catch(() => undefined);
}

export function trackPageReferral(): void {
  if (referralTracked || typeof document === "undefined") return;
  referralTracked = true;
  trackGarageEvent("referral", document.referrer ? "referral" : "direct");
}