import { describe, expect, it } from "vitest";
import { mapAppsRow, sampleEvenly } from "./import";

const row = (over: Record<string, unknown> = {}, io: unknown = { inputs: ["1 2\n", "3 4\n", "5 6\n"], outputs: ["3\n", "7\n", "11\n"] }) => ({
  problem_id: 7,
  question: "Add two numbers.\n\nInput: two ints.",
  difficulty: "introductory",
  url: "https://codeforces.com/problemset/problem/1/A",
  input_output: JSON.stringify(io),
  ...over,
});

describe("mapAppsRow", () => {
  it("maps a stdin/stdout problem and keeps provenance", () => {
    const r = mapAppsRow(row());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.problem).toMatchObject({
      externalId: "7",
      title: "APPS 7: Add two numbers.",
      difficulty: "introductory",
      sourceUrl: "https://codeforces.com/problemset/problem/1/A",
    });
    expect(r.problem.tests).toHaveLength(3);
    expect(r.problem.tests[0]).toEqual({ input: "1 2\n", expected_output: "3\n" });
  });

  it("skips function-call problems, which our stdin/stdout runner cannot grade", () => {
    const r = mapAppsRow(row({}, { inputs: [[1]], outputs: [[2]], fn_name: "solve" }));
    expect(r).toEqual({ ok: false, reason: "function-call problem (needs stdin and stdout)" });
  });

  it("skips problems with too few usable tests, and non-text or oversized ones", () => {
    expect(mapAppsRow(row({}, { inputs: ["1"], outputs: ["1"] }))).toMatchObject({ ok: false });
    const big = "x".repeat(6000);
    expect(mapAppsRow(row({}, { inputs: [big, "1", "2"], outputs: ["a", "b", "c"] }))).toMatchObject({ ok: true });
    const r = mapAppsRow(row({}, { inputs: [big, "1", "2"], outputs: ["a", "b", "c"] }));
    expect(r.ok && r.problem.tests).toHaveLength(2); // the oversized case is dropped
  });

  it("rejects malformed rows and invalid JSON", () => {
    expect(mapAppsRow({ nope: true })).toEqual({ ok: false, reason: "unrecognised row shape" });
    expect(mapAppsRow(row({ input_output: "{not json" }))).toEqual({ ok: false, reason: "test cases are not valid JSON" });
  });

  it("caps the number of tests, always keeping the first and last", () => {
    const inputs = Array.from({ length: 565 }, (_, i) => `${i}\n`);
    const r = mapAppsRow(row({}, { inputs, outputs: inputs }), { maxTests: 20, maxInputChars: 100 });
    expect(r.ok && r.problem.tests).toHaveLength(20);
    if (r.ok) {
      expect(r.problem.tests[0].input).toBe("0\n");
      expect(r.problem.tests.at(-1)!.input).toBe("564\n");
    }
  });
});

describe("sampleEvenly", () => {
  it("returns everything when under the cap and a spread otherwise", () => {
    expect(sampleEvenly([1, 2, 3], 5)).toEqual([1, 2, 3]);
    expect(sampleEvenly([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 4)).toEqual([0, 3, 6, 9]);
  });
});
