import { z } from "zod";

const mark = z.coerce.number().min(0).max(100);
const checkbox = z.preprocess((v) => v === "on" || v === "true", z.boolean());
const minutes = z.coerce.number().int().min(1).max(600);

export const settingsFormSchema = z
  .object({
    cutoff_1: mark,
    cutoff_2: mark,
    cutoff_3: mark,
    weight_1: z.coerce.number().min(0).max(100),
    weight_2: z.coerce.number().min(0).max(100),
    weight_3: z.coerce.number().min(0).max(100),
    auto_1: checkbox,
    auto_2: checkbox,
    auto_3: checkbox,
    r1_questions: z.coerce.number().int().min(1).max(200),
    r1_duration: minutes,
    r1_max_per_topic: z.coerce.number().int().min(1).max(10),
    r2_problem_count: z.coerce.number().int().min(1).max(10),
    r2_duration: minutes,
    enforce_seb: checkbox,
    seb_key: z.string().trim().max(256).default(""),
    r3_days: z.coerce.number().int().min(1).max(60),
  })
  .refine((v) => v.weight_1 + v.weight_2 + v.weight_3 > 0, { message: "Weights must add up to more than zero", path: ["weight_1"] });

export type SettingsForm = z.infer<typeof settingsFormSchema>;
