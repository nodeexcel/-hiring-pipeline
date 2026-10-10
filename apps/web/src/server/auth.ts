import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { userDb } from "@/server/db/user";

export type Role = "admin" | "reviewer";
export interface Staff {
  id: string;
  email: string;
  role: Role;
}

export class ForbiddenError extends Error {
  constructor(message = "You do not have permission to do that.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/** The signed-in staff member, or null. Memoised per request so layouts, pages and actions share one lookup. */
export const getStaff = cache(async (): Promise<Staff | null> => {
  const db = await userDb();
  const { data } = await db.auth.getUser();
  if (!data.user) return null;
  const { data: profile } = await db.from("profiles").select("id,email,role,active").eq("id", data.user.id).single();
  // Signing up only creates an inactive profile; access starts when an admin activates it.
  if (!profile?.active) return null;
  return { id: profile.id, email: profile.email, role: profile.role };
});

/** For pages and actions that any staff member may use. Redirects to /login otherwise. */
export async function requireStaff(): Promise<Staff> {
  const staff = await getStaff();
  if (!staff) redirect("/login");
  return staff;
}

/**
 * For anything that changes shared data. Call it at the top of every Server Action:
 * layout and proxy checks do not protect actions, which are directly invokable.
 */
export async function requireAdmin(): Promise<Staff> {
  const staff = await requireStaff();
  if (staff.role !== "admin") throw new ForbiddenError();
  return staff;
}
