import { z } from "zod";
import { APTITUDE_SECTIONS, DSA_TOPICS } from "@app/shared";

export const mcqSchema = z
  .object({
    section: z.enum(APTITUDE_SECTIONS, { message: "Choose a section" }),
    topic: z.string().trim().min(1, "Enter a topic").max(80),
    difficulty: z.enum(["easy", "medium", "hard"]),
    body: z.string().trim().min(1).max(2000),
    options: z.string().transform((s) => s.split("\n").map((o) => o.trim()).filter(Boolean)),
    answer: z.coerce.number().int().min(1),
  })
  .refine((v) => v.options.length >= 2, { message: "Add at least two options", path: ["options"] })
  .refine((v) => v.answer <= v.options.length, { message: "Pick one of the listed options", path: ["answer"] });

export const problemSchema = z.object({
  title: z.string().trim().min(1).max(200),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  statement: z.string().trim().min(1).max(10_000),
  tests: z.string().min(1).max(100_000),
  visible: z.coerce.number().int().min(0).max(50).default(1),
  py: z.string().max(20_000).default(""),
  js: z.string().max(20_000).default(""),
  java: z.string().max(20_000).default(""),
  cpp: z.string().max(20_000).default(""),
});

export const taskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  brief: z.string().trim().min(1).max(10_000),
  rubric: z
    .string()
    .transform((s) => s.split(",").map((r) => r.trim()).filter(Boolean))
    .refine((r) => r.length > 0, "Add at least one criterion"),
});

export const idSchema = z.object({ id: z.string().uuid() });

/** Test cases: blocks split by a line of ---, each "input => expected". */
export function parseTestCases(raw: string, visible: number) {
  return raw
    .split(/\r?\n---\r?\n/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map((b) => b.split(/\r?\n=>\r?\n/))
    .filter((p): p is [string, string] => p.length === 2)
    .map(([input, expected], i) => ({ input, expected_output: expected.trim(), hidden: i >= visible }));
}

export const activeSchema = z.object({
  id: z.string().uuid(),
  active: z.enum(["0", "1"]).transform((v) => v === "1"),
});

export const bulkActivateSchema = z.object({
  kind: z.enum(["questions", "problems", "tasks"]),
  /** Optional scope: only the drafts in this section and/or topic are enabled. */
  section: z.string().trim().max(80).optional(),
  topic: z.string().trim().max(80).optional(),
});

/** Topics ticked in the DSA form. FormData holds several values under one key. */
export const topicsSchema = z.array(z.enum(DSA_TOPICS)).max(6, "Choose at most 6 topics");
