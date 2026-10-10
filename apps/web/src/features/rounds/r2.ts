import "server-only";
import { blendCodingScore, composeProblems, meanScore, r2SettingsSchema, similarity, type Language } from "@app/shared";
import { adminDb } from "@/server/db/admin";
import { selectAll } from "@/server/db/paginate";
import type { Tables } from "@/server/db/helpers";
import { mapLimit } from "@/server/concurrency";
import { logEvents } from "@/server/candidates/access";
import { advanceCandidate, recomputeCoding } from "@/server/pipeline";
import { getRunner } from "@/server/runner";
import { sebValid } from "@/server/security/seb";
import { err, ok } from "./result";
import type { z } from "zod";
import type { submitSolutionsSchema } from "./schemas";

type Candidate = Tables<"candidates">;
const SIMILARITY_FLAG = 0.6;
const RUNNER_CONCURRENCY = 6;

async function loadAttemptProblems(attemptId: string) {
  const { data } = await adminDb()
    .from("r2_attempt_problems")
    .select("id,problem_id,position,coding_problems(title,statement,starter_code,difficulty,topics,time_limit_s)")
    .eq("attempt_id", attemptId)
    .order("position");
  return data ?? [];
}

export async function startAttempt(cand: Candidate, req: Request) {
  if (cand.status !== "R1 done") return err(409, "Round 2 is not available");
  const db = adminDb();
  const { data: cfg } = await db.from("round_config").select("settings").eq("round", 2).single();
  const settings = r2SettingsSchema.parse(cfg?.settings ?? {});

  // Lockdown check: block or just flag, per the admin setting.
  if (sebValid(req, settings.seb_config_key) === false) {
    await logEvents(cand.id, 2, [{ type: "seb_missing" }]);
    if (settings.enforce_seb) return err(403, "This test must be opened in Safe Exam Browser using the exam config from your email.");
  }

  let { data: attempt } = await db.from("r2_attempts").select("*").eq("candidate_id", cand.id).maybeSingle();
  if (attempt?.submitted_at) return err(409, "Already submitted");

  if (!attempt) {
    const pool = await selectAll((from, to) =>
      db.from("coding_problems").select("id,difficulty,topics,served_count").eq("active", true).range(from, to),
    );
    if (!pool.length) return err(500, "There are no active coding problems");

    // a difficulty ramp across different topics, preferring the least-served problems
    const picked = composeProblems(
      pool.map((p) => ({ id: p.id, difficulty: p.difficulty, topics: p.topics ?? [], served: p.served_count })),
      { count: settings.problem_count, seed: Math.floor(Math.random() * 2 ** 31) },
    );
    const { data: created, error } = await db.from("r2_attempts").insert({ candidate_id: cand.id }).select().single();
    if (error || !created) return err(500, "Could not start the attempt");
    const rows = picked.map((p, i) => ({ attempt_id: created.id, problem_id: p.id, position: i + 1 }));
    const { error: rowsError } = await db.from("r2_attempt_problems").insert(rows);
    if (rowsError) {
      await db.from("r2_attempts").delete().eq("id", created.id);
      return err(500, "Could not assign the problems");
    }
    await db.rpc("bump_problem_served", { p_ids: picked.map((p) => p.id) });
    attempt = created;
  }

  const assigned = await loadAttemptProblems(attempt.id);
  const ids = assigned.map((a) => a.problem_id);
  const { data: samples } = await db
    .from("coding_testcases")
    .select("problem_id,input,expected_output")
    .in("problem_id", ids)
    .eq("hidden", false);

  const problems = assigned.map((a) => ({
    id: a.problem_id,
    position: a.position,
    title: a.coding_problems?.title ?? "",
    statement: a.coding_problems?.statement ?? "",
    difficulty: a.coding_problems?.difficulty ?? null,
    starter_code: a.coding_problems?.starter_code ?? {},
    samples: (samples ?? []).filter((s) => s.problem_id === a.problem_id).map((s) => ({ input: s.input, expected_output: s.expected_output })),
  }));
  const deadline = new Date(attempt.started_at).getTime() + settings.duration_minutes * 60_000;
  return ok({ problems, durationMinutes: settings.duration_minutes, deadline });
}

/** The caller's active attempt and the attempt-problem row for `problemId`, or null. */
async function activeProblem(candidateId: string, problemId: string) {
  const db = adminDb();
  const { data: attempt } = await db.from("r2_attempts").select("id,submitted_at").eq("candidate_id", candidateId).maybeSingle();
  if (!attempt || attempt.submitted_at) return null;
  const { data: row } = await db
    .from("r2_attempt_problems")
    .select("id,problem_id")
    .eq("attempt_id", attempt.id)
    .eq("problem_id", problemId)
    .maybeSingle();
  return row ? { attemptId: attempt.id, attemptProblemId: row.id, problemId: row.problem_id } : null;
}

