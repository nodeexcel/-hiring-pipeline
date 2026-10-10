import { candidateRoute } from "@/features/rounds/handler";
import { issuePaper } from "@/features/rounds/r1";
import { paperRequestSchema } from "@/features/rounds/schemas";

export const POST = candidateRoute({ route: "r1-paper", limit: 60, schema: paperRequestSchema }, ({ candidate, data }) =>
  issuePaper(candidate, data.encrypt ?? false),
);
