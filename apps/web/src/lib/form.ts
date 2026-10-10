import type { z } from "zod";
import { failed, type ActionState } from "@/lib/action-state";

/** Parses FormData against a schema; returns the first human-readable error on failure. */
export function parseForm<S extends z.ZodTypeAny>(
  formData: FormData,
  schema: S,
): { data: z.infer<S>; error?: undefined } | { data?: undefined; error: ActionState } {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue.path.join(".");
    return { error: failed(field ? `${field}: ${issue.message}` : issue.message) };
  }
  return { data: parsed.data };
}
