import { describe, expect, it } from "vitest";
import {
  averageReviews,
  codingScore,
  decideAfterRound,
  drawPaper,
  finalScore,
  pickTask,
  scoreMcq,
  similarity,
} from "./index";

describe("decideAfterRound", () => {
  it("rejects below cutoff with a rejection email", () => {
    const d = decideAfterRound(1, 39, { cutoff: 40, autoAdvance: true });
    expect(d).toEqual({ kind: "reject", status: "Rejected", email: "rejection" });
  });
  it("auto-advances R1 to R2 and sends the invite", () => {
    const d = decideAfterRound(1, 40, { cutoff: 40, autoAdvance: true });
    expect(d).toEqual({ kind: "advance", status: "R1 done", email: "round2_invite", needsApproval: false });
  });
  it("queues for approval when auto-advance is off", () => {
    const d = decideAfterRound(2, 80, { cutoff: 50, autoAdvance: false });
    expect(d).toMatchObject({ kind: "advance", status: "R2 done", email: null, needsApproval: true });
  });
  it("waits for the final decision after R3", () => {
    expect(decideAfterRound(3, 70, { cutoff: 50, autoAdvance: true })).toEqual({
      kind: "await_final",
      status: "R3 submitted",
    });
  });
});

describe("scoring", () => {
  it("weights 20/40/40 by default", () => {
    expect(finalScore({ r1: 100, r2: 50, r3: 0 })).toBe(40);
  });
  it("normalizes custom weights", () => {
    expect(finalScore({ r1: 100, r2: 0, r3: 0 }, { r1: 1, r2: 1, r3: 2 })).toBe(25);
  });
  it("averages reviewer scores", () => {
    expect(averageReviews([70, 80, 90])).toBe(80);
    expect(averageReviews([])).toBeNull();
  });
  it("blends coding auto score with reviewer score", () => {
    expect(codingScore(5, 10, null)).toBe(50);
    expect(codingScore(10, 10, 50)).toBe(85);
  });
  it("scores MCQs", () => {
    expect(scoreMcq({ a: 1, b: 2, c: 0 }, { a: 1, b: 0, c: 0 })).toEqual({ correct: 2, total: 3, percent: 66.67 });
  });
});

describe("randomization", () => {
  const ids = Array.from({ length: 30 }, (_, i) => `q${i}`);
  it("is reproducible per seed and differs across seeds", () => {
    expect(drawPaper(ids, 10, 1)).toEqual(drawPaper(ids, 10, 1));
    expect(drawPaper(ids, 10, 1)).not.toEqual(drawPaper(ids, 10, 2));
    expect(drawPaper(ids, 10, 1)).toHaveLength(10);
  });
  it("avoids repeating machine tasks when possible", () => {
    for (let i = 0; i < 50; i++) expect(pickTask(["a", "b", "c"], ["a", "b"])).toBe("c");
    expect(["a", "b"]).toContain(pickTask(["a", "b"], ["a", "b"]));
    expect(pickTask([], [])).toBeNull();
  });
});

describe("similarity", () => {
  const a = `def solve(nums):\n    total = 0\n    for n in nums:\n        if n % 2 == 0:\n            total += n\n    return total\n`;
  const renamed = `def run(values):\n    s = 0\n    for v in values:\n        if v % 2 == 0:\n            s += v\n    return s\n`;
  const different = `import heapq\ndef solve(graph, src):\n    dist = {src: 0}\n    pq = [(0, src)]\n    while pq:\n        d, u = heapq.heappop(pq)\n        for v, w in graph[u]:\n            nd = d + w\n            if nd < dist.get(v, 1e18):\n                dist[v] = nd\n                heapq.heappush(pq, (nd, v))\n    return dist\n`;
  it("flags renamed copies", () => expect(similarity(a, renamed)).toBeGreaterThan(0.8));
  it("does not flag unrelated code", () => expect(similarity(a, different)).toBeLessThan(0.2));
});

import { createCipheriv, createHmac, randomBytes } from "node:crypto";
import { decryptJson, encryptJson, signAnswers } from "./index";

