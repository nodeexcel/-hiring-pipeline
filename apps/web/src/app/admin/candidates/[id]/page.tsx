import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { averageReviews } from "@app/shared";
import { ActionForm } from "@/components/admin/ActionForm";
import { Initial, Section, StatTile, StatusChip } from "@/components/admin/parts";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { FormField } from "@/components/form-field";
import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { closeReviews, saveReview, saveWalkthrough } from "@/features/candidates/actions";
import { getCandidateDetail } from "@/features/candidates/queries";
import { getStaff } from "@/server/auth";
import { adminDb } from "@/server/db/admin";
import { Replay } from "./Replay";

const R2_RUBRIC = ["Correctness", "Readability", "Structure", "Edge cases"];

export async function generateMetadata({ params }: PageProps<"/admin/candidates/[id]">): Promise<Metadata> {
  const { id } = await params;
  const detail = await getCandidateDetail(id); // memoised: shared with the page below
  return { title: detail?.candidate.name ?? "Candidate" };
}

export default async function CandidateDetail({ params }: PageProps<"/admin/candidates/[id]">) {
  const { id } = await params;
  const [detail, staff] = await Promise.all([getCandidateDetail(id), getStaff()]);
  if (!detail) notFound();
  const { candidate: c, r1, r2, r3, events, reviews, emails, audit, r2Problems } = detail;

  const zipUrl = r3?.file_path
    ? (await adminDb().storage.from("r3-submissions").createSignedUrl(r3.file_path, 3600)).data?.signedUrl
    : null;

  const r2Reviews = reviews.filter((r) => r.round === 2);
  const r3Reviews = reviews.filter((r) => r.round === 3);
  const r3Rubric = ((r3?.machine_tasks?.rubric as string[] | undefined) ?? []);
  const mine = (round: number) => reviews.find((r) => r.round === round && r.reviewer_id === staff?.id);

  const r1Score = r1?.submitted_at ? Number(r1.score) : null;
  const r2Score = r2?.score != null ? Number(r2.score) : null;
  const r3Avg = averageReviews(r3Reviews.map((r) => Number(r.score)));
  const dash = <span className="text-muted-foreground">-</span>;
  const isAdmin = staff?.role === "admin";

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/candidates" className="text-sm text-muted-foreground transition-colors hover:text-brand">
          Back to candidates
        </Link>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <Initial name={c.name} className="size-11 text-base" />
          <div className="min-w-0 space-y-1">
            <h1 className="text-2xl font-medium sm:text-3xl">{c.name}</h1>
            <p className="flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
              <span>{c.email}</span>
              <span className="font-mono text-xs">{c.invite_code}</span>
            </p>
          </div>
          <div className="ml-auto">
            <StatusChip status={c.status} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Aptitude" value={r1Score ?? dash} hint={r1?.submitted_at ? `${Math.round((r1.elapsed_ms ?? 0) / 60000)} min taken` : "Round 1"} />
        <StatTile label="Coding" value={r2Score ?? dash} hint="Round 2, blended" />
        <StatTile label="Machine test" value={r3Avg ?? dash} hint={`Round 3, ${r3Reviews.length} review${r3Reviews.length === 1 ? "" : "s"}`} />
        <StatTile label="Final" value={c.final_score ?? dash} hint="Weighted total" />
      </div>

      <Section title="Round 1: Aptitude">
        {r1?.submitted_at ? (
          <p className="text-sm">
            Score <b>{r1.score}</b> · time {Math.round((r1.elapsed_ms ?? 0) / 60000)} min
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">{r1 ? "In progress" : "Not started"}</p>
        )}
      </Section>

      <Section title="Round 2: Coding">
        {r2 ? (
          <div className="space-y-5 text-sm">
            <p className="text-muted-foreground">
              {r2Problems.length} problem{r2Problems.length === 1 ? "" : "s"} · mean of problem scores{" "}
              <b className="text-foreground">{r2.auto_score ?? "-"}</b> · reviewers{" "}
              <b className="text-foreground">{averageReviews(r2Reviews.map((r) => Number(r.score))) ?? "-"}</b> · blended{" "}
              <b className="text-foreground">{r2.score ?? "-"}</b>
            </p>

            {r2Problems.map((p) => (
              <div key={p.id} className="space-y-3 rounded-xl border border-card-edge p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Chip>Problem {p.position}</Chip>
                  <b>{p.coding_problems?.title}</b>
                  {p.coding_problems?.difficulty && <Chip>{p.coding_problems.difficulty}</Chip>}
                  {(p.coding_problems?.topics ?? []).map((t) => (
                    <Chip key={t}>{t}</Chip>
                  ))}
                </div>
                <p className="text-muted-foreground">
                  {p.language ?? "not attempted"} · tests {p.tests_passed ?? "-"}/{p.tests_total ?? "-"} · score{" "}
                  <b className="text-foreground">{p.auto_score ?? "-"}</b>
                </p>
                {p.similar.length > 0 && (
                  <p className="rounded-xl border border-yellow-600/35 px-4 py-3 text-yellow-800 dark:border-yellow-400/30 dark:text-yellow-200">
                    Similar to {p.similar.length} other submission(s); highest {(Number(p.similar[0].score) * 100).toFixed(0)}%.
                  </p>
                )}
                <Replay snapshots={p.snapshots} />
              </div>
            ))}
            {r2Problems.length === 0 && <p className="text-muted-foreground">No problems recorded for this attempt.</p>}

            <ReviewForm round={2} candidateId={id} criteria={R2_RUBRIC} existing={mine(2)} enabled={!!r2.submitted_at} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Not started</p>
        )}
      </Section>

      <Section title="Round 3: Machine test">
        {r3 ? (
          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              <span className="text-foreground">{r3.machine_tasks?.title}</span> · sent {new Date(r3.sent_at).toLocaleString()} · deadline{" "}
              {new Date(r3.deadline).toLocaleString()}
            </p>
            {r3.submitted_at ? (
              <p className="flex flex-wrap items-center gap-2">
                <span>Submitted {new Date(r3.submitted_at).toLocaleString()}</span>
                {r3.is_late && <Chip tone="danger">Late</Chip>}
                <span aria-hidden="true">·</span>
                {r3.github_url ? (
                  <a className="underline underline-offset-4 transition-colors hover:text-brand" href={r3.github_url} rel="noreferrer">
                    {r3.github_url}
                  </a>
                ) : zipUrl ? (
                  <a className="underline underline-offset-4 transition-colors hover:text-brand" href={zipUrl}>
                    Download zip
                  </a>
                ) : null}
              </p>
            ) : (
              <p className="text-muted-foreground">Awaiting submission</p>
            )}
            <p>
              Reviewer average: <b>{r3Avg ?? "-"}</b> ({r3Reviews.length} review{r3Reviews.length === 1 ? "" : "s"})
            </p>
            {r3.submitted_at && (
              <>
                <ReviewForm round={3} candidateId={id} criteria={r3Rubric} existing={mine(3)} enabled />
                {isAdmin && (
                  <>
                    <ActionForm action={saveWalkthrough} className="flex flex-wrap items-end gap-3">
                      <input type="hidden" name="candidate_id" value={id} />
                      <FormField label="15-minute walkthrough call">
                        <Input type="datetime-local" name="walkthrough_at" defaultValue={r3.walkthrough_at?.slice(0, 16) ?? ""} />
                      </FormField>
                      <FormField label="Notes" className="min-w-48 flex-1">
                        <Input name="notes" placeholder="Notes" maxLength={2000} defaultValue={r3.walkthrough_notes ?? ""} />
                      </FormField>
                      <SubmitButton variant="outline" pendingLabel="Saving">
                        Save
                      </SubmitButton>
                    </ActionForm>
                    {c.status === "R3 submitted" && (
                      <ActionForm action={closeReviews}>
                        <input type="hidden" name="candidate_id" value={id} />
                        <SubmitButton pendingLabel="Closing">Close reviews &amp; apply cutoff</SubmitButton>
                      </ActionForm>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Not sent</p>
        )}
      </Section>

      <Section title="Proctoring flags" subtitle="Signals for a person to judge. They are not proof of cheating.">
        {events.length ? (
          <Table>
            <TableBody>
              {events.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{new Date(e.at).toLocaleTimeString()}</TableCell>
                  <TableCell>R{e.round}</TableCell>
                  <TableCell>
                    <Chip>{e.type}</Chip>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{e.detail ? JSON.stringify(e.detail) : ""}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">No flags.</p>
        )}
      </Section>

      <Section title="Reviews">
        {reviews.length ? (
          <ul className="space-y-2 text-sm">
            {reviews.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-x-2">
                <Chip>R{r.round}</Chip>
                <span className="text-muted-foreground">{r.profiles?.email}</span>
                <b>{r.score}</b>
                {r.comment && <span className="text-muted-foreground">· {r.comment}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">None yet.</p>
        )}
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Email log">
          {emails.length ? (
            <Table>
              <TableBody>
                {emails.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</TableCell>
                    <TableCell>{e.template}</TableCell>
                    <TableCell>
                      <Chip tone={e.status === "failed" ? "danger" : e.status === "sent" ? "success" : "default"}>{e.status}</Chip>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{e.clicks} click(s)</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">No emails yet.</p>
          )}
        </Section>

        <Section title="Audit trail">
          <ul className="space-y-2 text-xs">
            {audit.map((a) => {
              const next = (a.new_data as { status?: string } | null)?.status;
              const prev = (a.old_data as { status?: string } | null)?.status;
              return (
                <li key={a.id} className="flex gap-3 border-l border-card-edge-hover pl-3 text-muted-foreground">
                  <span className="whitespace-nowrap">{new Date(a.at).toLocaleString()}</span>
                  <span>
                    {a.table_name} {a.action}
                    {next && prev !== next && (
                      <>
                        {" "}
                        · status now <span className="text-foreground">{next}</span>
                      </>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </Section>
      </div>
    </div>
  );
}

function ReviewForm({
  round,
  candidateId,
  criteria,
  existing,
  enabled,
}: {
  round: 2 | 3;
  candidateId: string;
  criteria: string[];
  existing?: { rubric_scores: unknown; comment: string | null };
  enabled: boolean;
}) {
  if (!enabled || criteria.length === 0) return null;
  const scores = (existing?.rubric_scores ?? {}) as Record<string, number>;
  return (
    <ActionForm action={saveReview} className="space-y-4 rounded-xl border border-card-edge p-4">
      <input type="hidden" name="candidate_id" value={candidateId} />
      <input type="hidden" name="round" value={round} />
      <p className="text-sm font-medium">Your rubric review (0 to 10 each)</p>
      <div className="flex flex-wrap gap-3">
        {criteria.map((k) => (
          <FormField key={k} label={k} className="w-28">
            <Input type="number" min={0} max={10} step={0.5} required name={`c:${k}`} defaultValue={scores[k]} />
          </FormField>
        ))}
      </div>
      <Input name="comment" placeholder="Comment" aria-label="Comment" maxLength={2000} defaultValue={existing?.comment ?? ""} />
      <SubmitButton size="sm" pendingLabel="Saving">
        {existing ? "Update review" : "Save review"}
      </SubmitButton>
    </ActionForm>
  );
}
