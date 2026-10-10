import { redirect } from "next/navigation";
import { Backdrop } from "@/components/backdrop";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/form-field";
import { Input } from "@/components/ui/input";
import { userDb } from "@/server/db/user";

async function signIn(formData: FormData) {
  "use server";
  const db = await userDb();
  const { error } = await db.auth.signInWithPassword({
    email: String(formData.get("email")),
    password: String(formData.get("password")),
  });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  redirect("/admin/candidates");
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  return (
    <div className="relative isolate flex min-h-screen items-center justify-center overflow-x-clip p-6">
      <Backdrop />
      <main className="w-full max-w-sm">
        <div className="mb-8 space-y-2 text-center">
          <p className="font-onest text-xl font-medium tracking-tight">Hiring pipeline</p>
          <h1 className="text-2xl font-medium sm:text-3xl">Sign in</h1>
          <p className="text-base text-neutral-600 dark:text-neutral-400">
            Manage invites, rounds and <span className="highlight">final decisions</span>.
          </p>
        </div>
        <form action={signIn} className="space-y-4">
          <FormField label="Email">
            <Input name="email" type="email" required placeholder="Email" autoComplete="username" />
          </FormField>
          <FormField label="Password">
            <Input name="password" type="password" required placeholder="Password" autoComplete="current-password" />
          </FormField>
          {error && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {String(error)}
            </p>
          )}
          <Button type="submit" variant="solid" size="lg" className="w-full" iconRight={null}>
            Sign in
          </Button>
        </form>
      </main>
    </div>
  );
}
