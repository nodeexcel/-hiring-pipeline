import type { Language } from "@app/shared";

export interface RunResult {
  stdout: string;
  stderr: string;
  passed: boolean;
  status: string;
  timeMs: number | null;
}

export interface RunArgs {
  language: Language;
  code: string;
  stdin: string;
  expected?: string;
  timeLimitS?: number;
}

/** A sandboxed code execution backend. Swap implementations without touching callers. */
export interface CodeRunner {
  run(args: RunArgs): Promise<RunResult>;
}

/** Compares output ignoring trailing whitespace and CRLF differences. */
export function sameOutput(actual: string, expected: string): boolean {
  const norm = (s: string) => s.replace(/\r\n/g, "\n").trim().split("\n").map((l) => l.trimEnd()).join("\n");
  return norm(actual) === norm(expected);
}
