import { candidateRoute } from "@/features/rounds/handler";
import { startAttempt } from "@/features/rounds/r2";
import { codeOnlySchema } from "@/features/rounds/schemas";

export const POST = candidateRoute({ route: "r2-start", limit: 60, schema: codeOnlySchema }, ({ candidate, req }) =>
  startAttempt(candidate, req),
);
