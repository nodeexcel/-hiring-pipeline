"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { Backdrop } from "@/components/backdrop";
import { FormField } from "@/components/form-field";
import { useTheme } from "@/components/theme-provider";
import { useProctor } from "@/components/useProctor";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

const LANGS = [
  { id: "javascript", label: "JavaScript", monaco: "javascript", ext: "js" },
  { id: "python", label: "Python", monaco: "python", ext: "py" },
  { id: "java", label: "Java", monaco: "java", ext: "java" },
  { id: "cpp", label: "C++", monaco: "cpp", ext: "cpp" },
] as const;
type LangId = (typeof LANGS)[number]["id"];

interface Problem {
  id: string;
  position: number;
  title: string;
  statement: string;
  difficulty: string | null;
  starter_code: Partial<Record<LangId, string>>;
  samples: { input: string; expected_output: string }[];
}
interface Started {
  problems: Problem[];
  deadline: number;
}
interface RunRow {
  passed: boolean;
  status: string;
  stdout: string;
  stderr: string;
}
interface Work {
  language: LangId;
  source: string;
  results: RunRow[] | null;
}

const starterFor = (p: Problem, lang: LangId) => p.starter_code?.[lang] ?? "";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate min-h-screen overflow-x-clip">
      <Backdrop />
      {children}
    </div>
  );
}

