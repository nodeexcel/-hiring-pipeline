import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { APTITUDE_SECTIONS, APTITUDE_TOPICS, DSA_TOPICS } from "@app/shared";
import { ActionForm } from "@/components/admin/ActionForm";
import { ConfirmSubmit } from "@/components/admin/ConfirmSubmit";
import { PageHeader, Section } from "@/components/admin/parts";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { FormField } from "@/components/form-field";
import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  activateAllDrafts,
  addMcq,
  addProblem,
  addTask,
  deleteProblem,
  deleteQuestion,
  deleteTask,
  setProblemActive,
  setQuestionActive,
  setTaskActive,
} from "@/features/questions/actions";
import { LIST_LIMIT, getBankItems, getBankOverview, type Bank, type QuestionFilter } from "@/features/questions/queries";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Question banks" };

type Act = (prev: { ok: boolean; message?: string }, formData: FormData) => Promise<{ ok: boolean; message?: string }>;

const filterSchema = z.object({
  bank: z.enum(["aptitude", "dsa", "tasks"]).catch("aptitude"),
  section: z.string().trim().max(80).optional().catch(undefined),
  topic: z.string().trim().max(80).optional().catch(undefined),
  status: z.enum(["all", "live", "draft"]).catch("all"),
});

function href(f: Partial<QuestionFilter>) {
  const p = new URLSearchParams();
  p.set("bank", f.bank ?? "aptitude");
  if (f.section) p.set("section", f.section);
  if (f.topic) p.set("topic", f.topic);
  if (f.status && f.status !== "all") p.set("status", f.status);
  return `/admin/questions?${p.toString()}`;
}

const pill = "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors duration-200";
const pillOn = "border-card-edge-hover bg-card-fill text-foreground";
const pillOff = "border-card-edge text-muted-foreground hover:border-card-edge-hover hover:text-foreground";

function Del({ action, id, what, effect }: { action: Act; id: string; what: string; effect: string }) {
  return (
    <ActionForm action={action}>
      <input type="hidden" name="id" value={id} />
      <ConfirmSubmit label="Delete" variant="ghost" title={`Delete this ${what}?`} confirmLabel={`Delete ${what}`}>
        {effect}
      </ConfirmSubmit>
    </ActionForm>
  );
}

