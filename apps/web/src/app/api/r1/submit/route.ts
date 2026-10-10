import { candidateRoute } from "@/features/rounds/handler";
import { submitPaper } from "@/features/rounds/r1";
import { r1SubmitSchema } from "@/features/rounds/schemas";

export const POST = candidateRoute({ route: "r1-submit", limit: 60, schema: r1SubmitSchema }, ({ candidate, data }) =>
  submitPaper(candidate, data),
);
