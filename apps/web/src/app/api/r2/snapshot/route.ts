import { candidateRoute } from "@/features/rounds/handler";
import { saveSnapshot } from "@/features/rounds/r2";
import { sourceSchema } from "@/features/rounds/schemas";

/** Periodic code snapshots so a reviewer can replay how each solution was written. */
export const POST = candidateRoute({ route: "r2-snapshot", limit: 180, schema: sourceSchema }, ({ candidate, data }) =>
  saveSnapshot(candidate, data.problemId, data.language, data.source),
);
