/**
 * Canonical topic taxonomy for the question banks. Used by the admin forms, the
 * generators and the loaders so that "Arrays" is always spelled the same way.
 * Topics are free text in the database; this list is what the UI suggests and orders by.
 */

export const APTITUDE_SECTIONS = [
  "Quantitative",
  "Logical reasoning",
  "Verbal ability",
  "Data interpretation",
] as const;
export type AptitudeSection = (typeof APTITUDE_SECTIONS)[number];

export const APTITUDE_TOPICS: Record<AptitudeSection, readonly string[]> = {
  Quantitative: [
    "Percentages",
    "Ratio and proportion",
    "Averages",
    "Speed, distance and time",
    "Time and work",
    "Profit and loss",
    "Simple interest",
    "Compound interest",
    "Ages",
    "Number system",
    "Series sums",
    "Probability",
    "Permutations and combinations",
  ],
  "Logical reasoning": [
    "Number series",
    "Coding and decoding",
    "Direction sense",
    "Ranking and order",
    "Syllogisms",
    "Blood relations",
  ],
  "Verbal ability": ["Synonyms", "Antonyms", "Grammar and usage", "Analogies", "Odd one out"],
  "Data interpretation": [
    "Tables and totals",
    "Averages from data",
    "Comparisons",
    "Percentage change",
    "Percentage share",
    "Ratios from data",
  ],
};

/** DSA topics for the coding round. A problem can carry several. */
export const DSA_TOPICS = [
  "Arrays",
  "Strings",
  "Hash maps",
  "Two pointers",
  "Sliding window",
  "Stacks",
  "Queues",
  "Linked lists",
  "Recursion",
  "Sorting and searching",
  "Binary search",
  "Trees",
  "Graphs",
  "Greedy",
  "Dynamic programming",
  "Math",
] as const;
export type DsaTopic = (typeof DSA_TOPICS)[number];

export interface TopicCount {
  topic: string;
  live: number;
  drafts: number;
  total: number;
}
export interface SectionCount {
  section: string;
  live: number;
  drafts: number;
  total: number;
  topics: TopicCount[];
}

const UNCATEGORISED = "Uncategorised";

export interface AptitudeCountRow {
  section: string | null;
  topic: string;
  live: number;
  drafts: number;
}

/** Same grouping, from rows the database has already aggregated (see aptitude_topic_counts). */
export function groupAptitudeCounts(rows: readonly AptitudeCountRow[]): SectionCount[] {
  const expanded: { section: string | null; topic: string; active: boolean }[] = [];
  // Re-use one implementation by expanding counts into weighted pseudo rows.
  for (const r of rows) {
    for (let i = 0; i < r.live; i++) expanded.push({ section: r.section, topic: r.topic, active: true });
    for (let i = 0; i < r.drafts; i++) expanded.push({ section: r.section, topic: r.topic, active: false });
  }
  return groupAptitude(expanded);
}

/**
 * Groups aptitude rows into section -> topic counts. Known sections come first in their
 * canonical order, then anything else alphabetically. Rows without a section are kept
 * visible under "Uncategorised" rather than silently dropped.
 */
export function groupAptitude(rows: readonly { section: string | null; topic: string; active: boolean }[]): SectionCount[] {
  const sections = new Map<string, Map<string, { live: number; drafts: number }>>();
  for (const r of rows) {
    const s = r.section?.trim() || UNCATEGORISED;
    const t = r.topic.trim() || UNCATEGORISED;
    const topics = sections.get(s) ?? new Map();
    const c = topics.get(t) ?? { live: 0, drafts: 0 };
    if (r.active) c.live += 1;
    else c.drafts += 1;
    topics.set(t, c);
    sections.set(s, topics);
  }
  const known: readonly string[] = APTITUDE_SECTIONS;
  const rank = (s: string) => (known.includes(s) ? known.indexOf(s) : s === UNCATEGORISED ? 1000 : 500);
  return [...sections.entries()]
    .map(([section, topics]) => {
      const list: TopicCount[] = [...topics.entries()]
        .map(([topic, c]) => ({ topic, live: c.live, drafts: c.drafts, total: c.live + c.drafts }))
        .sort((a, b) => b.total - a.total || a.topic.localeCompare(b.topic));
      const live = list.reduce((n, t) => n + t.live, 0);
      const drafts = list.reduce((n, t) => n + t.drafts, 0);
      return { section, live, drafts, total: live + drafts, topics: list };
    })
    .sort((a, b) => rank(a.section) - rank(b.section) || a.section.localeCompare(b.section));
}

/** Counts DSA problems per topic. A problem with several topics counts under each. */
export function groupDsa(rows: readonly { topics: readonly string[]; active: boolean }[]): TopicCount[] {
  const map = new Map<string, { live: number; drafts: number }>();
  for (const r of rows) {
    const topics = r.topics.length ? r.topics : [UNCATEGORISED];
    for (const t of new Set(topics)) {
      const c = map.get(t) ?? { live: 0, drafts: 0 };
      if (r.active) c.live += 1;
      else c.drafts += 1;
      map.set(t, c);
    }
  }
  const order: readonly string[] = DSA_TOPICS;
  return [...map.entries()]
    .map(([topic, c]) => ({ topic, live: c.live, drafts: c.drafts, total: c.live + c.drafts }))
    .sort((a, b) => {
      const ra = order.includes(a.topic) ? order.indexOf(a.topic) : 999;
      const rb = order.includes(b.topic) ? order.indexOf(b.topic) : 999;
      return ra - rb || a.topic.localeCompare(b.topic);
    });
}
