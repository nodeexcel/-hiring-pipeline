import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { elapsedMs, formatClock, isExpired, remainingMs, resumedBaseMs, startClock } from "./clock";
import { makeEvent, pushEvent } from "./events";
import { initialState, progress, reduce, type State } from "./state";
import type { Paper } from "./types";

const paper: Paper = {
  attemptId: "a1",
  durationMinutes: 30,
  signingSecret: "s",
  questions: [1, 2, 3].map((n) => ({ id: `q${n}`, topic: "t", body: `Question ${n}`, options: ["a", "b", "c", "d"] })),
};
const at = (s: State, ...actions: Parameters<typeof reduce>[1][]) => actions.reduce(reduce, s);
const ready = (): State => at({ ...initialState, phase: "code" }, { type: "PAPER_READY", paper });

describe("clock", () => {
  const MIN = 60_000;

  it("counts monotonic time when both clocks move together", () => {
    const c = startClock(0, 1000, 5_000_000);
    expect(elapsedMs(c, 1000 + 5 * MIN, 5_000_000 + 5 * MIN)).toBe(5 * MIN);
  });

  it("does not let a clock moved BACK buy time", () => {
    const c = startClock(0, 0, 10 * 60 * MIN);
    // 5 minutes really pass, but the user sets the date back by an hour
    expect(elapsedMs(c, 5 * MIN, 10 * 60 * MIN - 55 * MIN)).toBe(5 * MIN);
  });

  it("does not let phone sleep pause the timer (monotonic stands still, wall clock does not)", () => {
    const c = startClock(0, 0, 0);
    expect(elapsedMs(c, 1 * MIN, 10 * MIN)).toBe(10 * MIN);
  });

  it("only ever costs the candidate time when the clock is moved forward", () => {
    const c = startClock(0, 0, 0);
    expect(elapsedMs(c, 2 * MIN, 3 * 60 * MIN)).toBe(3 * 60 * MIN);
    expect(isExpired(30 * MIN, c, 2 * MIN, 3 * 60 * MIN)).toBe(true);
  });

  it("never reports negative elapsed time", () => {
    const c = startClock(0, 1000, 1000);
    expect(elapsedMs(c, 500, 400)).toBe(0);
  });

  it("counts the time the app was closed when it is reopened", () => {
    // 10 minutes used when last saved; the app is reopened 20 minutes later
    const base = resumedBaseMs(10 * MIN, 1_000_000, 1_000_000 + 20 * MIN);
    expect(base).toBe(30 * MIN);
    const c = startClock(base, 42, 1_000_000 + 20 * MIN);
    expect(remainingMs(60 * MIN, c, 42, 1_000_000 + 20 * MIN)).toBe(30 * MIN);
  });

  it("a clock moved back while the app was closed adds nothing and subtracts nothing", () => {
    expect(resumedBaseMs(10 * MIN, 5_000_000, 5_000_000 - 3 * 60 * MIN)).toBe(10 * MIN);
  });

  it("expires exactly at the limit and never goes negative", () => {
    const c = startClock(0, 0, 0);
    expect(isExpired(1000, c, 999, 999)).toBe(false);
    expect(isExpired(1000, c, 1000, 1000)).toBe(true);
    expect(remainingMs(1000, c, 99_999, 99_999)).toBe(0);
  });

  it("formats mm:ss and rounds partial seconds up", () => {
    expect(formatClock(0)).toBe("00:00");
    expect(formatClock(61_000)).toBe("01:01");
    expect(formatClock(59_001)).toBe("01:00");
    expect(formatClock(30 * MIN)).toBe("30:00");
  });
});

describe("events", () => {
  it("collapses a burst of the same event and keeps different ones", () => {
    let q = pushEvent([], makeEvent("internet_on", undefined, "2026-10-10T10:00:00.000Z"));
    q = pushEvent(q, makeEvent("internet_on", undefined, "2026-10-10T10:00:00.400Z"));
    q = pushEvent(q, makeEvent("app_background", undefined, "2026-10-10T10:00:00.500Z"));
    q = pushEvent(q, makeEvent("internet_on", undefined, "2026-10-10T10:00:09.000Z"));
    expect(q.map((e) => e.type)).toEqual(["internet_on", "app_background", "internet_on"]);
  });
  it("caps the queue at what the server accepts", () => {
    let q: ReturnType<typeof pushEvent> = [];
    for (let i = 0; i < 260; i++) q = pushEvent(q, makeEvent(i % 2 ? "a" : "b", i, new Date(i * 10_000).toISOString()));
    expect(q).toHaveLength(200);
    expect(q.at(-1)?.detail).toBe(259);
  });
});

