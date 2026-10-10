import "server-only";
import { groupAptitudeCounts, type SectionCount, type TopicCount } from "@app/shared";
import { userDb } from "@/server/db/user";
import { requireStaff } from "@/server/auth";

export type Bank = "aptitude" | "dsa" | "tasks";
export type Status = "all" | "live" | "draft";

export interface QuestionFilter {
  bank: Bank;
  section?: string;
  topic?: string;
  status: Status;
}

export const LIST_LIMIT = 100;
const UNCATEGORISED = "Uncategorised";

/** Counts per section and topic for the overview, plus the three bank totals. */
export async function getBankOverview() {
  await requireStaff();
  const db = await userDb();
  const [aptitude, dsa, tasks] = await Promise.all([
    db.from("aptitude_topic_counts").select("section,topic,live,drafts"),
    db.from("dsa_topic_counts").select("topic,live,drafts"),
    db.from("machine_tasks").select("active"),
  ]);

  const sections: SectionCount[] = groupAptitudeCounts(
    (aptitude.data ?? []).map((r) => ({ section: r.section, topic: r.topic ?? "", live: Number(r.live), drafts: Number(r.drafts) })),
  );
  const dsaTopics: TopicCount[] = (dsa.data ?? [])
    .map((r) => ({ topic: r.topic ?? "", live: Number(r.live), drafts: Number(r.drafts), total: Number(r.live) + Number(r.drafts) }))
    .sort((a, b) => b.total - a.total || a.topic.localeCompare(b.topic));
  // a problem with several topics appears under each, so totals come from the problems table
  const problems = await db.from("coding_problems").select("active");

  const tally = (rows: { active: boolean }[] | null) => {
    const live = (rows ?? []).filter((r) => r.active).length;
    return { live, drafts: (rows ?? []).length - live, total: (rows ?? []).length };
  };
  return {
    sections,
    dsaTopics,
    totals: {
      aptitude: sections.reduce((t, s) => ({ live: t.live + s.live, drafts: t.drafts + s.drafts, total: t.total + s.total }), { live: 0, drafts: 0, total: 0 }),
      dsa: tally(problems.data),
      tasks: tally(tasks.data),
    },
  };
}

/** One filtered page of the active bank. Only the columns the list renders. */
export async function getBankItems(filter: QuestionFilter) {
  await requireStaff();
  const db = await userDb();

  if (filter.bank === "aptitude") {
    let q = db
      .from("aptitude_questions")
      .select("id,section,topic,difficulty,body,options,answer_index,active,source", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(LIST_LIMIT);
    if (filter.section) q = filter.section === UNCATEGORISED ? q.is("section", null) : q.eq("section", filter.section);
    if (filter.topic) q = q.eq("topic", filter.topic);
    if (filter.status !== "all") q = q.eq("active", filter.status === "live");
    const { data, count } = await q;
    return {
      kind: "aptitude" as const,
      total: count ?? 0,
      items: (data ?? []).map((r) => ({ ...r, options: (r.options as string[]) ?? [] })),
    };
  }

  if (filter.bank === "dsa") {
    let q = db
      .from("coding_problems")
      .select("id,title,difficulty,topics,active,source,source_url,license,coding_testcases(hidden)", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(LIST_LIMIT);
    if (filter.topic) q = filter.topic === UNCATEGORISED ? q.filter("topics", "eq", "{}") : q.contains("topics", [filter.topic]);
    if (filter.status !== "all") q = q.eq("active", filter.status === "live");
    const { data, count } = await q;
    return {
      kind: "dsa" as const,
      total: count ?? 0,
      items: (data ?? []).map((p) => ({
        id: p.id,
        title: p.title,
        difficulty: p.difficulty,
        topics: p.topics ?? [],
        active: p.active,
        source: p.source,
        sourceUrl: p.source_url,
        license: p.license,
        tests: {
          total: p.coding_testcases.length,
          hidden: p.coding_testcases.filter((t) => t.hidden).length,
        },
      })),
    };
  }

  let q = db.from("machine_tasks").select("id,title,rubric,active", { count: "exact" }).order("created_at", { ascending: false }).limit(LIST_LIMIT);
  if (filter.status !== "all") q = q.eq("active", filter.status === "live");
  const { data, count } = await q;
  return {
    kind: "tasks" as const,
    total: count ?? 0,
    items: (data ?? []).map((t) => ({ id: t.id, title: t.title, rubric: (t.rubric as string[]) ?? [], active: t.active })),
  };
}
