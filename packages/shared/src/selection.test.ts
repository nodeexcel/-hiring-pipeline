import { describe, expect, it } from "vitest";
import { composePaper, composeProblems, type ProblemLike, type QuestionLike } from "./selection";

const SECTIONS = ["Quantitative", "Logical reasoning", "Verbal ability", "Data interpretation"];
const bank = (perTopic = 3, topicsPerSection = 5): QuestionLike[] =>
  SECTIONS.flatMap((s) =>
    Array.from({ length: topicsPerSection }, (_, t) =>
      Array.from({ length: perTopic }, (_, i) => ({ id: `${s}-${t}-${i}`, section: s, topic: `T${t}`, served: 0 })),
    ).flat(),
  );

describe("composePaper", () => {
  it("never repeats an item and returns the requested count", () => {
    const paper = composePaper(bank(), { count: 20, seed: 1 });
    expect(paper).toHaveLength(20);
    expect(new Set(paper.map((q) => q.id)).size).toBe(20);
  });

  it("spreads evenly across sections and caps questions per topic", () => {
    for (let seed = 1; seed <= 25; seed++) {
      const paper = composePaper(bank(), { count: 20, seed, maxPerTopic: 2 });
      for (const s of SECTIONS) expect(paper.filter((q) => q.section === s)).toHaveLength(5);
      const perTopic = new Map<string, number>();
      for (const q of paper) perTopic.set(`${q.section}/${q.topic}`, (perTopic.get(`${q.section}/${q.topic}`) ?? 0) + 1);
      expect(Math.max(...perTopic.values())).toBeLessThanOrEqual(2);
    }
  });

  it("serves the least-shown questions first so exposure rotates", () => {
    const pool = bank(4, 2).map((q, i) => ({ ...q, served: i % 4 === 0 ? 0 : 50 })); // 1 fresh question in 4
    const paper = composePaper(pool, { count: 8, seed: 7, maxPerTopic: 2 });
    // 4 sections x 2 topics = 8 fresh questions exist; all of them should be chosen
    expect(paper.every((q) => q.served === 0)).toBe(true);
  });

  it("produces different papers for different candidates", () => {
    const a = composePaper(bank(), { count: 20, seed: 1 }).map((q) => q.id).join();
    const b = composePaper(bank(), { count: 20, seed: 2 }).map((q) => q.id).join();
    expect(a).not.toBe(b);
  });

  it("is reproducible for the same seed", () => {
    const a = composePaper(bank(), { count: 20, seed: 9 }).map((q) => q.id);
    const b = composePaper(bank(), { count: 20, seed: 9 }).map((q) => q.id);
    expect(a).toEqual(b);
  });

  it("degrades gracefully on a small bank instead of issuing a short paper", () => {
    const small = bank(1, 1); // 4 questions, one per section
    expect(composePaper(small, { count: 20, seed: 3 })).toHaveLength(4);
    // one section only, cap would limit it to 2, but we still want 5
    const one = Array.from({ length: 6 }, (_, i) => ({ id: `q${i}`, section: "Quantitative", topic: "Same", served: 0 }));
    expect(composePaper(one, { count: 5, seed: 3, maxPerTopic: 2 })).toHaveLength(5);
  });

  it("handles empty banks and questions without a section", () => {
    expect(composePaper([], { count: 5, seed: 1 })).toEqual([]);
    const noSection = Array.from({ length: 5 }, (_, i) => ({ id: `n${i}`, section: null, topic: `t${i}`, served: 0 }));
    expect(composePaper(noSection, { count: 3, seed: 1 })).toHaveLength(3);
  });
});

describe("composeProblems", () => {
  const P = (id: string, difficulty: string, topics: string[], served = 0): ProblemLike => ({ id, difficulty, topics, served });
  const pool = [
    P("e1", "easy", ["Arrays"]), P("e2", "easy", ["Strings"]),
    P("m1", "medium", ["Hash maps"]), P("m2", "medium", ["Stacks"]),
    P("h1", "hard", ["Graphs"]), P("h2", "hard", ["Dynamic programming"]),
  ];

  it("returns three distinct problems ramping in difficulty", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const picks = composeProblems(pool, { count: 3, seed });
      expect(picks).toHaveLength(3);
      expect(new Set(picks.map((p) => p.id)).size).toBe(3);
      expect(picks.map((p) => p.difficulty)).toEqual(["easy", "medium", "hard"]);
    }
  });

  it("avoids repeating topics when it can", () => {
    const overlapping = [P("a", "easy", ["Arrays"]), P("b", "easy", ["Arrays"]), P("c", "easy", ["Strings"]), P("d", "easy", ["Stacks"])];
    for (let seed = 1; seed <= 20; seed++) {
      const topics = composeProblems(overlapping, { count: 3, seed }).flatMap((p) => p.topics);
      expect(new Set(topics).size).toBe(topics.length);
    }
  });

  it("prefers the least-served problem among equals", () => {
    const eq = [P("x", "easy", ["Arrays"], 9), P("y", "easy", ["Arrays"], 0)];
    expect(composeProblems(eq, { count: 1, seed: 1 }).map((p) => p.id)).toEqual(["y"]);
  });

  it("works with fewer problems than requested", () => {
    expect(composeProblems([P("only", "easy", ["Arrays"])], { count: 3, seed: 1 })).toHaveLength(1);
    expect(composeProblems([], { count: 3, seed: 1 })).toEqual([]);
  });
});
