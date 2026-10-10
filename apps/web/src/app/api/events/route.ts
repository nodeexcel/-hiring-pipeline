import { candidateRoute } from "@/features/rounds/handler";
import { ok } from "@/features/rounds/result";
import { eventsRequestSchema } from "@/features/rounds/schemas";
import { logEvents } from "@/server/candidates/access";

/** Batched proctoring events from the web test pages and the mobile app. */
export const POST = candidateRoute({ route: "events", limit: 240, schema: eventsRequestSchema }, async ({ candidate, data }) => {
  await logEvents(candidate.id, data.round, data.events);
  return ok({ ok: true });
});
