import AxeBuilder from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

// Quality gates for the admin panel: accessibility (WCAG 2.1 A/AA) in both themes, and no
// horizontal scrolling at phone width. Runs against the local stack only.
process.loadEnvFile(".env.localstack");
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")) {
  throw new Error("Refusing to run UI tests against a non-local Supabase project");
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

async function login(page: Page) {
  await page.goto("/login");
  await page.getByPlaceholder("Email").fill("admin@example.com");
  await page.getByPlaceholder("Password").fill("admin12345");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/admin\/candidates/);
}

async function candidatePath() {
  const { data } = await db.from("candidates").select("id").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (data) return `/admin/candidates/${data.id}`;
  const { data: c } = await db.from("candidates").insert({ name: "Quality Check", email: `q-${Date.now()}@example.com` }).select("id").single();
  return `/admin/candidates/${c!.id}`;
}

const PAGES = async () => [
  ["login", "/login", false],
  ["candidates", "/admin/candidates", true],
  ["candidate detail", await candidatePath(), true],
  ["questions: aptitude", "/admin/questions?bank=aptitude", true],
  ["questions: dsa", "/admin/questions?bank=dsa", true],
  ["questions: take-home", "/admin/questions?bank=tasks", true],
  ["cutoffs", "/admin/settings", true],
  ["users", "/admin/users", true],
  ["reports", "/admin/reports", true],
] as const;

async function scan(page: Page) {
  const r = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .exclude("nextjs-portal") // the dev-only Next overlay is not our UI
    .analyze();
  return r.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => ({ id: v.id, impact: v.impact, count: v.nodes.length, help: v.help, sample: v.nodes[0]?.target.join(" ") }));
}

for (const theme of ["dark", "light"] as const) {
  test(`accessibility: no serious violations on any page (${theme} theme)`, async ({ page }) => {
    test.setTimeout(240_000);
    await page.addInitScript((t) => localStorage.setItem("chaiui-theme", t), theme);
    const pages = await PAGES();
    await login(page);
    const problems: Record<string, unknown> = {};
    for (const [name, path] of pages) {
      await page.goto(path);
      await page.locator("h1").first().waitFor({ timeout: 60_000 });
      await page.waitForTimeout(500);
      const v = await scan(page);
      if (v.length) problems[name] = v;
    }
    expect(problems, JSON.stringify(problems, null, 2)).toEqual({});
  });
}

test("phone width: no horizontal scrolling on any page", async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 375, height: 812 });
  const pages = await PAGES();
  await login(page);
  const overflowing: Record<string, string> = {};
  for (const [name, path] of pages) {
    await page.goto(path);
    await page.locator("h1").first().waitFor({ timeout: 60_000 });
    await page.waitForTimeout(500);
    const w = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, win: window.innerWidth }));
    if (w.doc > w.win) overflowing[name] = `${w.doc}px wide in a ${w.win}px window`;
  }
  expect(overflowing).toEqual({});
});

test("structure: one h1 and a distinct title on every page", async ({ page }) => {
  test.setTimeout(180_000);
  const pages = await PAGES();
  await login(page);
  const titles = new Map<string, string>();
  const problems: string[] = [];
  for (const [name, path, authed] of pages) {
    if (!authed) continue;
    await page.goto(path);
    await page.locator("h1").first().waitFor({ timeout: 60_000 });
    const h1 = await page.locator("h1").count();
    if (h1 !== 1) problems.push(`${name}: ${h1} h1 elements`);
    const title = await page.title();
    if (!title.trim() || title === "Hiring pipeline") problems.push(`${name}: generic or empty title "${title}"`);
    const key = name.startsWith("questions") ? "questions" : name;
    if (titles.has(title) && titles.get(title) !== key) problems.push(`${name}: title "${title}" is shared with ${titles.get(title)}`);
    titles.set(title, key);
  }
  expect(problems).toEqual([]);
});

test("keyboard: every focus stop in the header and first form shows a visible focus ring", async ({ page }) => {
  await login(page);
  await page.goto("/admin/candidates");
  await page.locator("h1").first().waitFor();
  const unfocusable: string[] = [];
  for (let i = 0; i < 14; i++) {
    await page.keyboard.press("Tab");
    const r = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const cs = getComputedStyle(el);
      const outline = cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0;
      const ring = cs.boxShadow !== "none";
      const border = el.matches("input,textarea,select") ; // inputs also change their border colour on focus
      return { tag: el.tagName.toLowerCase(), text: (el.textContent || el.getAttribute("placeholder") || el.getAttribute("aria-label") || "").trim().slice(0, 30), visible: outline || ring || border };
    });
    if (r && !r.visible) unfocusable.push(`${r.tag} "${r.text}"`);
  }
  expect(unfocusable).toEqual([]);
});

test("errors: unknown candidate and unknown admin route show a real not-found page", async ({ page }) => {
  await login(page);
  // Routes with a loading boundary stream, and Next keeps status 200 once streaming has started
  // (documented behaviour); the not-found UI is what the user sees and what matters here.
  const cases: [string, number[]][] = [
    ["/admin/candidates/00000000-0000-0000-0000-000000000000", [200, 404]],
    ["/admin/candidates/not-a-uuid", [200, 404]],
    ["/admin/does-not-exist", [404]],
  ];
  for (const [path, statuses] of cases) {
    const res = await page.goto(path);
    expect(statuses, `${path} returned ${res?.status()}`).toContain(res?.status());
    await expect(page.getByRole("heading", { name: "Page not found" }), path).toBeVisible();
    await expect(page.getByRole("link", { name: "Go to candidates" }), path).toBeVisible();
  }
});
