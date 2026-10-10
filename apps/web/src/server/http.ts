import "server-only";
import { NextResponse } from "next/server";
import type { z } from "zod";
import { clientIp, rateLimit } from "@/server/security/rate-limit";

/** Uniform JSON error body, so clients never have to guess the shape. */
export function fail(message: string, status: number, init?: ResponseInit) {
  return NextResponse.json({ error: message }, { status, ...init });
}

/** Parses and validates a JSON body. Returns a ready 400 response on failure. */
export async function parseJson<S extends z.ZodTypeAny>(
  req: Request,
  schema: S,
): Promise<{ data: z.infer<S>; error?: undefined } | { data?: undefined; error: NextResponse }> {
  const raw = await req.json().catch(() => undefined);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { error: fail("Invalid request", 400) };
  return { data: parsed.data };
}

/** Applies a per-IP, per-route limit. Returns a 429 response when exceeded, otherwise null. */
export function limited(req: Request, route: string, limit: number, windowMs = 60_000): NextResponse | null {
  const r = rateLimit(`${route}:${clientIp(req)}`, limit, windowMs);
  if (r.ok) return null;
  return fail("Too many requests. Please wait a moment and try again.", 429, {
    headers: { "retry-after": String(r.retryAfterS) },
  });
}
