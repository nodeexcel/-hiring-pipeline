import { Backdrop } from "@/components/backdrop";
import { Chip } from "@/components/ui/chip";
import { adminDb } from "@/server/db/admin";
import { SubmitForm } from "./SubmitForm";

export default async function SubmitPage({ params }: PageProps<"/submit/[token]">) {
  const { token } = await params;
  const db = adminDb();
  const { data: a } = await db.from("r3_assignments").select("*").eq("token", token).maybeSingle();
  if (!a)
    return (
      <div className="relative isolate min-h-screen overflow-x-clip">
        <Backdrop />
        <main className="mx-auto max-w-md p-6 pt-32 text-center text-base sm:pt-40">This link is not valid.</main>
      </div>
    );
  const { data: task } = await db.from("machine_tasks").select("title,brief").eq("id", a.task_id).single();
  const late = !a.submitted_at && new Date() > new Date(a.deadline);

  return (
    <div className="relative isolate min-h-screen overflow-x-clip">
      <Backdrop />
      <main className="mx-auto max-w-xl space-y-6 p-6 pt-24 sm:pt-32">
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Round 3: machine test</p>
          <h1 className="text-2xl font-medium sm:text-3xl">{task?.title}</h1>
          <p className="text-base leading-relaxed whitespace-pre-wrap text-neutral-700 dark:text-neutral-300">{task?.brief}</p>
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>
              Deadline: <b className="text-foreground">{new Date(a.deadline).toUTCString()}</b>
            </span>
            {late && <Chip tone="danger">Passed, submissions are marked late</Chip>}
          </p>
        </div>

        {a.submitted_at ? (
          <p className="rounded-xl border border-green-600/30 px-4 py-3 text-green-800 dark:border-green-400/30 dark:text-green-300">
            Submitted on {new Date(a.submitted_at).toUTCString()}
            {a.is_late ? " (late)" : ""}. Thank you, we will be in touch.
          </p>
        ) : (
          <SubmitForm token={token} />
        )}
      </main>
    </div>
  );
}
