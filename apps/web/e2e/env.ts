// Tests create and delete data, so they run against the local Supabase stack only.
process.loadEnvFile(".env.localstack");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(url)) {
  throw new Error(`Refusing to run tests against a non-local Supabase project: ${url}`);
}