/** Runs the candidate's code against that problem's visible sample cases only. */
export async function runSamples(cand: Candidate, problemId: string, language: Language, source: string) {
  const target = await activeProblem(cand.id, problemId);
  if (!target) return err(409, "That problem is not part of your active attempt");
  const { data: samples } = await adminDb()
    .from("coding_testcases")
    .select("input,expected_output")
    .eq("problem_id", target.problemId)
    .eq("hidden", false);
  const runner = getRunner();
  try {
    const results = await mapLimit(samples ?? [], RUNNER_CONCURRENCY, (t) =>
      runner.run({ language, code: source, stdin: t.input, expected: t.expected_output }),
    );
    return ok({
      results: results.map((r, i) => ({
        passed: r.passed,
        status: r.status,
        stdout: r.stdout,
        stderr: r.stderr,
        expected: samples![i].expected_output,
      })),
    });
  } catch {
    return err(503, "The code runner is unavailable. Please retry.");
  }
}

export async function saveSnapshot(cand: Candidate, problemId: string, language: Language, source: string) {
  const target = await activeProblem(cand.id, problemId);
  if (!target) return ok({ ok: false });
  await adminDb()
    .from("r2_snapshots")
    .insert({ attempt_id: target.attemptId, attempt_problem_id: target.attemptProblemId, language, code: source });
  return ok({ ok: true });
}

export async function submitAttempt(cand: Candidate, input: z.infer<typeof submitSolutionsSchema>) {
  const db = adminDb();
  const { data: attempt } = await db.from("r2_attempts").select("*").eq("candidate_id", cand.id).maybeSingle();
  if (!attempt) return err(409, "No active attempt");
  if (attempt.submitted_at) return err(409, "Already submitted");

  const assigned = await loadAttemptProblems(attempt.id);
  const assignedIds = new Set(assigned.map((a) => a.problem_id));
  if (input.solutions.some((s) => !assignedIds.has(s.problemId))) return err(400, "A solution does not belong to this attempt");

  const { data: allTests } = await db
    .from("coding_testcases")
    .select("problem_id,input,expected_output")
    .in("problem_id", [...assignedIds]);
  const runner = getRunner();

  // Run everything (hidden cases included) before writing anything, so a runner outage lets
  // the candidate retry instead of losing their attempt.
  const graded: { row: (typeof assigned)[number]; language: Language | null; source: string; passed: number; total: number; score: number }[] = [];
  try {
    for (const row of assigned) {
      const sol = input.solutions.find((s) => s.problemId === row.problem_id);
      const tests = (allTests ?? []).filter((t) => t.problem_id === row.problem_id);
      const total = tests.length;
      const attempted = !!sol && sol.source.trim().length > 0;
      let passed = 0;
      if (attempted && sol) {
        const timeLimitS = Number(row.coding_problems?.time_limit_s ?? 2);
        const results = await mapLimit(tests, RUNNER_CONCURRENCY, (t) =>
          runner.run({ language: sol.language, code: sol.source, stdin: t.input, expected: t.expected_output, timeLimitS }),
        );
        passed = results.filter((r) => r.passed).length;
      }
      graded.push({
        row,
        language: attempted ? sol!.language : null,
        source: attempted ? sol!.source : "",
        passed,
        total,
        score: total === 0 ? 0 : Math.round((passed / total) * 10000) / 100,
      });
    }
  } catch {
    return err(503, "The code runner is unavailable. Please retry.");
  }

  const now = new Date().toISOString();
  await Promise.all(
    graded.map((g) =>
      db
        .from("r2_attempt_problems")
        .update({
          language: g.language,
          code: g.source || null,
          tests_passed: g.passed,
          tests_total: g.total,
          auto_score: g.score,
          submitted_at: now,
        })
        .eq("id", g.row.id),
    ),
  );

  const auto = meanScore(graded.map((g) => g.score));
  await db
    .from("r2_attempts")
    .update({
      submitted_at: now,
      tests_passed: graded.reduce((n, g) => n + g.passed, 0),
      tests_total: graded.reduce((n, g) => n + g.total, 0),
      auto_score: auto,
      score: blendCodingScore(auto, null),
    })
    .eq("id", attempt.id);
  if (input.events?.length) await logEvents(cand.id, 2, input.events);

  // Similarity, per problem, against other candidates' submissions of the same problem.
  for (const g of graded) {
    if (!g.source.trim()) continue;
    const others = await selectAll((from, to) =>
      db
        .from("r2_attempt_problems")
        .select("id,code")
        .eq("problem_id", g.row.problem_id)
        .neq("id", g.row.id)
        .not("code", "is", null)
        .range(from, to),
    );
    const matches = others
      .map((o) => ({ other: o.id, score: similarity(g.source, o.code ?? "") }))
      .filter((m) => m.score >= 0.3);
    if (!matches.length) continue;
    await db
      .from("r2_problem_similarity")
      .upsert(matches.map((m) => ({ attempt_problem_id: g.row.id, other_attempt_problem_id: m.other, score: m.score })));
    const top = Math.max(...matches.map((m) => m.score));
    if (top >= SIMILARITY_FLAG) {
      await logEvents(cand.id, 2, [{ type: "similar_code", detail: { problem: g.row.coding_problems?.title ?? g.row.problem_id, score: top } }]);
    }
  }

  await recomputeCoding(cand.id);
  const decision = await advanceCandidate(cand.id, 2, auto);
  return ok({ submitted: true, passed: decision.kind !== "reject" });
}
