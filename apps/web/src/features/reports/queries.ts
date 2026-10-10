import "server-only";
import { averageReviews } from "@app/shared";
import { userDb } from "@/server/db/user";
import { requireStaff } from "@/server/auth";

const band = (s: number) => Math.min(9, Math.floor(s / 10));

export async function getReport() {
  await requireStaff();
  const db = await userDb();
  const [cfg, r1, r2, r3] = await Promise.all([
    db.from("round_config").select("round,cutoff"),
    db.from("r1_attempts").select("score").not("submitted_at", "is", null),
    db.from("r2_attempts").select("score").not("submitted_at", "is", null),
    db.from("reviews").select("candidate_id,score").eq("round", 3),
  ]);
  const cutoff = Object.fromEntries((cfg.data ?? []).map((c) => [c.round, Number(c.cutoff)]));

  const perCandidate = new Map<string, number[]>();
  r3.data?.forEach((r) => perCandidate.set(r.candidate_id, [...(perCandidate.get(r.candidate_id) ?? []), Number(r.score)]));

  const scores = {
    1: (r1.data ?? []).map((r) => Number(r.score)),
    2: (r2.data ?? []).map((r) => Number(r.score)),
    3: [...perCandidate.values()].map((v) => averageReviews(v) as number),
  } as const;

  const avg = (v: number[]) => (v.length ? Number((v.reduce((a, b) => a + b, 0) / v.length).toFixed(1)) : null);
  const rate = (round: 1 | 2 | 3) => ({
    round: `Round ${round}`,
    passed: scores[round].filter((s) => s >= cutoff[round]).length,
    failed: scores[round].filter((s) => s < cutoff[round]).length,
  });

  return {
    averages: { r1: avg(scores[1]), r2: avg(scores[2]), r3: avg(scores[3]) },
    counts: { r1: scores[1].length, r2: scores[2].length, r3: scores[3].length },
    passRates: [rate(1), rate(2), rate(3)],
    distribution: Array.from({ length: 10 }, (_, i) => ({
      bucket: `${i * 10}-${i === 9 ? 100 : i * 10 + 9}`,
      r1: scores[1].filter((s) => band(s) === i).length,
      r2: scores[2].filter((s) => band(s) === i).length,
      r3: scores[3].filter((s) => band(s) === i).length,
    })),
  };
}
