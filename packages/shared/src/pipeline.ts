export const CANDIDATE_STATUSES = [
  "Invited",
  "R1 done",
  "R2 done",
  "R3 sent",
  "R3 submitted",
  "Selected",
  "Rejected",
] as const;
export type CandidateStatus = (typeof CANDIDATE_STATUSES)[number];

export type Round = 1 | 2 | 3;

export interface RoundConfig {
  cutoff: number; // 0-100 pass mark
  autoAdvance: boolean;
}

export interface Weights {
  r1: number;
  r2: number;
  r3: number;
}

export const DEFAULT_WEIGHTS: Weights = { r1: 20, r2: 40, r3: 40 };

export type Decision =
  | { kind: "reject"; status: "Rejected"; email: "rejection" }
  | { kind: "advance"; status: CandidateStatus; email: string | null; needsApproval: boolean }
  | { kind: "await_final"; status: CandidateStatus };

const NEXT_STATUS: Record<Round, CandidateStatus> = {
  1: "R1 done",
  2: "R2 done",
  3: "R3 submitted",
};

/** Decide what happens after a candidate's score in a round is recorded. */
export function decideAfterRound(round: Round, score: number, cfg: RoundConfig): Decision {
  if (score < cfg.cutoff) {
    return { kind: "reject", status: "Rejected", email: "rejection" };
  }
  if (round === 3) {
    return { kind: "await_final", status: NEXT_STATUS[3] };
  }
  const email = round === 1 ? "round2_invite" : "round3_task";
  return {
    kind: "advance",
    status: NEXT_STATUS[round],
    email: cfg.autoAdvance ? email : null,
    needsApproval: !cfg.autoAdvance,
  };
}

export function normalizeWeights(w: Weights): Weights {
  const total = w.r1 + w.r2 + w.r3;
  if (total <= 0) throw new Error("Weights must sum to a positive number");
  return { r1: (w.r1 / total) * 100, r2: (w.r2 / total) * 100, r3: (w.r3 / total) * 100 };
}

/** Weighted total on a 0-100 scale. Scores are 0-100 each. */
export function finalScore(
  scores: { r1: number; r2: number; r3: number },
  weights: Weights = DEFAULT_WEIGHTS,
): number {
  const w = normalizeWeights(weights);
  const total = (scores.r1 * w.r1 + scores.r2 * w.r2 + scores.r3 * w.r3) / 100;
  return Math.round(total * 100) / 100;
}

/** Average of multiple reviewer scores; null when there are none. */
export function averageReviews(scores: number[]): number | null {
  if (scores.length === 0) return null;
  const sum = scores.reduce((a, b) => a + b, 0);
  return Math.round((sum / scores.length) * 100) / 100;
}

/** Round 2 score: auto test-case score blended with the reviewer's rubric score. */
export function codingScore(
  passed: number,
  total: number,
  reviewerScore: number | null,
  autoShare = 0.7,
): number {
  const auto = total === 0 ? 0 : (passed / total) * 100;
  if (reviewerScore === null) return Math.round(auto * 100) / 100;
  return Math.round((auto * autoShare + reviewerScore * (1 - autoShare)) * 100) / 100;
}

/**
 * Round 2 score for a candidate with several problems: the mean of the per-problem pass rates
 * (each problem counts equally, whatever its number of tests), blended with the reviewer score.
 */
export function blendCodingScore(autoScore: number, reviewerScore: number | null, autoShare = 0.7): number {
  if (reviewerScore === null) return Math.round(autoScore * 100) / 100;
  return Math.round((autoScore * autoShare + reviewerScore * (1 - autoShare)) * 100) / 100;
}

export function meanScore(scores: readonly number[]): number {
  if (scores.length === 0) return 0;
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100;
}

export function scoreMcq(
  answers: Record<string, number>,
  key: Record<string, number>,
): { correct: number; total: number; percent: number } {
  const ids = Object.keys(key);
  const correct = ids.filter((id) => answers[id] === key[id]).length;
  const total = ids.length;
  return { correct, total, percent: total === 0 ? 0 : Math.round((correct / total) * 10000) / 100 };
}
