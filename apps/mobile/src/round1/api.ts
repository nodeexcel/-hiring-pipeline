import { z } from "zod";
import { API_URL } from "../config";
import type { FlagEvent } from "./types";

export class ApiError extends Error {
  constructor(
    message: string,
    /** HTTP status, or undefined when the server could not be reached at all. */
    readonly status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const rulesSchema = z.object({
  version: z.string(),
  firstName: z.string(),
  questionCount: z.number().int().positive(),
  durationMinutes: z.number().int().positive(),
  rules: z.array(z.string()).min(1),
});

const paperSchema = z.object({
  encrypted: z.literal(true),
  durationMinutes: z.number().int().positive(),
  key: z.string().min(1),
  iv: z.string().min(1),
  data: z.string().min(1),
});

const submitSchema = z.object({ submitted: z.literal(true), passed: z.boolean() });

async function post<T>(path: string, body: unknown, schema: z.ZodType<T>, timeoutMs = 20_000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    throw new ApiError("network", undefined);
  } finally {
    clearTimeout(timer);
  }
  const json: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = typeof (json as { error?: unknown }).error === "string" ? (json as { error: string }).error : "";
    throw new ApiError(message, res.status);
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) throw new ApiError("The server sent an unexpected response.", res.status);
  return parsed.data;
}

export const api = {
  rules: (code: string) => post("/api/r1/rules", { code }, rulesSchema),
  paper: (code: string) => post("/api/r1/paper", { code, encrypt: true }, paperSchema),
  submit: (payload: { code: string; answers: Record<string, number>; elapsedMs: number; signature: string; events: FlagEvent[] }) =>
    post("/api/r1/submit", { ...payload, client: "mobile" }, submitSchema, 30_000),
  /** Best effort: a missed event must never block the candidate. */
  event: (code: string, events: FlagEvent[]) =>
    post("/api/events", { code, round: 1, events }, z.object({ ok: z.literal(true) })).catch(() => undefined),
};
