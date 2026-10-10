import "server-only";
import { createHash } from "node:crypto";
import { env } from "@/server/env";

/**
 * Safe Exam Browser sends X-SafeExamBrowser-ConfigKeyHash = SHA256(absoluteURL + configKey).
 * Returns null when no config key is configured (check disabled).
 */
export function sebValid(req: Request, configKey: string | undefined): boolean | null {
  if (!configKey) return null;
  const header = req.headers.get("x-safeexambrowser-configkeyhash");
  if (!header) return false;
  const url = new URL(req.url);
  const expected = createHash("sha256")
    .update(`${env().APP_URL}${url.pathname}${url.search}${configKey}`)
    .digest("hex");
  return header.toLowerCase() === expected;
}