/** Draft or live, with a one-click toggle. Drafts are never served to candidates. */
function ActiveToggle({ action, id, active }: { action: Act; id: string; active: boolean }) {
  return (
    <ActionForm action={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="active" value={active ? "0" : "1"} />
      <SubmitButton size="sm" variant={active ? "ghost" : "soft"} pendingLabel="Saving">
        {active ? "Disable" : "Enable"}
      </SubmitButton>
    </ActionForm>
  );
}

export default async function QuestionsPage({ searchParams }: PageProps<"/admin/questions">) {
  const filter = filterSchema.parse(await searchParams) as QuestionFilter;
  const [overview, bank] = await Promise.all([getBankOverview(), getBankItems(filter)]);
  const { totals } = overview;

  const scoped = [filter.section, filter.topic].filter(Boolean).join(" / ");
  const draftsInView = bank.items.filter((i) => !i.active).length;
  const status = (s: QuestionFilter["status"], label: string) => (
    <Link href={href({ ...filter, status: s })} className={cn(pill, filter.status === s ? pillOn : pillOff)}>
      {label}
    </Link>
  );

  const tabs: { id: Bank; label: string; count: { live: number; drafts: number; total: number } }[] = [
    { id: "aptitude", label: "Aptitude (Round 1)", count: totals.aptitude },
    { id: "dsa", label: "DSA problems (Round 2)", count: totals.dsa },
    { id: "tasks", label: "Take-home (Round 3)", count: totals.tasks },
  ];

  return (
    <div>
      <PageHeader
        title="Question banks"
        description={
          <>
            Browse and manage content <span className="highlight">by topic</span>. Drafts are never shown to candidates.
          </>
        }
      />

      <nav aria-label="Question bank" className="mb-6 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Link
            key={t.id}
            href={href({ bank: t.id })}
            aria-current={filter.bank === t.id ? "page" : undefined}
            className={cn(pill, "px-4 py-2 text-sm", filter.bank === t.id ? pillOn : pillOff)}
          >
            {t.label}
            <span className="text-muted-foreground">
              {t.count.live} live{t.count.drafts ? `, ${t.count.drafts} drafts` : ""}
            </span>
          </Link>
        ))}
      </nav>

      <div className="space-y-6">
        {/* ---------- topic overview ---------- */}
        {filter.bank === "aptitude" && (
          <Section title="Topics" subtitle="Choose a topic to see its questions. Counts are live and draft.">
            <div className="grid gap-4 md:grid-cols-2">
              {overview.sections.map((s) => (
                <div key={s.section} className="rounded-xl border border-card-edge p-4">
                  <div className="mb-3 flex items-baseline justify-between gap-3">
                    <Link
                      href={href({ bank: "aptitude", section: s.section, status: filter.status })}
                      className={cn("font-montserrat text-sm font-semibold hover:text-brand", filter.section === s.section && !filter.topic && "text-brand")}
                    >
                      {s.section}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {s.live} live{s.drafts ? `, ${s.drafts} drafts` : ""}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {s.topics.map((t) => (
                      <Link
                        key={t.topic}
                        href={href({ bank: "aptitude", section: s.section, topic: t.topic, status: filter.status })}
                        className={cn(pill, "px-2.5 py-0.5", filter.section === s.section && filter.topic === t.topic ? pillOn : pillOff)}
                      >
                        {t.topic}
                        <span className={t.live === 0 ? "text-yellow-700 dark:text-yellow-300" : "text-muted-foreground"}>
                          {t.live}/{t.total}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
              {overview.sections.length === 0 && <p className="text-sm text-muted-foreground">No questions yet.</p>}
            </div>
            <p className="text-xs text-muted-foreground">
              Each chip shows live out of total. A topic with 0 live is highlighted: it cannot appear in any paper until a question is enabled.
            </p>
          </Section>
        )}

        {filter.bank === "dsa" && (
          <Section title="DSA topics" subtitle="A problem can carry several topics and counts under each.">
            <div className="flex flex-wrap gap-1.5">
              {overview.dsaTopics.map((t) => (
                <Link
                  key={t.topic}
                  href={href({ bank: "dsa", topic: t.topic, status: filter.status })}
                  className={cn(pill, "px-2.5 py-0.5", filter.topic === t.topic ? pillOn : pillOff)}
                >
                  {t.topic}
                  <span className={t.live === 0 ? "text-yellow-700 dark:text-yellow-300" : "text-muted-foreground"}>
                    {t.live}/{t.total}
                  </span>
                </Link>
              ))}
              {overview.dsaTopics.length === 0 && <p className="text-sm text-muted-foreground">No problems yet.</p>}
            </div>
          </Section>
        )}

        {/* ---------- the filtered list ---------- */}
        <Section
          title={
            filter.bank === "aptitude"
              ? `Aptitude questions${scoped ? `: ${scoped}` : ""}`
              : filter.bank === "dsa"
                ? `DSA problems${filter.topic ? `: ${filter.topic}` : ""}`
                : "Take-home tasks"
          }
          subtitle={`${bank.total} match${bank.total === 1 ? "" : "es"}${bank.total > LIST_LIMIT ? `, showing the newest ${LIST_LIMIT}` : ""}.`}
        >
          <div className="flex flex-wrap items-center gap-2">
            {status("all", "All")}
            {status("live", "Live")}
            {status("draft", "Drafts")}
            {(filter.section || filter.topic) && (
              <Link href={href({ bank: filter.bank, status: filter.status })} className="ml-2 text-xs text-muted-foreground underline underline-offset-4 hover:text-brand">
                Clear topic filter
              </Link>
            )}
            {draftsInView > 0 && (
              <div className="ml-auto">
                <ActionForm action={activateAllDrafts}>
                  <input type="hidden" name="kind" value={filter.bank === "aptitude" ? "questions" : filter.bank === "dsa" ? "problems" : "tasks"} />
                  {filter.section && <input type="hidden" name="section" value={filter.section} />}
                  {filter.topic && <input type="hidden" name="topic" value={filter.topic} />}
                  <ConfirmSubmit
                    label={scoped || filter.bank === "dsa" && filter.topic ? `Enable drafts in ${scoped || filter.topic}` : "Enable all drafts"}
                    variant="soft"
                    tone="neutral"
                    title="Enable these drafts?"
                    confirmLabel="Enable"
                  >
                    Every draft {scoped || filter.topic ? `in ${scoped || filter.topic}` : "in this bank"} becomes available to candidates. Review them first:
                    generated content must be checked by a person before it is used in a scored round.
                  </ConfirmSubmit>
                </ActionForm>
              </div>
            )}
          </div>

          {bank.kind === "aptitude" && (
            <ul className="divide-y divide-border text-sm">
              {bank.items.map((q) => (
                <li key={q.id} className="space-y-2 py-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Chip>
                          {q.section ?? "Uncategorised"} · {q.topic}
                        </Chip>
                        <Chip>{q.difficulty}</Chip>
                        {!q.active && <Chip tone="special">Draft</Chip>}
                      </div>
                      <p>{q.body}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <ActiveToggle action={setQuestionActive} id={q.id} active={q.active} />
                      <Del action={deleteQuestion} id={q.id} what="question" effect="The question is removed from the bank. Candidates who already hold a paper with it will see one question fewer." />
                    </div>
                  </div>
                  <details className="text-muted-foreground">
                    <summary className="cursor-pointer text-xs">Show options and answer</summary>
                    <ol className="mt-2 space-y-1 pl-4 text-sm">
                      {q.options.map((o, i) => (
                        <li key={i} className={i === q.answer_index ? "font-medium text-green-700 dark:text-green-400" : ""}>
                          {String.fromCharCode(65 + i)}) {o}
                          {i === q.answer_index && " (correct)"}
                        </li>
                      ))}
                    </ol>
                  </details>
                </li>
              ))}
            </ul>
          )}

          {bank.kind === "dsa" && (
            <ul className="divide-y divide-border text-sm">
              {bank.items.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <b>{p.title}</b>
                      {!p.active && <Chip tone="special">Draft</Chip>}
                      <span className="text-muted-foreground">
                        {p.tests.total} tests ({p.tests.hidden} hidden)
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {p.difficulty && <Chip>{p.difficulty}</Chip>}
                      {p.topics.length === 0 ? <Chip tone="danger">No topic</Chip> : p.topics.map((t) => <Chip key={t}>{t}</Chip>)}
                    </div>
                    {p.source && (
                      <details className="text-muted-foreground">
                        <summary className="cursor-pointer text-xs">Source and licence</summary>
                        <div className="mt-2 space-y-1 text-xs">
                          <p>
                            Imported from <b className="text-foreground">{p.source}</b>
                            {p.sourceUrl && (
                              <>
                                {" "}
                                ·{" "}
                                <a href={p.sourceUrl} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-brand">
                                  original problem
                                </a>
                              </>
                            )}
                          </p>
                          {p.license && <p>{p.license}</p>}
                        </div>
                      </details>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <ActiveToggle action={setProblemActive} id={p.id} active={p.active} />
                    <Del action={deleteProblem} id={p.id} what="problem" effect="The problem and all of its test cases are deleted. Candidates already assigned this problem keep their attempt but it can no longer be re-scored." />
                  </div>
                </li>
              ))}
            </ul>
          )}

          {bank.kind === "tasks" && (
            <ul className="divide-y divide-border text-sm">
              {bank.items.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <b>{t.title}</b>
                      {!t.active && <Chip tone="special">Draft</Chip>}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {t.rubric.map((r) => (
                        <Chip key={r}>{r}</Chip>
                      ))}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <ActiveToggle action={setTaskActive} id={t.id} active={t.active} />
                    <Del action={deleteTask} id={t.id} what="task" effect="The task is removed from the pool. Candidates who were already sent it are not affected." />
                  </div>
                </li>
              ))}
            </ul>
          )}

          {bank.items.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Nothing matches this view.</p>}
        </Section>

        {/* ---------- add forms (one per bank) ---------- */}
        {filter.bank === "aptitude" && (
          <Section title="Add an aptitude question">
            <ActionForm action={addMcq} className="grid gap-4 rounded-xl border border-card-edge p-4 md:grid-cols-2">
              <FormField label="Section">
                <Select name="section" wrapperClassName="w-full" defaultValue={filter.section && (APTITUDE_SECTIONS as readonly string[]).includes(filter.section) ? filter.section : undefined}>
                  {APTITUDE_SECTIONS.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Topic" hint="Pick a suggestion or type a new one.">
                <Input name="topic" required placeholder="Topic" maxLength={80} list="aptitude-topics" defaultValue={filter.topic ?? ""} />
                <datalist id="aptitude-topics">
                  {[...new Set(Object.values(APTITUDE_TOPICS).flat())].map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </FormField>
              <FormField label="Difficulty">
                <Select name="difficulty" wrapperClassName="w-full">
                  <option>easy</option>
                  <option>medium</option>
                  <option>hard</option>
                </Select>
              </FormField>
              <FormField label="Correct option" hint="The option number, starting at 1.">
                <Input name="answer" type="number" min={1} required placeholder="Correct option number (1-based)" />
              </FormField>
              <FormField label="Question" className="md:col-span-2">
                <Textarea name="body" required placeholder="Question" rows={2} maxLength={2000} />
              </FormField>
              <FormField label="Options" hint="One option per line." className="md:col-span-2">
                <Textarea name="options" required placeholder="One option per line" rows={4} />
              </FormField>
              <SubmitButton className="self-start" pendingLabel="Adding">
                Add question
              </SubmitButton>
            </ActionForm>
          </Section>
        )}

        {filter.bank === "dsa" && (
          <Section title="Add a DSA problem" subtitle="Hidden test cases never leave the server.">
            <ActionForm action={addProblem} className="grid gap-4 rounded-xl border border-card-edge p-4">
              <FormField label="Title">
                <Input name="title" required placeholder="Title" maxLength={200} />
              </FormField>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Difficulty">
                  <Select name="difficulty" wrapperClassName="w-full" defaultValue="medium">
                    <option>easy</option>
                    <option>medium</option>
                    <option>hard</option>
                  </Select>
                </FormField>
                <FormField label="Visible samples" hint="The first N cases are shown to candidates. The rest stay hidden.">
                  <Input name="visible" type="number" min={0} defaultValue={1} />
                </FormField>
              </div>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Topics</legend>
                <div className="flex flex-wrap gap-2">
                  {DSA_TOPICS.map((t) => (
                    <label key={t} className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-card-edge px-3 py-1 text-xs has-[:checked]:border-card-edge-hover has-[:checked]:bg-card-fill">
                      <input type="checkbox" name="topics" value={t} defaultChecked={filter.topic === t} className="size-3.5 accent-neutral-300" />
                      {t}
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">Choose one to six topics.</p>
              </fieldset>
              <FormField label="Statement" hint="Include the input and output format.">
                <Textarea name="statement" required placeholder="Statement (include input/output format)" rows={4} />
              </FormField>
              <FormField label="Test cases" hint="Per case: input lines, then a line with =>, then the expected output. Separate cases with a line of ---.">
                <Textarea
                  name="tests"
                  required
                  rows={6}
                  className="font-mono"
                  placeholder={"Test cases. Format per case:\ninput lines\n=>\nexpected output\n---   (separator between cases)"}
                />
              </FormField>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Python starter">
                  <Textarea name="py" placeholder="Python starter" className="font-mono" rows={3} />
                </FormField>
                <FormField label="JavaScript starter">
                  <Textarea name="js" placeholder="JavaScript starter" className="font-mono" rows={3} />
                </FormField>
                <FormField label="Java starter">
                  <Textarea name="java" placeholder="Java starter" className="font-mono" rows={3} />
                </FormField>
                <FormField label="C++ starter">
                  <Textarea name="cpp" placeholder="C++ starter" className="font-mono" rows={3} />
                </FormField>
              </div>
              <SubmitButton className="self-start" pendingLabel="Adding">
                Add problem
              </SubmitButton>
            </ActionForm>
          </Section>
        )}

        {filter.bank === "tasks" && (
          <Section title="Add a take-home task" subtitle="One live task is picked at random per candidate and never repeated.">
            <ActionForm action={addTask} className="grid gap-4 rounded-xl border border-card-edge p-4">
              <FormField label="Title">
                <Input name="title" required placeholder="Title" maxLength={200} />
              </FormField>
              <FormField label="Brief">
                <Textarea name="brief" required placeholder="Brief sent to the candidate" rows={4} />
              </FormField>
              <FormField label="Rubric criteria" hint="Comma separated. Reviewers score each one from 0 to 10.">
                <Input name="rubric" required placeholder="Rubric criteria, comma separated" />
              </FormField>
              <SubmitButton className="self-start" pendingLabel="Adding">
                Add task
              </SubmitButton>
            </ActionForm>
          </Section>
        )}
      </div>
    </div>
  );
}
