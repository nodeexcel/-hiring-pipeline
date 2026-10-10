import "server-only";
import type { Language } from "@app/shared";
import { env } from "@/server/env";
import { sameOutput, type CodeRunner } from "./types";

const TARGET: Record<Language, { language: string; file: string }> = {
  javascript: { language: "javascript", file: "main.js" },
  python: { language: "python", file: "main.py" },
  java: { language: "java", file: "Main.java" },
  cpp: { language: "c++", file: "main.cpp" },
};

// Piston rejects requests above its configured ceilings (defaults below) with a 400,
// so clamp to them rather than fail every run. Raise both in the Piston config to allow more.
const MAX_COMPILE_MS = 10_000;
const MAX_RUN_MS = 3_000;

export const pistonRunner: CodeRunner = {
  async run({ language, code, stdin, expected, timeLimitS = 2 }) {
    const t = TARGET[language];
    const res = await fetch(`${env().PISTON_URL}/api/v2/execute`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        language: t.language,
        version: "*",
        files: [{ name: t.file, content: code }],
        stdin,
        compile_timeout: MAX_COMPILE_MS,
        run_timeout: Math.min(Math.round(timeLimitS * 1000), MAX_RUN_MS),
        run_memory_limit: 256 * 1024 * 1024,
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      // Surface the reason in server logs; candidates only ever see a generic retry message.
      console.error(`[runner:piston] ${res.status}`, await res.text().catch(() => ""));
      throw new Error(`runner unavailable (${res.status})`);
    }
    const j = await res.json();
    if (j.compile && j.compile.code !== 0) {
      return { stdout: "", stderr: j.compile.output ?? "", passed: false, status: "Compilation Error", timeMs: null };
    }
    const run = j.run ?? {};
    const timedOut = run.signal === "SIGKILL";
    const ok = run.code === 0 && !timedOut;
    const stdout: string = run.stdout ?? "";
    return {
      stdout,
      stderr: run.stderr ?? "",
      passed: ok && (expected === undefined || sameOutput(stdout, expected)),
      status: timedOut ? "Time Limit Exceeded" : run.code === 0 ? "Finished" : "Runtime Error",
      timeMs: null,
    };
  },
};
