import { redirect } from "next/navigation";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Backdrop } from "@/components/backdrop";
import { requireStaff } from "@/server/auth";
import { userDb } from "@/server/db/user";

async function signOut() {
  "use server";
  const db = await userDb();
  await db.auth.signOut();
  redirect("/login");
}

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const staff = await requireStaff();
  return (
    <div className="relative isolate min-h-screen overflow-x-clip">
      <Backdrop />
      <AdminHeader email={staff.email} role={staff.role} signOut={signOut} />
      <main className="mx-auto w-full max-w-6xl p-6 sm:p-12">{children}</main>
    </div>
  );
}
