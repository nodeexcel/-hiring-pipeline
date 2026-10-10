import type { Metadata } from "next";
import { ActionForm } from "@/components/admin/ActionForm";
import { Initial, PageHeader } from "@/components/admin/parts";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { FormField } from "@/components/form-field";
import { Card, CardBody } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createUser, setActive, setRole } from "@/features/users/actions";
import { listUsers } from "@/features/users/queries";
import { requireStaff } from "@/server/auth";

export const metadata: Metadata = { title: "Users" };

export default async function UsersPage() {
  const [me, users] = await Promise.all([requireStaff(), listUsers()]);
  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Users"
        description={
          <>
            Admins manage everything. Reviewers can read results and <span className="highlight">score submissions</span>.
          </>
        }
      />
      {me.role === "admin" && (
        <Card className="mb-6 sm:opacity-100">
          <CardBody className="p-5">
            <ActionForm action={createUser} className="flex flex-wrap items-end gap-4">
              <FormField label="Email" className="min-w-48 flex-1">
                <Input name="email" type="email" required placeholder="Email" autoComplete="off" />
              </FormField>
              <FormField label="Temporary password" className="min-w-48 flex-1" hint="At least 8 characters.">
                <Input name="password" type="password" minLength={8} required placeholder="Temporary password" autoComplete="new-password" />
              </FormField>
              <FormField label="Role">
                <Select name="role">
                  <option value="reviewer">reviewer</option>
                  <option value="admin">admin</option>
                </Select>
              </FormField>
              <SubmitButton pendingLabel="Creating">Create</SubmitButton>
            </ActionForm>
          </CardBody>
        </Card>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Initial name={u.email} />
                  <span>{u.email}</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Chip tone={u.role === "admin" ? "special" : "default"}>{u.role}</Chip>
                  {!u.active && <Chip tone="danger">Pending approval</Chip>}
                </div>
              </TableCell>
              <TableCell>
                {me.role === "admin" && u.id !== me.id && (
                  <div className="flex items-center justify-end gap-1">
                    <ActionForm action={setActive}>
                      <input type="hidden" name="id" value={u.id} />
                      <input type="hidden" name="active" value={u.active ? "0" : "1"} />
                      <SubmitButton variant={u.active ? "ghost" : "soft"} size="sm">
                        {u.active ? "Deactivate" : "Approve"}
                      </SubmitButton>
                    </ActionForm>
                    {u.active && (
                      <ActionForm action={setRole}>
                        <input type="hidden" name="id" value={u.id} />
                        <input type="hidden" name="role" value={u.role === "admin" ? "reviewer" : "admin"} />
                        <SubmitButton variant="ghost" size="sm">
                          Make {u.role === "admin" ? "reviewer" : "admin"}
                        </SubmitButton>
                      </ActionForm>
                    )}
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
