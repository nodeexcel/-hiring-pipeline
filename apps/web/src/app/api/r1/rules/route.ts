import { candidateRoute } from "@/features/rounds/handler";
import { getRules } from "@/features/rounds/r1";
import { codeOnlySchema } from "@/features/rounds/schemas";

export const POST = candidateRoute({ route: "r1-rules", limit: 60, schema: codeOnlySchema }, ({ candidate }) => getRules(candidate));
