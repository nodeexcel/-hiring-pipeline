import type { FlagEvent, Paper, Phase, RulesInfo } from "./types";

/** Everything the UI needs, as one plain object so transitions are pure and testable. */
export interface State {
  phase: Phase;
  code: string;
  info: RulesInfo | null;
  rulesAccepted: boolean;
  paper: Paper | null;
  answers: Record<string, number>;
  flagged: string[];
  index: number;
  error: string | null;
  /** True once the candidate submitted or time ran out: the test can no longer be changed. */
  finished: boolean;
  events: FlagEvent[];
}

export const initialState: State = {
  phase: "boot",
  code: "",
  info: null,
  rulesAccepted: false,
  paper: null,
  answers: {},
  flagged: [],
  index: 0,
  error: null,
  finished: false,
  events: [],
};

export type Action =
  | { type: "BOOTED" }
  | { type: "RESTORED"; state: Partial<State> & { phase: Phase } }
  | { type: "CODE_CHANGED"; code: string }
  | { type: "RULES_LOADED"; code: string; info: RulesInfo }
  | { type: "RULES_ACCEPTED" }
  | { type: "DOWNLOAD_STARTED" }
  | { type: "PAPER_READY"; paper: Paper }
  | { type: "STARTED" }
  | { type: "ANSWERED"; questionId: string; option: number }
  | { type: "CLEARED"; questionId: string }
  | { type: "FLAG_TOGGLED"; questionId: string }
  | { type: "GOTO"; index: number }
  | { type: "REVIEW_OPENED" }
  | { type: "REVIEW_CLOSED" }
  | { type: "SUBMIT_STARTED" }
  | { type: "SUBMIT_FAILED"; message: string }
  | { type: "SUBMITTED" }
  | { type: "ERROR"; message: string }
  | { type: "ERROR_CLEARED" }
  | { type: "EVENT"; event: FlagEvent }
  | { type: "RESET" };

import { pushEvent } from "./events";

const clamp = (i: number, n: number) => Math.min(Math.max(0, i), Math.max(0, n - 1));

export function reduce(s: State, a: Action): State {
  switch (a.type) {
    case "BOOTED":
      return s.phase === "boot" ? { ...s, phase: "code" } : s;
    case "RESTORED":
      return { ...s, ...a.state };
    case "CODE_CHANGED":
      return { ...s, code: a.code.toUpperCase().replace(/\s+/g, ""), error: null };
    case "RULES_LOADED":
      return { ...s, phase: "rules", code: a.code, info: a.info, rulesAccepted: false, error: null };
    case "RULES_ACCEPTED":
      return s.phase === "rules" ? { ...s, rulesAccepted: true, phase: "downloading", error: null } : s;
    case "DOWNLOAD_STARTED":
      return { ...s, phase: "downloading", error: null };
    case "PAPER_READY":
      return { ...s, paper: a.paper, phase: "ready", answers: {}, flagged: [], index: 0, error: null };
    case "STARTED":
      return s.paper && !s.finished ? { ...s, phase: "test", error: null } : s;
    case "ANSWERED":
      if (s.finished || !s.paper?.questions.some((q) => q.id === a.questionId)) return s;
      return { ...s, answers: { ...s.answers, [a.questionId]: a.option } };
    case "CLEARED": {
      if (s.finished) return s;
      const { [a.questionId]: _removed, ...rest } = s.answers;
      void _removed;
      return { ...s, answers: rest };
    }
    case "FLAG_TOGGLED":
      return s.flagged.includes(a.questionId)
        ? { ...s, flagged: s.flagged.filter((id) => id !== a.questionId) }
        : { ...s, flagged: [...s.flagged, a.questionId] };
    case "GOTO":
      return { ...s, index: clamp(a.index, s.paper?.questions.length ?? 0), phase: s.phase === "review" ? "test" : s.phase };
    case "REVIEW_OPENED":
      return s.phase === "test" ? { ...s, phase: "review" } : s;
    case "REVIEW_CLOSED":
      return s.phase === "review" ? { ...s, phase: "test" } : s;
    case "SUBMIT_STARTED":
      return { ...s, phase: "submitting", finished: true, error: null };
    case "SUBMIT_FAILED":
      return { ...s, phase: "submitting", error: a.message };
    case "SUBMITTED":
      return { ...s, phase: "done", finished: true, error: null };
    case "ERROR":
      return { ...s, error: a.message };
    case "ERROR_CLEARED":
      return { ...s, error: null };
    case "EVENT":
      return { ...s, events: pushEvent(s.events, a.event) };
    case "RESET":
      return { ...initialState, phase: "code" };
  }
}

/** Counts used by the review screen and the submit confirmation. */
export function progress(s: Pick<State, "paper" | "answers" | "flagged">) {
  const total = s.paper?.questions.length ?? 0;
  const answered = s.paper ? s.paper.questions.filter((q) => s.answers[q.id] !== undefined).length : 0;
  return { total, answered, unanswered: total - answered, flagged: s.flagged.length };
}