describe("state machine", () => {
  it("normalises the invite code", () => {
    const s = reduce(initialState, { type: "CODE_CHANGED", code: " ab 12cd " });
    expect(s.code).toBe("AB12CD");
  });

  it("goes rules -> downloading only after the rules are accepted", () => {
    const loaded = at(initialState, { type: "RULES_LOADED", code: "ABCDEF1234", info: { version: "v", firstName: "A", questionCount: 3, durationMinutes: 30, rules: ["x"] } });
    expect(loaded.phase).toBe("rules");
    expect(loaded.rulesAccepted).toBe(false);
    expect(reduce(loaded, { type: "RULES_ACCEPTED" }).phase).toBe("downloading");
    // accepting is meaningless outside the rules screen
    expect(reduce(ready(), { type: "RULES_ACCEPTED" }).phase).toBe("ready");
  });

  it("cannot start without a paper, and answers only count for real questions", () => {
    expect(reduce(initialState, { type: "STARTED" }).phase).toBe("boot");
    const s = at(ready(), { type: "STARTED" }, { type: "ANSWERED", questionId: "q1", option: 2 }, { type: "ANSWERED", questionId: "ghost", option: 1 });
    expect(s.phase).toBe("test");
    expect(s.answers).toEqual({ q1: 2 });
  });

  it("lets answers be changed, cleared and flagged, and navigation is clamped", () => {
    let s = at(ready(), { type: "STARTED" }, { type: "ANSWERED", questionId: "q1", option: 0 }, { type: "ANSWERED", questionId: "q1", option: 3 });
    expect(s.answers.q1).toBe(3);
    s = at(s, { type: "CLEARED", questionId: "q1" }, { type: "FLAG_TOGGLED", questionId: "q2" });
    expect(s.answers).toEqual({});
    expect(s.flagged).toEqual(["q2"]);
    expect(reduce(s, { type: "FLAG_TOGGLED", questionId: "q2" }).flagged).toEqual([]);
    expect(reduce(s, { type: "GOTO", index: 99 }).index).toBe(2);
    expect(reduce(s, { type: "GOTO", index: -4 }).index).toBe(0);
  });

  it("freezes the paper once submitted or timed out", () => {
    let s = at(ready(), { type: "STARTED" }, { type: "ANSWERED", questionId: "q1", option: 1 }, { type: "SUBMIT_STARTED" });
    expect(s.finished).toBe(true);
    expect(s.phase).toBe("submitting");
    s = at(s, { type: "ANSWERED", questionId: "q2", option: 1 }, { type: "CLEARED", questionId: "q1" });
    expect(s.answers).toEqual({ q1: 1 });
    // a failed upload stays on the submit screen and keeps the answers for a retry
    s = reduce(s, { type: "SUBMIT_FAILED", message: "offline" });
    expect(s).toMatchObject({ phase: "submitting", error: "offline", finished: true });
    expect(reduce(s, { type: "SUBMITTED" }).phase).toBe("done");
  });

  it("review opens from the test and jumping to a question returns to it", () => {
    let s = at(ready(), { type: "STARTED" }, { type: "REVIEW_OPENED" });
    expect(s.phase).toBe("review");
    s = reduce(s, { type: "GOTO", index: 2 });
    expect(s).toMatchObject({ phase: "test", index: 2 });
  });

  it("reports progress for the review and confirmation screens", () => {
    const s = at(ready(), { type: "STARTED" }, { type: "ANSWERED", questionId: "q1", option: 0 }, { type: "FLAG_TOGGLED", questionId: "q3" });
    expect(progress(s)).toEqual({ total: 3, answered: 1, unanswered: 2, flagged: 1 });
  });
});

const EM_DASH = String.fromCharCode(0x2014); // built at runtime so this file does not contain it

describe("copy", () => {
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((f) => {
      const p = join(dir, f);
      return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(f) ? [p] : [];
    });
  it("has no em dashes anywhere in the app source (house style)", () => {
    const bad = files(join(__dirname, "..")).filter((f) => readFileSync(f, "utf8").includes(EM_DASH));
    expect(bad).toEqual([]);
  });
});
