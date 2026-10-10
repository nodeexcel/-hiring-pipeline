import { candidateRoute } from "@/features/rounds/handler";
import { submitAttempt } from "@/features/rounds/r2";
import { submitSolutionsSchema } from "@/features/rounds/schemas";

export const POST = candidateRoute({ route: "r2-submit", limit: 30, schema: submitSolutionsSchema }, ({ candidate, data }) =>
  submitAttempt(candidate, data),
);
