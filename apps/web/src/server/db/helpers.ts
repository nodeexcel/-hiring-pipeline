import type { Database } from "./database.types";

/** Row type shortcut: Tables<"candidates"> */
export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
