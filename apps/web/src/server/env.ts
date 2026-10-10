import "server-only";
import { z } from "zod";

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  APP_URL: z.string().url().default("http://localhost:3000"),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().min(1).default("Hiring <onboarding@resend.dev>"),
  RUNNER: z.enum(["piston", "judge0"]).default("piston"),
  PISTON_URL: z.string().url().default("http://localhost:2000"),
  JUDGE0_URL: z.string().url().default("http://localhost:2358"),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

/**
 * The only place that reads process.env on the server. Parsed lazily and once, so a
 * missing variable fails with a clear message at first use rather than at build time.
 */
export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse({
    ...process.env,
    RESEND_API_KEY: process.env.RESEND_API_KEY || undefined, // empty string means unset
  });
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment: ${missing}`);
  }
  cached = parsed.data;
  return cached;
}
