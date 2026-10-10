import { describe, expect, it } from "vitest";
import { APTITUDE_SECTIONS, APTITUDE_TOPICS, DSA_TOPICS, groupAptitude, groupDsa } from "./topics";

describe("groupAptitude", () => {
  const rows = [
    { section: "Verbal ability", topic: "Synonyms", active: true },
    { section: "Quantitative", topic: "Percentages", active: true },
    { section: "Quantitative", topic: "Percentages", active: false },
    { section: "Quantitative", topic: "Averages", active: false },
    { section: null, topic: "Misc", active: true },
    { section: "Custom section", topic: "X", active: false },
  ];

  it("orders known sections canonically and counts live versus drafts", () => {
    const g = groupAptitude(rows);
    expect(g.map((s) => s.section)).toEqual(["Quantitative", "Verbal ability", "Custom section", "Uncategorised"]);
    const quant = g[0];
    expect(quant).toMatchObject({ live: 1, drafts: 2, total: 3 });
    expect(quant.topics[0]).toEqual({ topic: "Percentages", live: 1, drafts: 1, total: 2 });
  });

  it("never drops rows without a section", () => {
    const total = groupAptitude(rows).reduce((n, s) => n + s.total, 0);
    expect(total).toBe(rows.length);
  });

  it("every canonical section has topics, with no duplicates", () => {
    for (const s of APTITUDE_SECTIONS) {
      expect(APTITUDE_TOPICS[s].length).toBeGreaterThan(0);
      expect(new Set(APTITUDE_TOPICS[s]).size).toBe(APTITUDE_TOPICS[s].length);
    }
  });
});

describe("groupDsa", () => {
  it("counts a multi-topic problem under each of its topics", () => {
    const g = groupDsa([
      { topics: ["Arrays", "Hash maps"], active: true },
      { topics: ["Arrays"], active: false },
      { topics: [], active: true },
    ]);
    expect(g.find((t) => t.topic === "Arrays")).toMatchObject({ live: 1, drafts: 1, total: 2 });
    expect(g.find((t) => t.topic === "Hash maps")).toMatchObject({ live: 1, total: 1 });
    expect(g.at(-1)?.topic).toBe("Uncategorised");
  });

  it("has a sensible, duplicate-free topic list", () => {
    expect(new Set(DSA_TOPICS).size).toBe(DSA_TOPICS.length);
  });
});