describe("paper crypto (server <-> mobile compatibility)", () => {
  it("decrypts what the server's node:crypto AES-256-GCM produced", () => {
    const key = randomBytes(32);
    const iv = randomBytes(12);
    const c = createCipheriv("aes-256-gcm", key, iv);
    const payload = { questions: [{ id: "q1", body: "héllo ✓ 日本語 🚀" }], durationMinutes: 30 };
    const ct = Buffer.concat([c.update(JSON.stringify(payload), "utf8"), c.final()]);
    const blob = { iv: iv.toString("base64"), data: Buffer.concat([ct, c.getAuthTag()]).toString("base64") };
    expect(decryptJson(key.toString("base64"), blob)).toEqual(payload);
  });
  it("round-trips a large payload (base64 chunking)", () => {
    const key = randomBytes(32).toString("base64");
    const big = { text: "x".repeat(300_000) };
    expect(decryptJson(key, encryptJson(key, big, randomBytes(12)))).toEqual(big);
  });
  it("round-trips and rejects tampering", () => {
    const key = randomBytes(32).toString("base64");
    const blob = encryptJson(key, { a: [1, 2, 3] }, randomBytes(12));
    expect(decryptJson(key, blob)).toEqual({ a: [1, 2, 3] });
    const bad = { ...blob, data: blob.data.slice(0, -4) + "AAAA" };
    expect(() => decryptJson(key, bad)).toThrow();
  });
  it("signs identically to node's HMAC and is order independent", () => {
    const answers = { b: 2, a: 1 };
    const canonical = JSON.stringify({ answers: [["a", 1], ["b", 2]], elapsedMs: 1234 });
    expect(signAnswers("s3cret", answers, 1234)).toBe(createHmac("sha256", "s3cret").update(canonical).digest("hex"));
    expect(signAnswers("s3cret", { a: 1, b: 2 }, 1234)).toBe(signAnswers("s3cret", answers, 1234));
  });
});

import { inviteCodeSchema, proctoringEventsSchema, r1SettingsSchema, r2SettingsSchema, r3SettingsSchema } from "./index";

describe("settings and request schemas", () => {
  it("falls back to defaults for missing or malformed settings JSON", () => {
    expect(r1SettingsSchema.parse({})).toEqual({ questions: 20, duration_minutes: 30, max_per_topic: 2 });
    expect(r1SettingsSchema.parse({ questions: "abc", duration_minutes: -5 })).toEqual({ questions: 20, duration_minutes: 30, max_per_topic: 2 });
    expect(r1SettingsSchema.parse({ questions: "15" }).questions).toBe(15);
    expect(r2SettingsSchema.parse({ auto_share: 7, enforce_seb: "yes" })).toMatchObject({ auto_share: 0.7, enforce_seb: false, problem_count: 3 });
    expect(r3SettingsSchema.parse({ deadline_days: 5 })).toEqual({ deadline_days: 5 });
  });
  it("normalises invite codes and rejects short ones", () => {
    expect(inviteCodeSchema.parse("  ab12cd34ef ")).toBe("AB12CD34EF");
    expect(inviteCodeSchema.safeParse("abc").success).toBe(false);
  });
  it("caps the number of proctoring events per request", () => {
    expect(proctoringEventsSchema.safeParse(Array.from({ length: 201 }, () => ({ type: "x" }))).success).toBe(false);
    expect(proctoringEventsSchema.safeParse([{ type: "paste", detail: { size: 3 } }]).success).toBe(true);
  });
});

import { blendCodingScore, meanScore } from "./index";

describe("multi-problem coding score", () => {
  it("weights each problem equally regardless of its number of tests", () => {
    // 10/10 tests on one problem and 0/90 on another is 50, not 10
    expect(meanScore([100, 0])).toBe(50);
    expect(meanScore([])).toBe(0);
  });
  it("blends with the reviewer score when present", () => {
    expect(blendCodingScore(80, null)).toBe(80);
    expect(blendCodingScore(100, 50)).toBe(85);
  });
});
