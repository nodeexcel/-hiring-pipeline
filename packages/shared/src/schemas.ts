import { z } from "zod";

/** Shared validation primitives. Pure, so server, tests and the mobile app can all use them. */

export const LANGUAGES = ["javascript", "python", "java", "cpp"] as const;
export const languageSchema = z.enum(LANGUAGES);
export type Language = z.infer<typeof languageSchema>;

export const inviteCodeSchema = z
  .string()
  .trim()
  .min(6)
  .max(32)
  .transform((s) => s.toUpperCase());

const positiveInt = (fallback: number, max: number) => z.coerce.number().int().min(1).max(max).catch(fallback);

/** round_config.settings is a free-form JSON column: parse it into a known shape with defaults. */
export const r1SettingsSchema = z.object({
  questions: positiveInt(20, 200),
  duration_minutes: positiveInt(30, 600),
  /** At most this many questions from a single topic in one paper. */
  max_per_topic: positiveInt(2, 10),
});

export const r2SettingsSchema = z.object({
  duration_minutes: positiveInt(60, 600),
  /** Coding problems each candidate receives. */
  problem_count: positiveInt(3, 10),
  enforce_seb: z.boolean().catch(false),
  seb_config_key: z.string().min(1).optional().catch(undefined),
  auto_share: z.number().min(0).max(1).catch(0.7),
});

export const r3SettingsSchema = z.object({
  deadline_days: positiveInt(3, 60),
});

export type R1Settings = z.infer<typeof r1SettingsSchema>;
export type R2Settings = z.infer<typeof r2SettingsSchema>;
export type R3Settings = z.infer<typeof r3SettingsSchema>;

export const proctoringEventSchema = z.object({
  type: z.string().min(1).max(40),
  detail: z.unknown().optional(),
  at: z.string().max(40).optional(),
});
export const proctoringEventsSchema = z.array(proctoringEventSchema).max(200);
export type ProctoringEvent = z.infer<typeof proctoringEventSchema>;
