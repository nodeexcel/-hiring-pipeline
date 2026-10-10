/** Mulberry32 seeded PRNG so papers are reproducible from a stored seed. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: readonly T[], rand: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Pick `count` ids in random order; each candidate gets a different order/subset. */
export function drawPaper(ids: readonly string[], count: number, seed: number): string[] {
  return shuffle(ids, mulberry32(seed)).slice(0, Math.min(count, ids.length));
}

/** Pick a random task, avoiding ones the candidate already had when possible. */
export function pickTask(
  poolIds: readonly string[],
  alreadyAssigned: readonly string[],
  rand: () => number = Math.random,
): string | null {
  if (poolIds.length === 0) return null;
  const fresh = poolIds.filter((id) => !alreadyAssigned.includes(id));
  const source = fresh.length > 0 ? fresh : poolIds;
  return source[Math.floor(rand() * source.length)];
}
