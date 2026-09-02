const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 3;

/**
 * Env-scoped KV rate limit (max 3 review posts per IP per 10 minutes).
 * Dev and Prod use separate KV namespaces, so counters never cross environments.
 */
export async function isRateLimited(
  kv: KVNamespace,
  ip: string,
): Promise<boolean> {
  const key = `review:${ip}`;
  const now = Date.now();
  const raw = await kv.get(key);
  const recent = (raw ? (JSON.parse(raw) as number[]) : []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS,
  );

  if (recent.length >= RATE_LIMIT_MAX) {
    await kv.put(key, JSON.stringify(recent), {
      expirationTtl: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000),
    });
    return true;
  }

  recent.push(now);
  await kv.put(key, JSON.stringify(recent), {
    expirationTtl: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000),
  });
  return false;
}

/**
 * Generic env-scoped KV rate limit for a named action
 * (e.g. `transcribe`). Same sliding-window scheme as review posts.
 */
export async function isActionRateLimited(
  kv: KVNamespace,
  action: string,
  ip: string,
  max: number,
  windowMs: number,
): Promise<boolean> {
  const key = `${action}:${ip}`;
  const now = Date.now();
  const raw = await kv.get(key);
  const recent = (raw ? (JSON.parse(raw) as number[]) : []).filter(
    (t) => now - t < windowMs,
  );

  if (recent.length >= max) {
    await kv.put(key, JSON.stringify(recent), {
      expirationTtl: Math.ceil(windowMs / 1000),
    });
    return true;
  }

  recent.push(now);
  await kv.put(key, JSON.stringify(recent), {
    expirationTtl: Math.ceil(windowMs / 1000),
  });
  return false;
}
