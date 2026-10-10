# Interview pipeline

Three-round hiring pipeline from `Interview_Process_Flow.docx`: admin invites a candidate →
**R1 aptitude** (offline mobile app, web fallback) → **R2 coding** (lockdown browser, hidden
tests + reviewer rubric) → **R3 machine test** (emailed take-home, rubric review) → weighted
final decision. Failing a cutoff at R1/R2 auto-rejects with a logged email.

```
apps/web          Next.js 16 (App Router)
  src/app           routing only: thin pages, layouts, route handlers, loading/error files
  src/features/     one folder per domain: schemas.ts (zod), queries.ts (server-only data
                    access, returns minimal DTOs), actions.ts (authorise, validate, mutate)
  src/server/       server-only infrastructure: env, typed db clients, auth guard, email,
                    pipeline, code runner, security (crypto, SEB, rate limit)
  src/components/   ui/ (vendored @chaiui registry), admin/ (app parts), form-field
apps/mobile       Expo (React Native): Round 1 offline app, Android-first
packages/shared   scoring, cutoffs, randomisation, similarity, crypto, zod schemas (tested)
supabase/         migrations, RLS, seed (local only)
infra/            Piston (default) + Judge0 compose, SEB notes
```

Conventions: pages never query the database directly (they call `features/*/queries.ts`);
every Server Action starts with `requireAdmin()`/`requireStaff()` and validates input with
zod; `server-only` modules cannot be imported by client code; `process.env` is read in
exactly one place (`src/server/env.ts`).

## Run locally

```bash
pnpm install
supabase start                         # Postgres/Auth/Storage via Docker
supabase db reset                      # applies migrations + sample seed
cp apps/web/.env.example apps/web/.env.local   # fill keys from `supabase status`
docker compose -f infra/docker-compose.piston.yml up -d && ./infra/piston-install.sh
pnpm dev                               # http://localhost:3000
```

Every new Auth user is an **inactive reviewer**: signing up grants no access, because the Auth API
is reachable with the public key. An admin approves people from Admin > Users. Create your user (Studio, or the admin API), then
promote it once:

```sql
update public.profiles set role = 'admin', active = true where email = 'you@company.com';
```

For a hosted project also turn **off** "Allow new users to sign up" (Authentication settings)
and add people from Admin > Users instead.

Mobile: `cd apps/mobile && EXPO_PUBLIC_API_URL=http://<host-ip>:3000 npx expo run:android`
(dev build required; Expo Go cannot load the screen-pinning native module).

## Question bank

A starter bank of original content ships in `question-bank/` (127 aptitude questions, 6 coding
problems with hidden tests, 4 take-home tasks). It is generated and self-verified:

```bash
python3 scripts/question-bank/generate.py            # rebuild the JSON (re-runs reference solutions through the runner)
cd apps/web
node scripts/load-question-bank.mjs --target=local    # or --target=hosted
```

Everything loads as an **inactive draft** and is never served to candidates until an admin enables
it in Admin > Question banks (review each question, which shows its options and correct answer).
Re-running the loader skips items already present. Generated content must be reviewed by a person
before it is used in a scored round.

Mobile app plan: `docs/mobile-round1-plan.md`.

## Tests

```bash
pnpm test                                              # shared unit tests
pnpm --filter web exec vitest run -c vitest.e2e.config.ts   # e2e vs local stack (needs dev server)
```

## What the system can and cannot guarantee

Same constraints as the process doc: software cannot make a candidate's own device "no
internet", stop a second phone, or stop another person in the room. Everything here makes
cheating **harder and detectable**, and records flags for a human to judge.

- R1 mobile: refuses to start online, flags internet turning on / app backgrounded /
  screenshots (iOS detect, Android blocked), pins the screen on Android (user confirms),
  uses a monotonic timer, signs answers. The paper key ships with the paper, so on-device
  encryption protects data at rest, not against a candidate who controls the device.
- R2: Safe Exam Browser header check (`X-SafeExamBrowser-ConfigKeyHash`), tab/paste flags,
  code snapshots for replay, similarity check. Hidden tests never leave the server.
- R3: open-book by nature. Use the walkthrough-call field; email open tracking is not used
  (link clicks are).
- Pipeline caveat: R3 cutoff is applied when an admin clicks **Close reviews & apply
  cutoff**, so one early reviewer cannot auto-reject a candidate.

## Known limitations / not yet verified

- Judge0 1.13.1 does **not** run on cgroup v2 hosts (Docker Desktop); Piston is the default.
  Judge0 remains available (`RUNNER=judge0`) for Linux hosts with cgroup v1.
- Piston's `/piston/jobs` sandbox needs a privileged container: run it on an isolated host
  in production, never alongside secrets.
- SEB config (`/api/seb-config`) and the Kotlin screen-pin module were not exercised against
  a real SEB install / Android device in this repo.
- No rate limiting on candidate endpoints yet (invite codes are 40-bit random).
