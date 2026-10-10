import type { Metadata } from "next";
import { ActionForm } from "@/components/admin/ActionForm";
import { PageHeader, Section } from "@/components/admin/parts";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { FormField } from "@/components/form-field";
import { Input } from "@/components/ui/input";
import { saveSettings } from "@/features/settings/actions";
import { getRoundSettings } from "@/features/settings/queries";

export const metadata: Metadata = { title: "Cutoffs" };

const NAMES = { 1: "Aptitude", 2: "Coding", 3: "Machine test" } as const;
const check = "size-4 accent-neutral-300";

export default async function SettingsPage() {
  const cfg = await getRoundSettings();
  const rounds = [
    { n: 1, ...cfg.r1 },
    { n: 2, ...cfg.r2 },
    { n: 3, ...cfg.r3 },
  ] as const;

  return (
    <ActionForm action={saveSettings}>
      <PageHeader
        title="Cutoffs & automation"
        description={
          <>
            Pass marks, weights and what happens <span className="highlight">automatically</span> after each round.
          </>
        }
      >
        <SubmitButton variant="solid" pendingLabel="Saving">
          Save changes
        </SubmitButton>
      </PageHeader>

      <div className="max-w-3xl space-y-6">
        {rounds.map((r) => (
          <Section key={r.n} title={`Round ${r.n}: ${NAMES[r.n]}`}>
            <div className="grid gap-4 sm:grid-cols-2 stagger">
              <FormField label="Pass mark (0 to 100)">
                <Input name={`cutoff_${r.n}`} type="number" step="any" min={0} max={100} defaultValue={r.cutoff} />
              </FormField>
              <FormField label="Weight %">
                <Input name={`weight_${r.n}`} type="number" step="any" min={0} max={100} defaultValue={r.weight} />
              </FormField>
              {r.n === 1 && (
                <>
                  <FormField label="Questions">
                    <Input name="r1_questions" type="number" min={1} defaultValue={cfg.r1.settings.questions} />
                  </FormField>
                  <FormField label="Minutes">
                    <Input name="r1_duration" type="number" min={1} defaultValue={cfg.r1.settings.duration_minutes} />
                  </FormField>
                  <FormField label="Max questions per topic" hint="Keeps one topic from filling a paper.">
                    <Input name="r1_max_per_topic" type="number" min={1} max={10} defaultValue={cfg.r1.settings.max_per_topic} />
                  </FormField>
                </>
              )}
              {r.n === 2 && (
                <>
                  <FormField label="Minutes (for all problems)">
                    <Input name="r2_duration" type="number" min={1} defaultValue={cfg.r2.settings.duration_minutes} />
                  </FormField>
                  <FormField label="Problems per candidate" hint="Chosen across difficulty and topic, least-shown first.">
                    <Input name="r2_problem_count" type="number" min={1} max={10} defaultValue={cfg.r2.settings.problem_count} />
                  </FormField>
                </>
              )}
              {r.n === 3 && (
                <FormField label="Deadline (days)">
                  <Input name="r3_days" type="number" min={1} defaultValue={cfg.r3.settings.deadline_days} />
                </FormField>
              )}
            </div>

            <div className="space-y-3 border-t border-border pt-4 text-sm">
              <label className="flex items-center gap-2.5">
                <input name={`auto_${r.n}`} type="checkbox" defaultChecked={r.autoAdvance} className={check} />
                Auto-advance (otherwise an admin must approve)
              </label>
              {r.n === 2 && (
                <>
                  <label className="flex items-center gap-2.5">
                    <input name="enforce_seb" type="checkbox" defaultChecked={cfg.r2.settings.enforce_seb} className={check} />
                    Block access outside Safe Exam Browser (otherwise just flag it)
                  </label>
                  <FormField label="SEB config key" hint="From the SEB Config Tool. Leave empty to disable the check.">
                    <Input name="seb_key" defaultValue={cfg.r2.settings.seb_config_key ?? ""} className="font-mono" />
                  </FormField>
                </>
              )}
            </div>
          </Section>
        ))}
      </div>
    </ActionForm>
  );
}
