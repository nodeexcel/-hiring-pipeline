import { candidateRoute } from "@/features/rounds/handler";
import { runSamples } from "@/features/rounds/r2";
import { sourceSchema } from "@/features/rounds/schemas";

export const POST = candidateRoute({ route: "r2-run", limit: 90, schema: sourceSchema }, ({ candidate, data }) =>
  runSamples(candidate, data.problemId, data.language, data.source),
);
