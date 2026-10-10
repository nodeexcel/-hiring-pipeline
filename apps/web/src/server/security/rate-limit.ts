import "server-only";

/**
 * Fixed-window limiter for the public candidate endpoints. Invite codes are 40-bit
 * random, so this is defence in depth, not the only barrier.
 *
 * In-memory means per server instance. For several instances or serverless, swap the
 * store for Redis (for example Upstash) behind the same `rateLimit` signature.
 */
interface Window {
  count: number;
  resetAt: number;
}

const windows = new Map<string, Window>();
const MAX_KEYS = 10_000;

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterS: number } {
  const now = Date.now();
  const w = windows.get(key);
  if (!w || w.resetAt <= now) {
    if (windows.size >= MAX_KEYS) {
      for (const [k, v] of windows) if (v.resetAt <= now) windows.delete(k);
      if (windows.size >= MAX_KEYS) windows.clear(); // fail open rather than grow without bound
    }
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterS: 0 };
  }
  w.count += 1;
  return { ok: w.count <= limit, retryAfterS: Math.max(1, Math.ceil((w.resetAt - now) / 1000)) };
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}
