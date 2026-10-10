import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

// Tests create and delete data, so they run against the local Supabase stack only.
process.loadEnvFile(".env.localstack");
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")) {
  throw new Error("Refusing to run UI tests against a non-local Supabase project");
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});
const stamp = Date.now();

async function login(page: Page) {
  await page.goto("/login");
  await page.getByPlaceholder("Email").fill("admin@example.com");
  await page.getByPlaceholder("Password").fill("admin12345");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/admin\/candidates/);
}

test.beforeAll(async () => {
  await db.from("round_config").update({ cutoff: 50, auto_advance: true }).in("round", [1, 2, 3]);
});

test("bad login shows an error and stays on /login", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("Email").fill("admin@example.com");
  await page.getByPlaceholder("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/login\?error=/);
  await expect(page.getByText(/invalid/i)).toBeVisible();
});

test("admin: add candidate, CSV upload, detail page", async ({ page }) => {
  await login(page);
  const email = `ui-${stamp}@example.com`;

  await page.getByPlaceholder("Full name").fill(`UI Candidate ${stamp}`);
  await page.getByPlaceholder("Email").fill(email);
  await page.getByRole("button", { name: /Add & send invite/ }).click();
  const row = page.getByRole("row", { name: new RegExp(email) });
  await expect(row).toBeVisible();
  await expect(row.getByText("Invited")).toBeVisible();

  const csv = `name,email\nCsv One ${stamp},csv1-${stamp}@example.com\nCsv Two ${stamp},csv2-${stamp}@example.com\n`;
  await page.locator('input[name="csv"]').setInputFiles({ name: "c.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  await page.getByRole("button", { name: /Upload & invite/ }).click();
  await expect(page.getByRole("row", { name: new RegExp(`csv2-${stamp}`) })).toBeVisible();

  // invite emails were logged
  const { data: log } = await db.from("email_log").select("template,status").eq("to_email", email);
  expect(log).toEqual([{ template: "invite", status: "logged" }]);

  await page.getByRole("link", { name: `UI Candidate ${stamp}` }).click();
  await expect(page.getByRole("heading", { name: `UI Candidate ${stamp}` })).toBeVisible();
  await expect(page.getByText("Round 1: Aptitude")).toBeVisible();
});

test("admin: question bank, settings persist, reports render, users list", async ({ page }) => {
  await login(page);

  await page.goto("/admin/questions");
  await page.getByPlaceholder("Topic").fill("UI test");
  await page.getByPlaceholder("Question", { exact: true }).fill(`Pick B ${stamp}?`);
  await page.getByPlaceholder("One option per line").fill("A\nB\nC");
  await page.getByPlaceholder(/Correct option number/).fill("2");
  await page.getByRole("button", { name: "Add question" }).click();
  await expect(page.getByText(`Pick B ${stamp}?`)).toBeVisible();
  const { data: q } = await db.from("aptitude_questions").select("answer_index,options").eq("body", `Pick B ${stamp}?`).single();
  expect(q).toEqual({ answer_index: 1, options: ["A", "B", "C"] });
  await db.from("aptitude_questions").delete().eq("body", `Pick B ${stamp}?`);

  await page.goto("/admin/settings");
  // Server actions POST back to the page; wait for that response so reload cannot race it.
  const saved = () =>
    page.waitForResponse((r) => r.request().method() === "POST" && r.url().endsWith("/admin/settings"));
  await page.locator('input[name="cutoff_1"]').fill("55");
  await Promise.all([saved(), page.getByRole("button", { name: "Save" }).click()]);
  await page.reload();
  await expect(page.locator('input[name="cutoff_1"]')).toHaveValue("55");
  await page.locator('input[name="cutoff_1"]').fill("50");
  await Promise.all([saved(), page.getByRole("button", { name: "Save" }).click()]);
  await page.reload();
  await expect(page.locator('input[name="cutoff_1"]')).toHaveValue("50");

  await page.goto("/admin/reports");
  await expect(page.getByRole("heading", { name: "Pass rate per round" })).toBeVisible();
  await expect(page.locator("svg.recharts-surface").first()).toBeVisible();

  await page.goto("/admin/users");
  await expect(page.getByRole("cell", { name: "admin@example.com" })).toBeVisible();
});

test("candidate: Round 1 web page end to end", async ({ page }) => {
  const { data: c } = await db
    .from("candidates")
    .insert({ name: `R1 UI ${stamp}`, email: `r1ui-${stamp}@example.com` })
    .select()
    .single();
  await page.goto("/test/r1");
  await page.getByPlaceholder("Invite code").fill(c!.invite_code);
  await page.getByRole("button", { name: "Start test" }).click();
  await expect(page.getByText(/answered/)).toBeVisible();
  const lists = page.locator("ol > li");
  const n = await lists.count();
  expect(n).toBeGreaterThan(0);
  for (let i = 0; i < n; i++) await lists.nth(i).locator('input[type="radio"]').first().check();
  await expect(page.getByText(`${n}/${n} answered`)).toBeVisible();
  await page.getByRole("button", { name: "Submit answers" }).click();
  await expect(page.getByRole("heading", { name: "Thank you" })).toBeVisible();

  const { data: after } = await db.from("candidates").select("status").eq("id", c!.id).single();
  expect(["R1 done", "Rejected"]).toContain(after!.status); // depends on the random paper
  const { data: att } = await db.from("r1_attempts").select("submitted_at,score").eq("candidate_id", c!.id).single();
  expect(att!.submitted_at).not.toBeNull();
});

test("candidate submits R3 via link; reviewer scores it in the admin UI", async ({ page }) => {
  const { data: task } = await db.from("machine_tasks").select("id,title,rubric").limit(1).single();
  const { data: c } = await db
    .from("candidates")
    .insert({ name: `R3 UI ${stamp}`, email: `r3ui-${stamp}@example.com`, status: "R3 sent" })
    .select()
    .single();
  const { data: a } = await db
    .from("r3_assignments")
    .insert({ candidate_id: c!.id, task_id: task!.id, deadline: new Date(Date.now() + 86_400_000).toISOString() })
    .select()
    .single();

  // invalid link
  await page.goto("/submit/not-a-real-token");
  await expect(page.getByText("This link is not valid.")).toBeVisible();

  // bad GitHub URL is rejected, nothing recorded
  await page.goto(`/submit/${a!.token}`);
  await expect(page.getByRole("heading", { name: task!.title })).toBeVisible();
  await page.getByPlaceholder("https://github.com/you/project").fill("https://evil.example.com/x");
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(page.getByText(/Enter a GitHub repository link/)).toBeVisible();
  expect((await db.from("r3_assignments").select("submitted_at").eq("id", a!.id).single()).data!.submitted_at).toBeNull();

  // valid GitHub URL
  await page.getByPlaceholder("https://github.com/you/project").fill("https://github.com/acme/take-home");
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(page.getByText(/Submitted on/)).toBeVisible();
  const { data: done } = await db.from("r3_assignments").select("*").eq("id", a!.id).single();
  expect([done!.is_late, done!.github_url]).toEqual([false, "https://github.com/acme/take-home"]);
  expect((await db.from("candidates").select("status").eq("id", c!.id).single()).data!.status).toBe("R3 submitted");

  // reviewer scores in the admin UI: 8/10 on every criterion => 80
  await login(page);
  await page.goto(`/admin/candidates/${c!.id}`);
  for (const k of task!.rubric as string[]) await page.locator(`input[name="c:${k}"]`).fill("8");
  await page.getByPlaceholder("Comment").fill("solid work");
  await page.getByRole("button", { name: "Save review" }).click();
  await expect(page.getByText(/Reviewer average:/)).toContainText("80");
  const { data: rv } = await db.from("reviews").select("score,round").eq("candidate_id", c!.id);
  expect(rv).toEqual([{ score: 80, round: 3 }]);
});

test("admin reviews a draft question and enables it", async ({ page }) => {
  const body = `Draft review ${stamp}: pick the second option.`;
  const { data: q } = await db
    .from("aptitude_questions")
    .insert({ topic: "UI: Review", difficulty: "easy", body, options: ["one", "two", "three", "four"], answer_index: 1, active: false })
    .select("id")
    .single();

  await login(page);
  await page.goto("/admin/questions");
  const item = page.getByRole("listitem").filter({ hasText: body });
  await expect(item).toBeVisible();
  await expect(item.getByText("Draft", { exact: true })).toBeVisible();

  // the reviewer can see the options and which one is marked correct
  await item.getByText("Show options and answer").click();
  await expect(item.getByText("B) two (correct)")).toBeVisible();

  await item.getByRole("button", { name: "Enable" }).click();
  await expect(item.getByText("Draft", { exact: true })).toHaveCount(0);
  expect((await db.from("aptitude_questions").select("active").eq("id", q!.id).single()).data!.active).toBe(true);

  await item.getByRole("button", { name: "Disable" }).click();
  await expect(item.getByText("Draft", { exact: true })).toBeVisible();
  expect((await db.from("aptitude_questions").select("active").eq("id", q!.id).single()).data!.active).toBe(false);

  await db.from("aptitude_questions").delete().eq("id", q!.id);
});

test("candidate gets three problems in the IDE; admin sees each one", async ({ page }) => {
  // exactly three active problems, restored afterwards
  const { data: before } = await db.from("coding_problems").select("id,active,title,source");
  const wanted = new Set(
    (before ?? [])
      .filter((p) => p.source === "generated-v1" && ["Sum of even numbers", "Palindrome check", "Pair with target sum"].includes(p.title))
      .map((p) => p.id),
  );
  expect(wanted.size).toBe(3);

  const { data: c } = await db
    .from("candidates")
    .insert({ name: `IDE ${stamp}`, email: `ide-${stamp}@example.com`, status: "R1 done" })
    .select()
    .single();
  try {
    for (const p of before ?? []) await db.from("coding_problems").update({ active: wanted.has(p.id) }).eq("id", p.id);

    await page.goto("/test/r2");
    await page.getByPlaceholder("Invite code").fill(c!.invite_code);
    await page.getByRole("button", { name: "Start", exact: true }).click();

    const tabs = page.getByRole("navigation", { name: "Problems" }).getByRole("button");
    await expect(tabs).toHaveCount(3);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const first = await page.getByRole("heading", { level: 1 }).innerText();

    await tabs.nth(1).click();
    await expect(page.getByRole("heading", { level: 1 })).not.toHaveText(first);

    // nothing attempted yet: the confirmation says so, and Cancel keeps working
    await page.getByRole("button", { name: "Submit all" }).click();
    await expect(page.getByText(/You have not started Problem 1, Problem 2, Problem 3/)).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("button", { name: "Submit all" })).toBeVisible();

    // the admin sees three problems on the candidate's page
    await login(page);
    await page.goto(`/admin/candidates/${c!.id}`);
    await expect(page.getByText("Problem 1", { exact: true })).toBeVisible();
    await expect(page.getByText("Problem 3", { exact: true })).toBeVisible();
    await expect(page.getByText("3 problems")).toBeVisible();
  } finally {
    for (const p of before ?? []) await db.from("coding_problems").update({ active: p.active }).eq("id", p.id);
  }
});
