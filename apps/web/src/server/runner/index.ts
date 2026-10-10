import "server-only";
import { env } from "@/server/env";
import { judge0Runner } from "./judge0";
import { pistonRunner } from "./piston";
import type { CodeRunner } from "./types";

export type { CodeRunner, RunResult } from "./types";

export function getRunner(): CodeRunner {
  return env().RUNNER === "judge0" ? judge0Runner : pistonRunner;
}
