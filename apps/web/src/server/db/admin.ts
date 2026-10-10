import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/server/env";
import type { Database } from "./database.types";

export type AdminDb = ReturnType<typeof createAdminDb>;

function createAdminDb() {
  const e = env();
  return createClient<Database>(e.NEXT_PUBLIC_SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

let client: AdminDb | undefined;

/**
 * Service-role client. Bypasses RLS: only use it for candidate-facing flows, which
 * authenticate by invite code or token instead of a staff session, and for trusted
 * server-side jobs. Never import this from a Client Component.
 */
export function adminDb(): AdminDb {
  return (client ??= createAdminDb());
}
