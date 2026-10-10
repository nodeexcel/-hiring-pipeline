import "server-only";
import {
  averageReviews,
  blendCodingScore,
  decideAfterRound,
  finalScore,
  pickTask,
  r2SettingsSchema,
  r3SettingsSchema,
  type Round,
} from "@app/shared";
import { adminDb } from "@/server/db/admin";
import { sendEmail } from "@/server/email";

async function roundConfig(round: Round) {
  const { data } = await adminDb().from("round_config").select("*").eq("round", round).single();
  return data!;
}

/** Create + email the R3 assignment (random task, never repeating one the candidate had). */
export async function sendMachineTest(candidateId: string) {
  const db = adminDb();
  const { data: cand } = await db.from("candidates").select("*").eq("id", candidateId).single();
  if (!cand) throw new Error("candidate not found");

  const { data: existing } = await db.from("r3_assignments").select("id").eq("candidate_id", candidateId).maybeSingle();
  if (existing) return;

  const [{ data: pool }, { data: prior }, cfg] = await Promise.all([
    db.from("machine_tasks").select("id").eq("active", true),
    db.from("r3_assignments").select("task_id").eq("candidate_id", candidateId),
    roundConfig(3),
  ]);
  const taskId = pickTask(
    (pool ?? []).map((t) => t.id),
    (prior ?? []).map((p) => p.task_id),
  );
  if (!taskId) throw new Error("machine task pool is empty");

  const { deadline_days: days } = r3SettingsSchema.parse(cfg.settings ?? {});
  const deadline = new Date(Date.now() + days * 86_400_000);
  const { data: a } = await db
    .from("r3_assignments")
    .insert({ candidate_id: candidateId, task_id: taskId, deadline: deadline.toISOString() })
    .select("token")
    .single();
  const { data: task } = await db.from("machine_tasks").select("title,brief").eq("id", taskId).single();

  await db.from("candidates").update({ status: "R3 sent", awaiting_approval: null }).eq("id", candidateId);
  await sendEmail({
    candidateId,
    to: cand.email,
    template: "round3_task",
    vars: {
      name: cand.name,
      task: task!.title,
      brief: task!.brief,
      token: a!.token,
      deadline: deadline.toUTCString(),
    },
  });
}

/**
 * Single entry point after a round score is recorded: applies the cutoff, moves the
 * status, sends the follow-up email, and for R3 computes the weighted final score.
 */
export async function advanceCandidate(candidateId: string, round: Round, score: number) {
  const db = adminDb();
  const { data: cand } = await db.from("candidates").select("*").eq("id", candidateId).single();
  if (!cand) throw new Error("candidate not found");
  const cfg = await roundConfig(round);
  const decision = decideAfterRound(round, score, { cutoff: Number(cfg.cutoff), autoAdvance: cfg.auto_advance });

  if (decision.kind === "reject") {
    await db.from("candidates").update({ status: "Rejected", awaiting_approval: null }).eq("id", candidateId);
    await sendEmail({ candidateId, to: cand.email, template: "rejection", vars: { name: cand.name } });
    return decision;
  }

  if (decision.kind === "await_final") {
    await db.from("candidates").update({ status: decision.status }).eq("id", candidateId);
    await recomputeFinal(candidateId);
    return decision;
  }

  await db
    .from("candidates")
    .update({ status: decision.status, awaiting_approval: decision.needsApproval ? round + 1 : null })
    .eq("id", candidateId);
  if (!decision.needsApproval) await startNextRound(candidateId, (round + 1) as Round);
  return decision;
}

/** Used by auto-advance and by the admin "approve" action. */
export async function startNextRound(candidateId: string, nextRound: Round) {
  const db = adminDb();
  const { data: cand } = await db.from("candidates").select("*").eq("id", candidateId).single();
  if (!cand) return;
  if (nextRound === 2) {
    await sendEmail({
      candidateId,
      to: cand.email,
      template: "round2_invite",
      vars: { name: cand.name, code: cand.invite_code },
    });
  } else if (nextRound === 3) {
    await sendMachineTest(candidateId);
  }
  await db.from("candidates").update({ awaiting_approval: null }).eq("id", candidateId);
}

/** Recompute the R2 score: mean of the per-problem scores, blended with the reviewer average. */
export async function recomputeCoding(candidateId: string) {
  const db = adminDb();
  const [{ data: attempt }, { data: reviews }, cfg] = await Promise.all([
    db.from("r2_attempts").select("id,auto_score").eq("candidate_id", candidateId).maybeSingle(),
    db.from("reviews").select("score").eq("candidate_id", candidateId).eq("round", 2),
    roundConfig(2),
  ]);
  if (!attempt || attempt.auto_score == null) return null;
  const reviewer = averageReviews((reviews ?? []).map((r) => Number(r.score)));
  const score = blendCodingScore(Number(attempt.auto_score), reviewer, r2SettingsSchema.parse(cfg.settings ?? {}).auto_share);
  await db.from("r2_attempts").update({ reviewer_score: reviewer, score }).eq("id", attempt.id);
  return score;
}

/** Weighted final score from the three rounds; stored on the candidate. */
export async function recomputeFinal(candidateId: string) {
  const db = adminDb();
  const [{ data: r1 }, { data: r2 }, { data: r3 }, { data: cfgs }] = await Promise.all([
    db.from("r1_attempts").select("score").eq("candidate_id", candidateId).maybeSingle(),
    db.from("r2_attempts").select("score").eq("candidate_id", candidateId).maybeSingle(),
    db.from("reviews").select("score").eq("candidate_id", candidateId).eq("round", 3),
    db.from("round_config").select("round,weight"),
  ]);
  const r3avg = averageReviews((r3 ?? []).map((r) => Number(r.score)));
  if (r1?.score == null || r2?.score == null || r3avg == null) return null;
  const w = Object.fromEntries((cfgs ?? []).map((c) => [c.round, Number(c.weight)]));
  const total = finalScore(
    { r1: Number(r1.score), r2: Number(r2.score), r3: r3avg },
    { r1: w[1], r2: w[2], r3: w[3] },
  );
  await db.from("r3_assignments").update({ score: r3avg }).eq("candidate_id", candidateId);
  await db.from("candidates").update({ final_score: total }).eq("id", candidateId);
  return total;
}

export async function finalizeDecision(candidateId: string, selected: boolean) {
  const db = adminDb();
  const { data: cand } = await db.from("candidates").select("*").eq("id", candidateId).single();
  if (!cand) return;
  await db.from("candidates").update({ status: selected ? "Selected" : "Rejected" }).eq("id", candidateId);
  await sendEmail({
    candidateId,
    to: cand.email,
    template: selected ? "selected" : "rejection",
    vars: { name: cand.name },
  });
}
