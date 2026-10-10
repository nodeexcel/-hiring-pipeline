import "server-only";
import { inviteCodeSchema, type ProctoringEvent } from "@app/shared";
import { adminDb } from "@/server/db/admin";

/** Candidates authenticate with their invite code instead of a staff session. */
export async function candidateByCode(code: unknown) {
  const parsed = inviteCodeSchema.safeParse(code);
  if (!parsed.success) return null;
  const { data } = await adminDb().from("candidates").select("*").eq("invite_code", parsed.data).maybeSingle();
  return data;
}

export async function logEvents(candidateId: string, round: 1 | 2 | 3, events: ProctoringEvent[]) {
  if (events.length === 0) return;
  await adminDb()
    .from("proctoring_events")
    .insert(
      events.map((e) => ({
        candidate_id: candidateId,
        round,
        type: e.type,
        detail: (e.detail ?? null) as never,
        at: e.at && !Number.isNaN(Date.parse(e.at)) ? e.at : new Date().toISOString(),
      })),
    );
}
