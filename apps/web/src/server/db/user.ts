import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/server/env";
import type { Database } from "./database.types";

/** Cookie-bound client acting as the signed-in staff user, so RLS applies. */
export async function userDb() {
  const store = await cookies();
  const e = env();
  return createServerClient<Database>(e.NEXT_PUBLIC_SUPABASE_URL, e.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Called from a Server Component; the proxy refreshes sessions instead.
        }
      },
    },
  });
}
