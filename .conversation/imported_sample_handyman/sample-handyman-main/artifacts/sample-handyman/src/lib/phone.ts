/** Digits only (keeps a leading + if present). */
export function digitsOnly(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
}

/**
 * Build a tel: href that opens the native dialer.
 * US 10-digit numbers become +1… so they dial correctly.
 */
export function toTelHref(phone: string): string {
  const cleaned = digitsOnly(phone);
  if (!cleaned) return "tel:";
  if (cleaned.startsWith("+")) return `tel:${cleaned}`;
  if (/^\d{10}$/.test(cleaned)) return `tel:+1${cleaned}`;
  if (/^1\d{10}$/.test(cleaned)) return `tel:+${cleaned}`;
  return `tel:${cleaned}`;
}
