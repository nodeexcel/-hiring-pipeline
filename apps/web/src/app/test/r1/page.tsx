"use client";
import { useEffect, useRef, useState } from "react";
import { Backdrop } from "@/components/backdrop";
import { useProctor } from "@/components/useProctor";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/form-field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Question {
  id: string;
  topic: string;
  body: string;
  options: string[];
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate min-h-screen overflow-x-clip">
      <Backdrop />
      {children}
    </div>
  );
}

export default function R1Page() {
  const [code, setCode] = useState("");
  const [started, setStarted] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [remaining, setRemaining] = useState(0);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const t0 = useRef(0);
  const limit = useRef(0);
  const { drain } = useProctor(started ? code : null, 1, started && !done);

  async function begin() {
    setError("");
    const res = await fetch("/api/r1/paper", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const j = await res.json();
    if (!res.ok) return setError(j.error);
    setQuestions(j.questions);
    limit.current = j.durationMinutes * 60_000;
    t0.current = performance.now(); // monotonic: wall-clock changes do not affect it
    setRemaining(limit.current);
    setStarted(true);
  }

  async function submit() {
    const elapsedMs = Math.round(performance.now() - t0.current);
    const res = await fetch("/api/r1/submit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code, answers, elapsedMs, events: drain(), client: "web" }),
    });
    if (res.ok) setDone(true);
    else setError((await res.json()).error);
  }

  const submitRef = useRef(submit);
  useEffect(() => {
    submitRef.current = submit; // keep the timer's auto-submit pointing at the latest closure
  });
  useEffect(() => {
    if (!started || done) return;
    const id = setInterval(() => {
      const left = limit.current - (performance.now() - t0.current);
      setRemaining(Math.max(0, left));
      if (left <= 0) {
        clearInterval(id);
        void submitRef.current();
      }
    }, 500);
    return () => clearInterval(id);
  }, [started, done]);

  if (done)
    return (
      <Shell>
        <main className="mx-auto max-w-md space-y-3 p-6 pt-32 text-center sm:p-12 sm:pt-40">
          <h1 className="text-2xl font-medium sm:text-3xl">Thank you</h1>
          <p className="text-base text-neutral-600 dark:text-neutral-400">
            Your answers were submitted. We will email you about <span className="highlight">next steps</span>.
          </p>
        </main>
      </Shell>
    );

  if (!started)
    return (
      <Shell>
        <main className="mx-auto max-w-sm space-y-6 p-6 pt-32 sm:pt-40">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-medium sm:text-3xl">Round 1: aptitude</h1>
            <p className="text-base text-neutral-600 dark:text-neutral-400">
              Enter the invite code from your email. The timer starts <span className="highlight">immediately</span>.
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
          <Button variant="solid" size="lg" className="w-full" onClick={begin} disabled={code.length < 6}>
            Start test
          </Button>
        </main>
      </Shell>
    );

  const mm = String(Math.floor(remaining / 60_000)).padStart(2, "0");
  const ss = String(Math.floor((remaining % 60_000) / 1000)).padStart(2, "0");
  return (
    <Shell>
      <div className="sticky top-0 z-40 border-b border-border bg-background/60 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-3">
          <span className="text-sm text-muted-foreground">
            {Object.keys(answers).length}/{questions.length} answered
          </span>
          <span className="font-mono text-lg tabular-nums" aria-label="Time remaining">
            {mm}:{ss}
          </span>
        </div>
      </div>
      <main className="mx-auto max-w-2xl p-6 sm:py-12">
        <ol className="space-y-8">
          {questions.map((q, i) => (
            <li key={q.id} className="space-y-3">
              <p className="font-montserrat text-base font-semibold">
                {i + 1}. {q.body}
              </p>
              <div className="space-y-2">
                {q.options.map((o, k) => (
                  <label
                    key={k}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors duration-200",
                      answers[q.id] === k ? "border-card-edge-hover bg-card-fill" : "border-card-edge hover:border-card-edge-hover",
                    )}
                  >
                    <input
                      type="radio"
                      name={q.id}
                      checked={answers[q.id] === k}
                      onChange={() => setAnswers({ ...answers, [q.id]: k })}
                      className="size-4 accent-neutral-300"
                    />
                    {o}
                  </label>
                ))}
              </div>
            </li>
          ))}
        </ol>
        {error && (
          <p role="alert" className="mt-6 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        <Button variant="solid" size="lg" className="mt-10" onClick={submit}>
          Submit answers
        </Button>
      </main>
    </Shell>
  );
}
