import "server-only";
import type { Language } from "@app/shared";
import { env } from "@/server/env";
import { sameOutput, type CodeRunner } from "./types";

const LANGUAGE_ID: Record<Language, number> = { javascript: 63, python: 71, java: 62, cpp: 54 };

/** Needs a cgroup v1 host (see infra/README.md). */
export const judge0Runner: CodeRunner = {
  async run({ language, code, stdin, expected, timeLimitS = 2 }) {
    const res = await fetch(`${env().JUDGE0_URL}/submissions?base64_encoded=false&wait=true`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ language_id: LANGUAGE_ID[language], source_code: code, stdin, cpu_time_limit: timeLimitS }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`runner unavailable (${res.status})`);
    const j = await res.json();
    if (j.status?.id === 13) throw new Error("runner sandbox error"); // Internal Error
    const stdout: string = j.stdout ?? "";
    const accepted = j.status?.id === 3 || j.status?.id === 4;
    return {
      stdout,
      stderr: j.stderr ?? j.compile_output ?? "",
      passed: accepted && (expected === undefined || sameOutput(stdout, expected)),
      status: j.status?.description ?? "Unknown",
      timeMs: j.time ? Math.round(Number(j.time) * 1000) : null,
    };
  },
};
