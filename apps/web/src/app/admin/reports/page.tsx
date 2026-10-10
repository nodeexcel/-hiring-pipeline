import type { Metadata } from "next";
import { PageHeader, Section, StatTile } from "@/components/admin/parts";
import { Distribution, PassRates } from "@/features/reports/Charts";
import { getReport } from "@/features/reports/queries";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage() {
  const { averages, counts, passRates, distribution } = await getReport();
  const fmt = (n: number | null) => (n === null ? "-" : n.toFixed(1));
  const hasData = counts.r1 + counts.r2 + counts.r3 > 0;
  return (
    <div>
      <PageHeader
        title="Reports"
        description={
          <>
            Use pass rates and score spread to <span className="highlight">tune difficulty</span> and cutoffs.
          </>
        }
      />
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile label="Average, round 1" value={fmt(averages.r1)} hint={`${counts.r1} submitted`} />
        <StatTile label="Average, round 2" value={fmt(averages.r2)} hint={`${counts.r2} submitted`} />
        <StatTile label="Average, round 3" value={fmt(averages.r3)} hint={`${counts.r3} reviewed`} />
      </div>
      {hasData ? (
        <div className="space-y-6">
          <Section title="Pass rate per round" subtitle="Against the current cutoff for each round.">
            <PassRates data={passRates} />
          </Section>
          <Section title="Score distribution" subtitle="Candidates per 10-point band.">
            <Distribution data={distribution} />
          </Section>
        </div>
      ) : (
        <Section title="No results yet" subtitle="Charts appear once candidates complete a round.">
          <p className="text-sm text-muted-foreground">
            Invite candidates from the Candidates page. Pass rates and score spread will show here as rounds are submitted.
          </p>
        </Section>
      )}
    </div>
  );
}
