/**
 * Drives the phone's real client modules (API client, decryption, signing, state machine)
 * against the local stack, as a candidate would. Skipped when the server is not running.
 * Run the server first:  cd apps/web && pnpm dev:local
 */
import { createClient } from "@supabase/supabase-js";
import { signAnswers } from "@app/shared";
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// the app's config module reads this at import time
process.env.EXPO_PUBLIC_API_URL = "http://localhost:3100";

const env = Object.fromEntries(
  readFileSync(resolve(__dirname, "../../../web/.env.localstack"), "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);
const reachable = await fetch("http://localhost:3100/login").then((r) => r.ok).catch(() => false);
const isLocal = /127\.0\.0\.1|localhost/.test(env.NEXT_PUBLIC_SUPABASE_URL ?? "");

describe.skipIf(!reachable || !isLocal)("mobile client against the local stack", () => {
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  it("rules -> accept -> encrypted paper -> answer -> signed submit, using the app's own modules", async () => {
    const { api, ApiError } = await import("./api");
    const { decryptJson } = await import("@app/shared");
    const { initialState, reduce, progress } = await import("./state");
    const { startClock, elapsedMs } = await import("./clock");
    const { copy, userMessage } = await import("./copy");

    const { data: cand } = await db.from("candidates").insert({ name: "Mobile Tester", email: `mobile-${Date.now()}@example.com` }).select().single();
    const code = cand!.invite_code as string;

    // 1. rules arrive before any download, and match the real size of the paper
    const info = await api.rules(code);
    expect(info.firstName).toBe("Mobile");
    expect(info.rules.length).toBeGreaterThanOrEqual(8);
    let s = reduce(initialState, { type: "RULES_LOADED", code, info });
    expect(s.phase).toBe("rules");

    // 2. the paper is only fetched after the rules are accepted
    s = reduce(s, { type: "RULES_ACCEPTED" });
    expect(s.phase).toBe("downloading");
    const res = await api.paper(code);
    const paper = decryptJson<import("./types").Paper>(res.key, { iv: res.iv, data: res.data });
    expect(paper.questions.length).toBe(info.questionCount);
    expect(JSON.stringify(paper)).not.toContain("answer_index"); // the key never ships
    s = reduce(s, { type: "PAPER_READY", paper });
    expect(s.phase).toBe("ready");

    // 3. take the test: answer everything correctly (the answer key is read with the service role)
    s = reduce(s, { type: "STARTED" });
    const { data: key } = await db.from("aptitude_questions").select("id,answer_index").in("id", paper.questions.map((q) => q.id));
    for (const k of key!) s = reduce(s, { type: "ANSWERED", questionId: k.id, option: k.answer_index });
    expect(progress(s)).toMatchObject({ total: paper.questions.length, answered: paper.questions.length, unanswered: 0 });

    // 4. submit with the monotonic elapsed time and the HMAC the server verifies
    const clock = startClock(0, 0, 0);
    const elapsed = elapsedMs(clock, 90_000, 90_000);
    s = reduce(s, { type: "SUBMIT_STARTED" });
    const out = await api.submit({
      code,
      answers: s.answers,
      elapsedMs: elapsed,
      signature: signAnswers(paper.signingSecret, s.answers, elapsed),
      events: [{ type: "app_background", at: new Date().toISOString() }],
    });
    expect(out).toEqual({ submitted: true, passed: true });
    s = reduce(s, { type: "SUBMITTED" });
    expect(s.phase).toBe("done");

    // 5. the server agrees: scored 100, signature accepted (no bad_signature flag), pipeline advanced
    const { data: attempt } = await db.from("r1_attempts").select("score,elapsed_ms").eq("candidate_id", cand!.id).single();
    expect(Number(attempt!.score)).toBe(100);
    expect(attempt!.elapsed_ms).toBe(90_000);
    const { data: flags } = await db.from("proctoring_events").select("type").eq("candidate_id", cand!.id);
    expect(flags!.map((f) => f.type)).not.toContain("bad_signature");
    expect((await db.from("candidates").select("status").eq("id", cand!.id).single()).data!.status).toBe("R1 done");

    // 6. a second submit is refused, and the app maps that to a friendly outcome
    await expect(
      api.submit({ code, answers: s.answers, elapsedMs: elapsed, signature: "0".repeat(64), events: [] }),
    ).rejects.toMatchObject({ status: 409 });
    void ApiError;
    expect(copy.doneTitle).toBe("Thank you");
    expect(userMessage(404, "")).toContain("invite code");
  });

  it("maps real server errors to the messages the screens show", async () => {
    const { api, ApiError } = await import("./api");
    const { userMessage } = await import("./copy");
    const bad = await api.rules("NOPE000000").catch((e) => e);
    expect(bad).toBeInstanceOf(ApiError);
    expect((bad as InstanceType<typeof ApiError>).status).toBe(404);
    expect(userMessage((bad as InstanceType<typeof ApiError>).status, "")).toMatch(/invite code/i);
  });
});
