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

/** Browser staff requests must originate from an explicitly configured app origin. */
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
