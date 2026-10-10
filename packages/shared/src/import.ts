import { z } from "zod";

/** Pure mapping from open-dataset rows to our question-bank shape. No network, fully testable. */

export interface ImportedTest {
  input: string;
  expected_output: string;
}

export interface ImportedProblem {
  externalId: string;
  title: string;
  statement: string;
  difficulty: string;
  sourceUrl: string | null;
  tests: ImportedTest[];
}

export type MapResult = { ok: true; problem: ImportedProblem } | { ok: false; reason: string };

export interface MapOptions {
  /** Cap per problem: a runner call is made per test case, and datasets ship hundreds. */
  maxTests: number;
  /** Skip tests with huge stdin; they slow the sandbox and add little. */
  maxInputChars: number;
}

export const DEFAULT_MAP_OPTIONS: MapOptions = { maxTests: 20, maxInputChars: 5_000 };

/** A row of the APPS dataset (codeparrot/apps), as served by the Hugging Face datasets server. */
export const appsRowSchema = z.object({
  problem_id: z.number().int(),
  question: z.string().min(1),
  input_output: z.string(),
  difficulty: z.string(),
  url: z.string().nullable().optional(),
});

const ioSchema = z.object({
  inputs: z.array(z.unknown()),
  outputs: z.array(z.unknown()),
  fn_name: z.string().nullish(),
});

/** Evenly spaced picks keep the first and last case and spread the rest across the range. */
export function sampleEvenly<T>(items: readonly T[], count: number): T[] {
  if (items.length <= count) return [...items];
  if (count <= 1) return items.slice(0, 1);
  const out: T[] = [];
  for (let i = 0; i < count; i++) out.push(items[Math.round((i * (items.length - 1)) / (count - 1))]);
  return out;
}

function titleOf(question: string, id: number): string {
  const first = question.split(/\r?\n/).map((l) => l.trim()).find(Boolean) ?? "";
  const short = first.length > 70 ? `${first.slice(0, 67)}...` : first;
  return `APPS ${id}: ${short}`;
}

export function mapAppsRow(raw: unknown, options: MapOptions = DEFAULT_MAP_OPTIONS): MapResult {
  const row = appsRowSchema.safeParse(raw);
  if (!row.success) return { ok: false, reason: "unrecognised row shape" };

  let io: z.infer<typeof ioSchema>;
  try {
    const parsed = ioSchema.safeParse(JSON.parse(row.data.input_output));
    if (!parsed.success) return { ok: false, reason: "no test cases" };
    io = parsed.data;
  } catch {
    return { ok: false, reason: "test cases are not valid JSON" };
  }

  if (io.fn_name) return { ok: false, reason: "function-call problem (needs stdin and stdout)" };
  if (io.inputs.length !== io.outputs.length) return { ok: false, reason: "inputs and outputs differ in length" };

  const pairs: ImportedTest[] = [];
  for (let i = 0; i < io.inputs.length; i++) {
    const input = io.inputs[i];
    const output = io.outputs[i];
    if (typeof input !== "string" || typeof output !== "string") continue; // non-text tests
    if (input.length > options.maxInputChars || output.length > options.maxInputChars) continue;
    pairs.push({ input, expected_output: output });
  }
  if (pairs.length < 2) return { ok: false, reason: "fewer than 2 usable test cases" };

  return {
    ok: true,
    problem: {
      externalId: String(row.data.problem_id),
      title: titleOf(row.data.question, row.data.problem_id),
      statement: row.data.question.trim(),
      difficulty: row.data.difficulty,
      sourceUrl: row.data.url ?? null,
      tests: sampleEvenly(pairs, options.maxTests),
    },
  };
}

/** Plain stdin/stdout starters so the editor is not empty for imported problems. */
export const DEFAULT_STARTERS = {
  python: "import sys\n\ndata = sys.stdin.read()\n# read input from data, print the answer\n",
  javascript: 'const data = require("fs").readFileSync(0, "utf8");\n// read input from data, console.log the answer\n',
  java: "import java.util.*;\n\npublic class Main {\n  public static void main(String[] args) {\n    Scanner sc = new Scanner(System.in);\n    // read input, print the answer\n  }\n}\n",
  cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n  // read input, print the answer\n  return 0;\n}\n",
} as const;
