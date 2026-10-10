import { z } from "zod";

export const candidateIdSchema = z.object({ id: z.string().uuid() });
/** Forms on the detail page post the id as candidate_id. */
export const candidateRefSchema = z.object({ candidate_id: z.string().uuid() });

export const addCandidateSchema = z.object({
  name: z.string().trim().min(1, "Enter a name").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(254),
});

export const csvRowSchema = addCandidateSchema;

export const approveSchema = z.object({
  id: z.string().uuid(),
  round: z.coerce.number().int().refine((n) => n === 2 || n === 3, "Round must be 2 or 3"),
});

export const decideSchema = z.object({
  id: z.string().uuid(),
  selected: z.enum(["0", "1"]).transform((v) => v === "1"),
});

export const reviewSchema = z.object({
  candidate_id: z.string().uuid(),
  round: z.coerce.number().int().refine((n) => n === 2 || n === 3, "Round must be 2 or 3"),
  comment: z.string().trim().max(2000).optional(),
});

export const walkthroughSchema = z.object({
  candidate_id: z.string().uuid(),
  walkthrough_at: z.string().optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const CANDIDATES_PAGE_SIZE = 25;
export const pageSchema = z.coerce.number().int().min(1).max(10_000).catch(1);
