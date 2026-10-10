import "server-only";
import { userDb } from "@/server/db/user";
import { requireStaff } from "@/server/auth";

export async function listUsers() {
  await requireStaff();
  const db = await userDb();
  const { data } = await db.from("profiles").select("id,email,role,active").order("created_at");
  return data ?? [];
}
