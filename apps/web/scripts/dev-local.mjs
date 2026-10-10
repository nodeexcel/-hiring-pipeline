// Starts Next against the LOCAL Supabase stack on port 3100, so the hosted project
// (the default `pnpm dev`, port 3000) is never used by tests.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

process.loadEnvFile(".env.localstack");
process.env.NEXT_DIST_DIR = ".next-local";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(url)) {
  console.error(`Refusing to start: .env.localstack points at ${url}, which is not local.`);
  process.exit(1);
}

const next = createRequire(import.meta.url).resolve("next/dist/bin/next");
const child = spawn(process.execPath, [next, "dev", "-p", "3100"], { stdio: "inherit", env: process.env });
child.on("exit", (code) => process.exit(code ?? 0));
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => child.kill(sig));
