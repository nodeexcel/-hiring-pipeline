import { z } from "zod";
import { inviteCodeSchema, languageSchema, proctoringEventsSchema } from "@app/shared";

const code = inviteCodeSchema;
const MAX_SOURCE = 50_000;
const DAY_MS = 24 * 60 * 60 * 1000;

export const paperRequestSchema = z.object({ code, encrypt: z.boolean().optional() });

export const r1SubmitSchema = z.object({
  code,
  answers: z.record(z.string().uuid(), z.number().int().min(0).max(25)),
  elapsedMs: z.number().min(0).max(DAY_MS),
  signature: z.string().regex(/^[0-9a-f]{64}$/i).optional(),
  client: z.enum(["mobile", "web"]).optional(),
  events: proctoringEventsSchema.optional(),
});

export const eventsRequestSchema = z.object({
  code,
  round: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(1),
  events: proctoringEventsSchema,
});

export const codeOnlySchema = z.object({ code });

export const sourceSchema = z.object({
  code,
  problemId: z.string().uuid(),
  language: languageSchema,
  source: z.string().min(1).max(MAX_SOURCE),
});

/** The final submission carries one solution per problem. An empty source means "not attempted". */
export const submitSolutionsSchema = z.object({
  code,
  solutions: z
    .array(
      z.object({
        problemId: z.string().uuid(),
        language: languageSchema,
        source: z.string().max(MAX_SOURCE),
      }),
    )
    .min(1)
    .max(10),
  events: proctoringEventsSchema.optional(),
});

export type R1Submit = z.infer<typeof r1SubmitSchema>;
