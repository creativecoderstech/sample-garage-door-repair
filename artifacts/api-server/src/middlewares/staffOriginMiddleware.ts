import type { NextFunction, Request, Response } from "express";

function configuredOrigin(value: string | undefined, defaultProtocol = "https:") {
  const input = value?.trim();
  if (!input) return null;
  try {
    return new URL(input.includes("://") ? input : `${defaultProtocol}//${input}`).origin;
  } catch {
    return null;
  }
}

export function trustedStaffOrigins(env: NodeJS.ProcessEnv = process.env) {
  const origins = new Set<string>();
  const production = configuredOrigin(env.PUBLIC_SITE_ORIGIN);
  const development = configuredOrigin(env.REPLIT_DEV_DOMAIN);
  if (production) origins.add(production);
  if (development) origins.add(development);
  return origins;
}

/**
 * Browser requests carrying Clerk's session cookie must originate from an
 * explicitly configured app origin. Requests without Origin are left for
 * Clerk authentication so non-browser bearer clients remain supported.
 * Never derive trust from Host or X-Forwarded-Host.
 */
export function requireTrustedStaffOrigin(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin;
  if (!origin) return next();
  let normalized: string;
  try {
    normalized = new URL(origin).origin;
  } catch {
    return res.status(403).json({ error: "Untrusted staff request origin." });
  }
  if (!trustedStaffOrigins().has(normalized)) {
    return res.status(403).json({ error: "Untrusted staff request origin." });
  }
  return next();
}

export function requireTrustedClerkProxyOrigin(req: Request, res: Response, next: NextFunction) {
  if (!req.headers.origin && req.method !== "GET" && req.method !== "HEAD") {
    return res.status(403).json({ error: "Clerk proxy mutations require a trusted browser origin." });
  }
  return requireTrustedStaffOrigin(req, res, next);
}