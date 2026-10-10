"use server";
import Papa from "papaparse";
import { revalidatePath } from "next/cache";
import { averageReviews } from "@app/shared";
import { done, failed, type ActionState } from "@/lib/action-state";
import { parseForm } from "@/lib/form";
import { adminDb } from "@/server/db/admin";
import { userDb } from "@/server/db/user";
import { requireAdmin, requireStaff } from "@/server/auth";
import { sendEmail } from "@/server/email";
import { advanceCandidate, finalizeDecision, recomputeCoding, recomputeFinal, sendMachineTest, startNextRound } from "@/server/pipeline";
import {
  addCandidateSchema,
  approveSchema,
  candidateIdSchema,
  candidateRefSchema,
  csvRowSchema,
  decideSchema,
  reviewSchema,
  walkthroughSchema,
} from "./schemas";

const LIST = "/admin/candidates";

async function invite(c: { id: string; name: string; email: string; invite_code: string }) {
  await sendEmail({ candidateId: c.id, to: c.email, template: "invite", vars: { name: c.name, code: c.invite_code } });
}

export async function addCandidate(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requireAdmin();
  const { data, error } = parseForm(formData, addCandidateSchema);
  if (error) return error;
  const { data: created, error: dbError } = await adminDb()
    .from("candidates")
    .insert({ ...data, created_by: staff.id })
    .select()
    .single();
  if (dbError) return failed(dbError.code === "23505" ? "A candidate with that email already exists." : "Could not add the candidate.");
  await invite(created);
  revalidatePath(LIST);
  return done(`Invite sent to ${created.email}.`);
}

export async function bulkUpload(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requireAdmin();
  const file = formData.get("csv");
  if (!(file instanceof File) || file.size === 0) return failed("Choose a CSV file.");
  if (file.size > 1_000_000) return failed("The file is larger than 1 MB.");

  const parsed = Papa.parse<Record<string, string>>(await file.text(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });
  const rows = parsed.data
    .map((r) => csvRowSchema.safeParse(r))
    .flatMap((r) => (r.success ? [{ ...r.data, created_by: staff.id }] : []));
  if (rows.length === 0) return failed("No valid rows found. Expected columns: name, email.");
  if (rows.length > 500) return failed("Upload at most 500 candidates at a time.");

  const { data } = await adminDb().from("candidates").upsert(rows, { onConflict: "email", ignoreDuplicates: true }).select();
  await Promise.all((data ?? []).map(invite));
  revalidatePath(LIST);
  const skipped = parsed.data.length - (data?.length ?? 0);
  return done(`Invited ${data?.length ?? 0} candidate(s)${skipped > 0 ? `, skipped ${skipped}` : ""}.`);
}

export async function resendInvite(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const { data, error } = parseForm(formData, candidateIdSchema);
  if (error) return error;
  const { data: c } = await adminDb().from("candidates").select("*").eq("id", data.id).single();
  if (!c) return failed("Candidate not found.");
  await invite(c);
  revalidatePath(LIST);
  return done("Invite resent.");
}

export async function approveNextRound(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const { data, error } = parseForm(formData, approveSchema);
  if (error) return error;
  await startNextRound(data.id, data.round as 2 | 3);
  revalidatePath(LIST);
  return done();
}

export async function sendMachineTestAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const { data, error } = parseForm(formData, candidateIdSchema);
  if (error) return error;
  try {
    await sendMachineTest(data.id);
  } catch (e) {
    return failed(e instanceof Error ? e.message : "Could not send the machine test.");
  }
  revalidatePath(LIST);
  return done();
}

export async function decide(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const { data, error } = parseForm(formData, decideSchema);
  if (error) return error;
  await finalizeDecision(data.id, data.selected);
  revalidatePath(LIST);
  return done();
}

/** Reviewers and admins may both score; RLS enforces reviewer_id = the signed-in user. */
export async function saveReview(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requireStaff();
  const { data, error } = parseForm(formData, reviewSchema);
  if (error) return error;

  const rubric: Record<string, number> = {};
  for (const [k, v] of formData.entries()) {
    if (!k.startsWith("c:")) continue;
    const n = Number(v);
    if (!Number.isFinite(n)) return failed(`${k.slice(2)}: enter a number from 0 to 10.`);
    rubric[k.slice(2)] = Math.min(10, Math.max(0, n));
  }
  const values = Object.values(rubric);
  if (values.length === 0) return failed("Score at least one criterion.");
  const score = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10 * 100) / 100;

  const db = await userDb();
  const { error: dbError } = await db.from("reviews").upsert(
    {
      candidate_id: data.candidate_id,
      round: data.round,
      reviewer_id: staff.id,
      rubric_scores: rubric,
      score,
      comment: data.comment || null,
    },
    { onConflict: "candidate_id,round,reviewer_id" },
  );
  if (dbError) return failed("Could not save the review.");

  if (data.round === 2) await recomputeCoding(data.candidate_id);
  await recomputeFinal(data.candidate_id);
  revalidatePath(`${LIST}/${data.candidate_id}`);
  return done("Review saved.");
}

/** Closes R3 reviews: applies the R3 cutoff (auto-reject email) or holds for the final decision. */
export async function closeReviews(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const { data, error } = parseForm(formData, candidateRefSchema);
  if (error) return error;
  const id = data.candidate_id;
  const { data: reviews } = await adminDb().from("reviews").select("score").eq("candidate_id", id).eq("round", 3);
  const avg = averageReviews((reviews ?? []).map((r) => Number(r.score)));
  if (avg === null) return failed("Add at least one review first.");
  await recomputeFinal(id);
  await advanceCandidate(id, 3, avg);
  revalidatePath(`${LIST}/${id}`);
  return done("Reviews closed.");
}

export async function saveWalkthrough(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const { data, error } = parseForm(formData, walkthroughSchema);
  if (error) return error;
  const at = data.walkthrough_at ? new Date(data.walkthrough_at) : null;
  if (at && Number.isNaN(at.getTime())) return failed("Enter a valid date and time.");
  await adminDb()
    .from("r3_assignments")
    .update({ walkthrough_at: at?.toISOString() ?? null, walkthrough_notes: data.notes || null })
    .eq("candidate_id", data.candidate_id);
  revalidatePath(`${LIST}/${data.candidate_id}`);
  return done("Saved.");
}