export default function R2Page() {
  const [code, setCode] = useState("");
  const [data, setData] = useState<Started | null>(null);
  const [work, setWork] = useState<Record<string, Work>>({});
  const [active, setActive] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [left, setLeft] = useState(0);
  const { theme } = useTheme();
  const keystrokes = useRef({ keys: 0 });
  const workRef = useRef(work);
  workRef.current = work; // eslint-disable-line react-hooks/refs -- read by the snapshot timer
  const { track, drain } = useProctor(data ? code : null, 2, !!data && !done);

  const post = useCallback(
    (path: string, body: object) =>
      fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code, ...body }) }),
    [code],
  );

  async function start() {
    setError("");
    const res = await post("/api/r2/start", {});
    const j = await res.json();
    if (!res.ok) return setError(j.error);
    const init: Record<string, Work> = {};
    for (const p of j.problems as Problem[]) init[p.id] = { language: "python", source: starterFor(p, "python"), results: null };
    setWork(init);
    setData({ problems: j.problems, deadline: j.deadline });
    setLeft(Math.max(0, j.deadline - Date.now()));
  }

  const problem = data?.problems[active];
  const current = problem ? work[problem.id] : undefined;
  const patch = (id: string, change: Partial<Work>) => setWork((w) => ({ ...w, [id]: { ...w[id], ...change } }));

  function changeLang(lang: LangId) {
    if (!problem) return;
    patch(problem.id, { language: lang, source: starterFor(problem, lang), results: null });
  }

  async function run() {
    if (!problem || !current) return;
    setBusy(true);
    setError("");
    const res = await post("/api/r2/run", { problemId: problem.id, language: current.language, source: current.source });
    const j = await res.json();
    setBusy(false);
    if (!res.ok) return setError(j.error);
    patch(problem.id, { results: j.results });
    void post("/api/r2/snapshot", { problemId: problem.id, language: current.language, source: current.source });
  }

  /** Unchanged starter code counts as "not attempted". */
  const attempted = (p: Problem) => {
    const w = work[p.id];
    return !!w && w.source.trim() !== "" && w.source !== starterFor(p, w.language);
  };

  async function submit() {
    if (!data) return;
    setConfirming(false);
    setBusy(true);
    track("typing_stats", keystrokes.current);
    const solutions = data.problems.map((p) => ({
      problemId: p.id,
      language: work[p.id].language,
      source: attempted(p) ? work[p.id].source : "",
    }));
    const res = await post("/api/r2/submit", { solutions, events: drain() });
    const j = await res.json();
    setBusy(false);
    if (!res.ok) return setError(j.error);
    setDone(true);
  }

  // snapshot the active problem every 15s while it is changing
  useEffect(() => {
    if (!data || done) return;
    const lastSent = new Map<string, string>();
    const id = setInterval(() => {
      const p = data.problems[active];
      const w = workRef.current[p.id];
      if (w && w.source !== lastSent.get(p.id)) {
        lastSent.set(p.id, w.source);
        void post("/api/r2/snapshot", { problemId: p.id, language: w.language, source: w.source });
      }
    }, 15_000);
    return () => clearInterval(id);
  }, [data, done, active, post]);

  useEffect(() => {
    if (!data || done) return;
    const id = setInterval(() => setLeft(Math.max(0, data.deadline - Date.now())), 1000);
    return () => clearInterval(id);
  }, [data, done]);

  if (done)
    return (
      <Shell>
        <main className="mx-auto max-w-md space-y-3 p-6 pt-32 text-center sm:pt-40">
          <h1 className="text-2xl font-medium sm:text-3xl">Submitted</h1>
          <p className="text-base text-neutral-600 dark:text-neutral-400">
            Thank you. We will email you about <span className="highlight">next steps</span>.
          </p>
        </main>
      </Shell>
    );

  if (!data || !problem || !current)
    return (
      <Shell>
        <main className="mx-auto max-w-sm space-y-6 p-6 pt-32 sm:pt-40">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-medium sm:text-3xl">Round 2: coding</h1>
            <p className="text-base text-neutral-600 dark:text-neutral-400">
              Open this page in <span className="highlight">Safe Exam Browser</span>, then enter your invite code.
            </p>
          </div>
          <FormField label="Invite code">
            <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Invite code" className="font-mono" />
          </FormField>
          {error && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          <Button variant="solid" size="lg" className="w-full" onClick={start} disabled={code.length < 6}>
            Start
          </Button>
        </main>
      </Shell>
    );

  const mm = String(Math.floor(left / 60_000)).padStart(2, "0");
  const ss = String(Math.floor((left % 60_000) / 1000)).padStart(2, "0");
  const lang = LANGS.find((l) => l.id === current.language)!;
  const unattempted = data.problems.filter((p) => !attempted(p));

  return (
    <main className="grid h-screen grid-cols-1 grid-rows-[auto_1fr] md:grid-cols-[minmax(280px,35%)_1fr] md:grid-rows-1">
      <section className="overflow-auto border-b border-border p-5 md:border-r md:border-b-0">
        <nav aria-label="Problems" className="mb-4 flex flex-wrap gap-2">
          {data.problems.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setActive(i)}
              aria-current={i === active ? "true" : undefined}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition-colors duration-200",
                i === active ? "border-card-edge-hover bg-card-fill text-foreground" : "border-card-edge text-muted-foreground hover:border-card-edge-hover",
              )}
            >
              Problem {i + 1}
              {attempted(p) && <span aria-label="started" className="size-1.5 rounded-full bg-green-500" />}
            </button>
          ))}
        </nav>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-montserrat text-lg font-semibold">{problem.title}</h1>
          {problem.difficulty && <Chip>{problem.difficulty}</Chip>}
        </div>
        <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap text-neutral-700 dark:text-neutral-300">{problem.statement}</p>
        <h2 className="mt-6 text-sm font-medium">Samples</h2>
        {problem.samples.map((s, i) => (
          <pre key={i} className="mt-2 rounded-xl border border-card-edge bg-black/20 p-3 font-mono text-xs">
            {s.input}
            {"\n-> "}
            {s.expected_output}
          </pre>
        ))}
      </section>

      <section className="flex min-h-0 flex-col">
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-3">
          <Select value={current.language} onChange={(e) => changeLang(e.target.value as LangId)} aria-label="Language">
            {LANGS.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </Select>
          <Button variant="outline" onClick={run} disabled={busy}>
            Run samples
          </Button>
          <Button variant="solid" onClick={() => setConfirming(true)} disabled={busy}>
            Submit all
          </Button>
          <span className="ml-auto font-mono text-sm tabular-nums" aria-label="Time remaining">
            {mm}:{ss}
          </span>
        </div>
        <div className="min-h-0 flex-1">
          <Editor
            height="100%"
            theme={theme === "dark" ? "vs-dark" : "light"}
            path={`${problem.id}.${lang.ext}`}
            language={lang.monaco}
            value={current.source}
            onChange={(v) => {
              patch(problem.id, { source: v ?? "" });
              keystrokes.current.keys += 1;
            }}
            options={{ minimap: { enabled: false }, fontSize: 14 }}
          />
        </div>
        <div className="max-h-48 overflow-auto border-t border-border p-3 text-xs">
          {error && (
            <p role="alert" className="text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          {current.results?.map((r, i) => (
            <div key={i} className={r.passed ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}>
              Sample {i + 1}: {r.passed ? "passed" : `failed (${r.status})`}
              {!r.passed && <pre className="text-muted-foreground">got: {r.stdout || r.stderr}</pre>}
            </div>
          ))}
        </div>
      </section>

      <ConfirmDialog
        open={confirming}
        title="Submit all your solutions?"
        confirmLabel="Submit solutions"
        tone="neutral"
        onCancel={() => setConfirming(false)}
        onConfirm={submit}
      >
        Every problem is run against all of its test cases, including hidden ones, and you cannot change anything afterwards.
        {unattempted.length > 0 && (
          <>
            {" "}
            You have not started {unattempted.map((p) => `Problem ${p.position}`).join(", ")}; {unattempted.length === 1 ? "it" : "they"} will score zero.
          </>
        )}
      </ConfirmDialog>
    </main>
  );
}
