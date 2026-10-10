import "server-only";
import { cache } from "react";
import { CANDIDATE_STATUSES, type CandidateStatus } from "@app/shared";
import { userDb } from "@/server/db/user";
import { requireStaff } from "@/server/auth";
import { CANDIDATES_PAGE_SIZE } from "./schemas";

export interface CandidateRow {
  id: string;
  name: string;
  email: string;
  inviteCode: string;
  status: CandidateStatus;
  finalScore: number | null;
  awaitingApproval: number | null;
}

/** One page of candidates plus the total, newest first. Only the columns the list renders. */
export async function listCandidates(page: number) {
  await requireStaff();
  const db = await userDb();
  const from = (page - 1) * CANDIDATES_PAGE_SIZE;
  const { data, count } = await db
    .from("candidates")
    .select("id,name,email,invite_code,status,final_score,awaiting_approval", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + CANDIDATES_PAGE_SIZE - 1);

  const rows: CandidateRow[] = (data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    inviteCode: c.invite_code,
    status: c.status as CandidateStatus,
    finalScore: c.final_score,
    awaitingApproval: c.awaiting_approval,
  }));
  return { rows, total: count ?? 0, pageSize: CANDIDATES_PAGE_SIZE };
}

/** Counts per status via one head query each, so no candidate rows are transferred. */
export async function statusCounts(): Promise<Record<CandidateStatus, number>> {
  await requireStaff();
  const db = await userDb();
  const entries = await Promise.all(
    CANDIDATE_STATUSES.map(async (s) => {
      const { count } = await db.from("candidates").select("id", { count: "exact", head: true }).eq("status", s);
      return [s, count ?? 0] as const;
    }),
  );
  return Object.fromEntries(entries) as Record<CandidateStatus, number>;
}

/** Everything the detail page shows, fetched in parallel. */
export const getCandidateDetail = cache(async (id: string) => {
  await requireStaff();
  const db = await userDb();
  const { data: candidate } = await db.from("candidates").select("*").eq("id", id).maybeSingle();
  if (!candidate) return null;

  const [r1, r2, r3, events, reviews, emails, audit] = await Promise.all([
    db.from("r1_attempts").select("submitted_at,score,elapsed_ms").eq("candidate_id", id).maybeSingle(),
    db.from("r2_attempts").select("*").eq("candidate_id", id).maybeSingle(),
    db.from("r3_assignments").select("*, machine_tasks(title,rubric)").eq("candidate_id", id).maybeSingle(),
    db.from("proctoring_events").select("id,round,type,detail,at").eq("candidate_id", id).order("at"),
    db.from("reviews").select("*, profiles(email)").eq("candidate_id", id).order("created_at"),
    db.from("email_log").select("id,template,status,clicks,created_at").eq("candidate_id", id).order("created_at"),
    db.from("audit_log").select("id,table_name,action,old_data,new_data,at").eq("row_id", id).order("at", { ascending: false }).limit(30),
  ]);

  const attemptId = r2.data?.id;
  const problemRows = attemptId
    ? ((
        await db
          .from("r2_attempt_problems")
          .select("id,position,language,tests_passed,tests_total,auto_score,submitted_at,coding_problems(title,difficulty,topics)")
          .eq("attempt_id", attemptId)
          .order("position")
      ).data ?? [])
    : [];
  const problemIds = problemRows.map((p) => p.id);
  const [snapshots, similar] = attemptId
    ? await Promise.all([
        db.from("r2_snapshots").select("attempt_problem_id,at,language,code").eq("attempt_id", attemptId).order("at"),
        problemIds.length
          ? db.from("r2_problem_similarity").select("attempt_problem_id,score").in("attempt_problem_id", problemIds).order("score", { ascending: false })
          : Promise.resolve({ data: [] as { attempt_problem_id: string; score: number }[] }),
      ])
    : [{ data: [] }, { data: [] }];

  const r2Problems = problemRows.map((p) => ({
    ...p,
    snapshots: (snapshots.data ?? []).filter((s) => s.attempt_problem_id === p.id),
    similar: (similar.data ?? []).filter((s) => s.attempt_problem_id === p.id),
  }));

  return {
    candidate,
    r1: r1.data,
    r2: r2.data,
    r3: r3.data,
    events: events.data ?? [],
    reviews: reviews.data ?? [],
    emails: emails.data ?? [],
    audit: audit.data ?? [],
    r2Problems,
  };
});
