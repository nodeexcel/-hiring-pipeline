// Loads the generated question bank as INACTIVE drafts. Nothing reaches a candidate until an
// admin enables it. Safe to re-run: items already present (same source + external_id) are skipped.
//
//   node scripts/load-question-bank.mjs --target=local
//   node scripts/load-question-bank.mjs --target=hosted
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const target = (process.argv.find((a) => a.startsWith("--target=")) ?? "").split("=")[1];
if (!["local", "hosted"].includes(target)) {
  console.error("Usage: load-question-bank.mjs --target=local|hosted");
  process.exit(1);
}
process.loadEnvFile(target === "local" ? ".env.localstack" : ".env.local");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const isLocal = /^https?:\/\/(127\.0\.0\.1|localhost)/.test(url);
if ((target === "local") !== isLocal) {
  console.error(`Target "${target}" does not match the Supabase URL in its env file (${url}). Refusing.`);
  process.exit(1);
}
console.log(`Loading into ${target}: ${url}`);

const db = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const dir = resolve("../../question-bank");
const read = (f) => JSON.parse(readFileSync(resolve(dir, f), "utf8"));
const must = (r, what) => {
  if (r.error) throw new Error(`${what}: ${r.error.message}`);
  return r.data;
};

// ---- aptitude questions
const aptitude = read("aptitude.json");
const haveQ = new Set(
  must(await db.from("aptitude_questions").select("external_id").eq("source", aptitude[0].source), "list questions").map((r) => r.external_id),
);
const newQ = aptitude.filter((q) => !haveQ.has(q.external_id));
for (let i = 0; i < newQ.length; i += 50) {
  must(
    await db.from("aptitude_questions").insert(
      newQ.slice(i, i + 50).map((q) => ({
        section: q.section,
        topic: q.topic,
        difficulty: q.difficulty,
        body: q.body,
        options: q.options,
        answer_index: q.answer_index,
        active: false,
        source: q.source,
        license: q.license,
        external_id: q.external_id,
      })),
    ),
    "insert questions",
  );
}
console.log(`aptitude questions: +${newQ.length} (skipped ${aptitude.length - newQ.length} already present)`);

// ---- coding problems (the generated set, plus any imported from open datasets)
import { existsSync } from "node:fs";

const problemFiles = ["coding.json", "codecontests.json"].filter((f) => existsSync(resolve(dir, f)));
let addedP = 0;
let seenP = 0;
for (const file of problemFiles) {
  const problems = read(file);
  if (!problems.length) continue;
  seenP += problems.length;
  const haveP = new Set(
    must(await db.from("coding_problems").select("external_id").eq("source", problems[0].source), "list problems").map((r) => r.external_id),
  );
  for (const p of problems.filter((x) => !haveP.has(x.external_id))) {
    const row = must(
      await db
        .from("coding_problems")
        .insert({
          title: p.title,
          statement: p.statement,
          starter_code: p.starter_code,
          difficulty: p.difficulty,
          topics: p.topics ?? [],
          active: false,
          source: p.source,
          license: p.license,
          external_id: p.external_id,
          source_url: p.source_url ?? null,
        })
        .select("id")
        .single(),
      "insert problem",
    );
    const tests = p.tests.map((t, i) => ({ problem_id: row.id, input: t.input, expected_output: t.expected_output, hidden: i >= p.visible }));
    const ins = await db.from("coding_testcases").insert(tests);
    if (ins.error) {
      await db.from("coding_problems").delete().eq("id", row.id); // never leave a problem without tests
      throw new Error("insert tests: " + ins.error.message);
    }
    addedP += 1;
  }
}
console.log(`coding problems:    +${addedP} (skipped ${seenP - addedP} already present)`);

// ---- take-home tasks (no provenance columns: de-duplicate by title)
const tasks = read("tasks.json");
const haveT = new Set(must(await db.from("machine_tasks").select("title"), "list tasks").map((r) => r.title));
const newT = tasks.filter((t) => !haveT.has(t.title));
if (newT.length) must(await db.from("machine_tasks").insert(newT.map((t) => ({ title: t.title, brief: t.brief, rubric: t.rubric, active: false }))), "insert tasks");
console.log(`take-home tasks:    +${newT.length} (skipped ${tasks.length - newT.length} already present)`);

// ---- report
for (const [t, label] of [["aptitude_questions", "questions"], ["coding_problems", "problems"], ["machine_tasks", "tasks"]]) {
  const total = await db.from(t).select("id", { count: "exact", head: true });
  const active = await db.from(t).select("id", { count: "exact", head: true }).eq("active", true);
  console.log(`  ${label.padEnd(10)} total=${total.count}  active=${active.count}  drafts=${total.count - active.count}`);
}
