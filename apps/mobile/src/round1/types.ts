export interface PaperQuestion {
  id: string;
  topic: string;
  body: string;
  options: string[];
}

export interface Paper {
  attemptId: string;
  durationMinutes: number;
  questions: PaperQuestion[];
  signingSecret: string;
}

export interface RulesInfo {
  version: string;
  firstName: string;
  questionCount: number;
  durationMinutes: number;
  rules: string[];
}

export interface FlagEvent {
  type: string;
  detail?: unknown;
  at: string;
}

export type Phase = "boot" | "code" | "rules" | "downloading" | "ready" | "test" | "review" | "submitting" | "done";
