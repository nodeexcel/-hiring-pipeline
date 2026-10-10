import type { Metadata } from "next";
import Link from "next/link";
import { CANDIDATE_STATUSES } from "@app/shared";
import { ActionForm } from "@/components/admin/ActionForm";
import { ConfirmSubmit } from "@/components/admin/ConfirmSubmit";
import { Initial, PageHeader, StatTile, StatusChip } from "@/components/admin/parts";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardText, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { addCandidate, approveNextRound, bulkUpload, decide, resendInvite } from "@/features/candidates/actions";
import { listCandidates, statusCounts } from "@/features/candidates/queries";
import { pageSchema } from "@/features/candidates/schemas";

export const metadata: Metadata = { title: "Candidates" };

export default async function CandidatesPage({ searchParams }: PageProps<"/admin/candidates">) {
  const page = pageSchema.parse((await searchParams).page);
  const [{ rows, total, pageSize }, counts] = await Promise.all([listCandidates(page), statusCounts()]);
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <PageHeader
        title="Candidates"
        description={
          <>
            {total} in the pipeline. Add people, then follow them through <span className="highlight">each round</span>.
          </>
        }
      />

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7 stagger">
        {CANDIDATE_STATUSES.map((s) => (
          <StatTile key={s} label={s} value={counts[s]} />
        ))}
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-2 stagger">
        <Card className="sm:opacity-100">
          <CardBody className="p-5">
            <ActionForm action={addCandidate} className="flex flex-col gap-4">
              <div>
                <CardTitle>Add candidate</CardTitle>
                <CardText className="mt-1">An invite code is emailed automatically.</CardText>
              </div>
              <FormField label="Full name">
                <Input name="name" required placeholder="Full name" maxLength={120} />
              </FormField>
              <FormField label="Email">
                <Input name="email" type="email" required placeholder="Email" maxLength={254} />
              </FormField>
              <SubmitButton className="self-start">Add &amp; send invite</SubmitButton>
            </ActionForm>
          </CardBody>
        </Card>

        <Card className="sm:opacity-100">
          <CardBody className="p-5">
            <ActionForm action={bulkUpload} className="flex flex-col gap-4">
              <div>
                <CardTitle>Bulk upload (CSV)</CardTitle>
                <CardText className="mt-1">Columns: name, email. Up to 500 rows. Duplicates are skipped.</CardText>
              </div>
              <FormField label="CSV file">
                <Input name="csv" type="file" accept=".csv,text/csv" required className="h-auto py-2 file:mr-3 file:rounded file:border-0 file:bg-muted file:px-2 file:py-1 file:text-xs" />
              </FormField>
              <SubmitButton className="self-start">Upload &amp; invite</SubmitButton>
            </ActionForm>
          </CardBody>
        </Card>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Final</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((c) => (
            <TableRow key={c.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Initial name={c.name} />
                  <Link href={`/admin/candidates/${c.id}`} className="font-medium transition-colors hover:text-brand">
                    {c.name}
                  </Link>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{c.email}</TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">{c.inviteCode}</TableCell>
              <TableCell>
                <StatusChip status={c.status} />
              </TableCell>
              <TableCell className="tabular-nums">{c.finalScore ?? <span className="text-muted-foreground">-</span>}</TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-2">
                  {c.status === "Invited" && (
                    <ActionForm action={resendInvite}>
                      <input type="hidden" name="id" value={c.id} />
                      <SubmitButton variant="ghost" size="sm">
                        Resend
                      </SubmitButton>
                    </ActionForm>
                  )}
                  {c.awaitingApproval && (
                    <ActionForm action={approveNextRound}>
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="round" value={c.awaitingApproval} />
                      <SubmitButton size="sm">Approve R{c.awaitingApproval}</SubmitButton>
                    </ActionForm>
                  )}
                  {c.status === "R3 submitted" && (
                    <>
                      <ActionForm action={decide}>
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="selected" value="1" />
                        <ConfirmSubmit label="Select" variant="soft" tone="neutral" title={`Select ${c.name}?`} confirmLabel="Select candidate">
                          This marks {c.name} as selected and emails them the selection message. It is logged in the audit trail.
                        </ConfirmSubmit>
                      </ActionForm>
                      <ActionForm action={decide}>
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="selected" value="0" />
                        <ConfirmSubmit label="Reject" title={`Reject ${c.name}?`} confirmLabel="Reject candidate" className="text-red-600 dark:text-red-400">
                          This marks {c.name} as rejected and emails them the rejection message. The email cannot be recalled.
                        </ConfirmSubmit>
                      </ActionForm>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                No candidates yet. Add one above.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {pages > 1 && (
        <nav aria-label="Pagination" className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {page} of {pages}
          </span>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm" aria-disabled={page <= 1}>
              <Link href={`/admin/candidates?page=${Math.max(1, page - 1)}`}>Previous</Link>
            </Button>
            <Button asChild variant="outline" size="sm" aria-disabled={page >= pages}>
              <Link href={`/admin/candidates?page=${Math.min(pages, page + 1)}`}>Next</Link>
            </Button>
          </div>
        </nav>
      )}
    </div>
  );
}
