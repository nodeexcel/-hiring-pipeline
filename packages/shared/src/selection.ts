import { mulberry32, shuffle } from "./random";

/**
 * Paper composition. Pure and seedable, so it is testable and reproducible.
 *
 * Goals, in priority order:
 *   1. never repeat an item inside one paper,
 *   2. spread the paper across sections and topics (no five "percentages" questions),
 *   3. rotate exposure: among equally suitable items, serve the least-shown first,
 *   4. stay random inside those constraints so papers differ between candidates.
 */

export interface QuestionLike {
  id: string;
  section: string | null;
  topic: string;
  /** How many papers this item has already been served in. */
  served: number;
}

export interface PaperOptions {
  count: number;
  seed: number;
  /** At most this many questions from one topic in a paper. Relaxed only if the bank is too small. */
  maxPerTopic?: number;
}

const rank = <T extends { served: number }>(items: T[], rand: () => number): T[] => {
  // random first, then a stable sort by exposure, so ties break differently per seed
  return shuffle(items, rand).sort((a, b) => a.served - b.served);
};

/**
 * Splits `count` across sections as evenly as possible, then fills each section with the
 * least-served questions while respecting `maxPerTopic`. Returns ids in a shuffled order.
 */
export function composePaper<T extends QuestionLike>(pool: readonly T[], options: PaperOptions): T[] {
  const rand = mulberry32(options.seed);
  const total = Math.min(options.count, pool.length);
  if (total <= 0) return [];
  const cap = Math.max(1, options.maxPerTopic ?? 2);

  const bySection = new Map<string, T[]>();
  for (const q of pool) {
    const s = q.section?.trim() || "Uncategorised";
    bySection.set(s, [...(bySection.get(s) ?? []), q]);
  }
  const sections = shuffle([...bySection.keys()], rand);

  // even split, remainder handed out round robin in the (shuffled) section order
  const quota = new Map<string, number>(sections.map((s) => [s, 0]));
  let left = total;
  while (left > 0) {
    let progressed = false;
    for (const s of sections) {
      if (left === 0) break;
      if (quota.get(s)! < bySection.get(s)!.length) {
        quota.set(s, quota.get(s)! + 1);
        left -= 1;
        progressed = true;
      }
    }
    if (!progressed) break;
  }

  const chosen: T[] = [];
  const used = new Set<string>();
  const topicKey = (q: T) => `${q.section ?? ""}\u0000${q.topic}`;
  const topicCount = new Map<string, number>();

  const take = (q: T) => {
    chosen.push(q);
    used.add(q.id);
    topicCount.set(topicKey(q), (topicCount.get(topicKey(q)) ?? 0) + 1);
  };

  // pass 1: honour section quotas and the per-topic cap
  for (const s of sections) {
    let need = quota.get(s)!;
    for (const q of rank(bySection.get(s)!, rand)) {
      if (need === 0) break;
      if ((topicCount.get(topicKey(q)) ?? 0) >= cap) continue;
      take(q);
      need -= 1;
    }
  }

  // pass 2: a section ran out under the cap; fill from anywhere, least served first, still capped
  if (chosen.length < total) {
    for (const q of rank(pool.filter((p) => !used.has(p.id)), rand)) {
      if (chosen.length >= total) break;
      if ((topicCount.get(topicKey(q)) ?? 0) >= cap) continue;
      take(q);
    }
  }

  // pass 3: the bank is small; relax the cap rather than issue a short paper
  if (chosen.length < total) {
    for (const q of rank(pool.filter((p) => !used.has(p.id)), rand)) {
      if (chosen.length >= total) break;
      take(q);
    }
  }

  return shuffle(chosen, rand);
}

export interface ProblemLike {
  id: string;
  difficulty: string | null;
  topics: readonly string[];
  served: number;
}

const DIFFICULTY_ORDER = ["easy", "medium", "hard"] as const;

/**
 * Picks `count` coding problems for one candidate: a ramp of difficulty (easy, medium, then
 * medium or hard), topics that do not overlap where possible, least-served first.
 */
export function composeProblems<T extends ProblemLike>(pool: readonly T[], options: { count: number; seed: number }): T[] {
  const rand = mulberry32(options.seed);
  const total = Math.min(options.count, pool.length);
  if (total <= 0) return [];

  // the difficulty we would like at each position
  const ramp: string[] = Array.from({ length: total }, (_, i) =>
    total === 1 ? "medium" : DIFFICULTY_ORDER[Math.min(2, Math.round((i * 2) / (total - 1)))],
  );
  const near = (want: string, have: string | null) => {
    const w = DIFFICULTY_ORDER.indexOf(want as (typeof DIFFICULTY_ORDER)[number]);
    const h = have ? DIFFICULTY_ORDER.indexOf(have as (typeof DIFFICULTY_ORDER)[number]) : 1;
    return Math.abs(w - (h < 0 ? 1 : h));
  };

  const chosen: T[] = [];
  const usedTopics = new Set<string>();
  for (const want of ramp) {
    const candidates = shuffle(
      pool.filter((p) => !chosen.some((c) => c.id === p.id)),
      rand,
    );
    candidates.sort((a, b) => {
      const overlap = (p: T) => p.topics.filter((t) => usedTopics.has(t)).length;
      return (
        near(want, a.difficulty) - near(want, b.difficulty) || // closest difficulty first
        overlap(a) - overlap(b) || // then fewest repeated topics
        a.served - b.served // then least shown
      );
    });
    const pick = candidates[0];
    if (!pick) break;
    chosen.push(pick);
    pick.topics.forEach((t) => usedTopics.add(t));
  }
  return chosen;
}
