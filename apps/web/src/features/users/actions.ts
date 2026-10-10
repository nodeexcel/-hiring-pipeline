"use server";
import { revalidatePath } from "next/cache";
import { done, failed, type ActionState } from "@/lib/action-state";
import { parseForm } from "@/lib/form";
import { adminDb } from "@/server/db/admin";
import { requireAdmin } from "@/server/auth";
import { createUserSchema, setActiveSchema, setRoleSchema } from "./schemas";

export async function createUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const { data, error } = parseForm(formData, createUserSchema);
  if (error) return error;
  const db = adminDb();
  const { data: created, error: authError } = await db.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
  });
  if (authError || !created.user) return failed(authError?.message ?? "Could not create the user.");
  // The signup trigger creates an inactive reviewer. Users an admin creates are approved
  // straight away, with the chosen role.
  await db.from("profiles").update({ role: data.role, active: true }).eq("id", created.user.id);
  revalidatePath("/admin/users");
  return done(`Created ${data.email}.`);
}

export async function setRole(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requireAdmin();
  const { data, error } = parseForm(formData, setRoleSchema);
  if (error) return error;
  if (data.id === staff.id) return failed("You cannot change your own role.");
  await adminDb().from("profiles").update({ role: data.role }).eq("id", data.id);
  revalidatePath("/admin/users");
  return done();
}

/** Approve or revoke a staff member. Self-signups stay inactive until an admin activates them. */
export async function setActive(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requireAdmin();
  const { data, error } = parseForm(formData, setActiveSchema);
  if (error) return error;
  if (data.id === staff.id) return failed("You cannot deactivate yourself.");
  await adminDb().from("profiles").update({ active: data.active }).eq("id", data.id);
  revalidatePath("/admin/users");
  return done();
}
