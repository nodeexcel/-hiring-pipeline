import "server-only";
import { NextResponse } from "next/server";
import type { z } from "zod";
import { candidateByCode } from "@/server/candidates/access";
import type { Tables } from "@/server/db/helpers";
import { fail, limited, parseJson } from "@/server/http";
import type { Outcome } from "./result";

interface Options<S extends z.ZodType<{ code: string }>> {
  /** Stable name used as the rate-limit bucket. */
  route: string;
  /** Requests per minute per client IP. */
  limit: number;
  schema: S;
}

/**
 * The shared shape of every candidate-facing endpoint:
 * rate limit, validate the body, authenticate by invite code, then run the service.
 */
export function candidateRoute<S extends z.ZodType<{ code: string }>>(
  options: Options<S>,
  handle: (ctx: { candidate: Tables<"candidates">; data: z.infer<S>; req: Request }) => Promise<Outcome<unknown>>,
) {
  return async function POST(req: Request): Promise<NextResponse> {
    const tooMany = limited(req, options.route, options.limit);
    if (tooMany) return tooMany;

    const parsed = await parseJson(req, options.schema);
    if (parsed.error) return parsed.error;

    const candidate = await candidateByCode(parsed.data.code);
    if (!candidate) return fail("Invalid invite code", 404);

    const out = await handle({ candidate, data: parsed.data, req });
    return out.ok ? NextResponse.json(out.body) : fail(out.error, out.status);
  };
}
