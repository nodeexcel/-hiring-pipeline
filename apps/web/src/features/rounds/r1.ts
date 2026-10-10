import "server-only";
import { composePaper, r1SettingsSchema, scoreMcq } from "@app/shared";
import { adminDb } from "@/server/db/admin";
import { selectAll } from "@/server/db/paginate";
import type { Tables } from "@/server/db/helpers";
import { logEvents } from "@/server/candidates/access";
import { encryptPaper, verifySignature } from "@/server/security/crypto";
import { advanceCandidate } from "@/server/pipeline";
import { err, ok } from "./result";
import { RULES_VERSION, round1Rules } from "./rules";
import type { R1Submit } from "./schemas";

type Candidate = Tables<"candidates">;

/** Issues (or re-issues) the candidate's randomised paper. Correct answers never leave the server. */
export async function issuePaper(cand: Candidate, encrypt: boolean) {
  if (cand.status !== "Invited") return err(409, "Round 1 is not available");

  const db = adminDb();
  let { data: attempt } = await db.from("r1_attempts").select("*").eq("candidate_id", cand.id).maybeSingle();
  if (attempt?.submitted_at) return err(409, "Already submitted");

  const { data: cfg } = await db.from("round_config").select("settings").eq("round", 1).single();
  const { questions: count, duration_minutes: durationMinutes, max_per_topic: maxPerTopic } = r1SettingsSchema.parse(cfg?.settings ?? {});

  if (!attempt) {
    const pool = await selectAll((from, to) =>
      db.from("aptitude_questions").select("id,section,topic,served_count").eq("active", true).range(from, to),
    );
    if (!pool.length) return err(500, "There are no active questions in the bank");

    // balanced across sections and topics, least-served first, never a repeat inside the paper
    const seed = Math.floor(Math.random() * 2 ** 31);
    const picked = composePaper(
      pool.map((q) => ({ id: q.id, section: q.section, topic: q.topic, served: q.served_count })),
      { count, seed, maxPerTopic },
    );
    const ids = picked.map((q) => q.id);
    const { data, error } = await db.from("r1_attempts").insert({ candidate_id: cand.id, question_ids: ids, seed }).select().single();
    if (error) return err(500, "Could not create the paper");
    attempt = data;
    await db.rpc("bump_question_served", { p_ids: ids });
  }
  if (!attempt) return err(500, "Could not create the paper");

  const { data: qs } = await db.from("aptitude_questions").select("id,topic,body,options").in("id", attempt.question_ids);
  const byId = new Map((qs ?? []).map((q) => [q.id, q]));
  const questions = attempt.question_ids.flatMap((id) => {
    const q = byId.get(id);
    return q ? [q] : [];
  });

  const paper = { attemptId: attempt.id, durationMinutes, questions, signingSecret: attempt.secret };
  return ok(encrypt ? { encrypted: true as const, durationMinutes, ...encryptPaper(paper) } : { encrypted: false as const, ...paper });
}

export async function submitPaper(cand: Candidate, input: R1Submit) {
  const db = adminDb();
  const { data: attempt } = await db.from("r1_attempts").select("*").eq("candidate_id", cand.id).maybeSingle();
  if (!attempt) return err(409, "No paper has been issued");
  if (attempt.submitted_at) return err(409, "Already submitted");

  const events = [...(input.events ?? [])];
  // Mobile clients sign their answers; the web fallback submits unsigned and is flagged as such.
  if (input.signature) {
    if (!verifySignature(attempt.secret, input.answers, input.elapsedMs, input.signature)) events.push({ type: "bad_signature" });
  } else if (input.client === "mobile") {
    events.push({ type: "missing_signature" });
  }

  const { data: cfg } = await db.from("round_config").select("settings").eq("round", 1).single();
  const limitMs = r1SettingsSchema.parse(cfg?.settings ?? {}).duration_minutes * 60_000;
  if (input.elapsedMs > limitMs * 1.05) events.push({ type: "over_time", detail: { elapsedMs: input.elapsedMs, limitMs } });

  const { data: qs } = await db.from("aptitude_questions").select("id,answer_index").in("id", attempt.question_ids);
  const key = Object.fromEntries((qs ?? []).map((q) => [q.id, q.answer_index]));
  const result = scoreMcq(input.answers, key);

  await db
    .from("r1_attempts")
    .update({ answers: input.answers, elapsed_ms: Math.round(input.elapsedMs), score: result.percent, submitted_at: new Date().toISOString() })
    .eq("id", attempt.id);
  await logEvents(cand.id, 1, events);
  const decision = await advanceCandidate(cand.id, 1, result.percent);

  // The cutoff and per-question results are not revealed to the candidate.
  return ok({ submitted: true, passed: decision.kind !== "reject" });
}

/** What the app shows before anything is downloaded: rules, size and length of the paper. */
export async function getRules(cand: Candidate) {
  if (cand.status !== "Invited") return err(409, "Round 1 is not available");
  const db = adminDb();
  const { data: cfg } = await db.from("round_config").select("settings").eq("round", 1).single();
  const { questions, duration_minutes: durationMinutes } = r1SettingsSchema.parse(cfg?.settings ?? {});
  const { count } = await db.from("aptitude_questions").select("id", { count: "exact", head: true }).eq("active", true);
  const questionCount = Math.min(questions, count ?? 0);
  if (questionCount === 0) return err(503, "The test is not ready yet. Please try again later.");

  // an attempt that was already submitted cannot be started again
  const { data: attempt } = await db.from("r1_attempts").select("submitted_at").eq("candidate_id", cand.id).maybeSingle();
  if (attempt?.submitted_at) return err(409, "You have already submitted this test");

  return ok({
    version: RULES_VERSION,
    firstName: cand.name.trim().split(/\s+/)[0] ?? "",
    questionCount,
    durationMinutes,
    rules: round1Rules(questionCount, durationMinutes),
  });
}
