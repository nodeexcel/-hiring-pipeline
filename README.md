# Interview pipeline

Three-round hiring pipeline from `Interview_Process_Flow.docx`: admin invites a candidate →
**R1 aptitude** (offline mobile app, web fallback) → **R2 coding** (lockdown browser, hidden
tests + reviewer rubric) → **R3 machine test** (emailed take-home, rubric review) → weighted
final decision. Failing a cutoff at R1/R2 auto-rejects with a logged email.

## Status: what is built

Legend: **done** = built and exercised by automated tests or a live run; **not verified** = code
exists but has not been run against the real thing (device, SEB install, production host).

### Admin panel (`apps/web`, dark-first, ChaiUI design system, skeleton loaders on every route)

| Area | What it does | Status |
|---|---|---|
| Candidates | List with status counts and paging, add one, CSV bulk upload, resend invite | done |
| Candidate detail | Scores per round, time taken, proctoring flag timeline, R2 code replay, per-problem test results, similarity matches, R3 submission, reviewer rubrics, email log, audit trail | done |
| Question banks | Aptitude, coding (with hidden tests) and machine-test banks, organised by **topic** with per-topic counts; drafts are reviewed and enabled before they are ever served | done |
| Cutoffs and settings | Per-round pass marks, auto-advance or manual approval, final weights (20/40/40), questions per paper, problems per candidate (3), per-topic cap | done |
| Reports | Pass rate per round and score distributions | done |
| Users | Approve staff (admin or reviewer), activate or deactivate | done |
| Auth | Supabase Auth, role-guarded layout, inactive-by-default signups | done |

### Candidate-facing

| Piece | What it does | Status |
|---|---|---|
| Round 1 mobile app (`apps/mobile`) | Invite code, rules and regulations, encrypted paper download, offline gate, monotonic timer that also counts time the app was closed, flags (internet on, background, screenshot), review screen, signed upload, animated and accessible UI | done (ran on a physical phone through Expo Go) |
| Round 1 web fallback | `/test/r1` on the same API | done |
| Round 2 web IDE | `/test/r2`: Monaco editor, **3 problems per candidate**, JS / Python / Java / C++, run samples, hidden tests on submit, snapshots every 15 s, tab and paste flags | done |
| Safe Exam Browser | Config generator and header check (`/api/seb-config`) | not verified against a real SEB install |
| Round 3 | Emailed take-home link, `/submit/[token]` (GitHub link or zip), deadline and late flag, reviewer rubric, walkthrough date | done |
| Android screen pinning | `modules/kiosk-pin` (Kotlin) | not verified on a device; needs a dev build, not Expo Go |

### Pipeline, data and infrastructure

- **Pipeline engine**: cutoffs, auto-reject with logged email, next-round email, weighted final score,
  audit log on every transition (`packages/shared`, covered by unit tests).
- **Question rotation**: papers favour the least-served questions and cap each topic, so candidates
  do not keep seeing the same items.
- **Database**: 6 migrations (`supabase/migrations`), 16 tables, RLS, explicit grants, topic count
  views. Applied to the local stack and to the hosted project.
- **Code runner**: Piston (default) or Judge0 behind one `CodeRunner` interface.
- **Email**: Resend with logging to `email_log`; falls back to console when no key is set.

### Question bank content

| Content | Count | Source |
|---|---|---|
| Aptitude questions | 127 | generated and self-verified in `question-bank/aptitude.json` |
| Coding problems | 24 | 6 original + 18 medium problems from the open CodeContests dataset, each with the reference solution re-run through the sandbox |
| Take-home tasks | 4 | original |

All of it loads as an **inactive draft**. A person must review and enable it in Admin > Question banks.

### Tests

| Suite | Count | Run with |
|---|---|---|
| Shared logic (unit) | 44 | `pnpm --filter @app/shared test` |
| Mobile (unit + protocol integration against the local server) | 21 | `pnpm --filter mobile test` |
| API end to end (full pipeline incl. hidden tests, reviewers, rotation) | 14 | `pnpm --filter web test:api` |
| Browser (functional, axe accessibility in dark and light, 375 px overflow, titles, focus, 404) | 13 | `pnpm --filter web test:ui` |

All of these run only against the local Supabase stack, never the hosted one.

### Not done yet

- **Deploy**: the candidate APIs are Next.js route handlers, not Supabase Edge Functions. Supabase is the
  database, auth and storage. The app has not been deployed (Vercel is the recommended target).
- **Android emulator or dev-build install**: blocked by a JDK 25 CMake warning; use JDK 17. iOS not tried.
- **Parked admin work** (in a git stash): per-test result storage, audit view of profile changes,
  change-password page, manual "send machine test" button.
- **Hosted data**: every question, problem and task there is still a draft; the question bank needs review.
- **Before real use**: rotate the keys and passwords that were shared during development, and turn
  off "Allow new users to sign up" in Supabase.

## Layout

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

Mobile, quickest path (Expo Go on a phone on the same Wi-Fi; screen pinning is skipped there):
`cd apps/mobile && EXPO_PUBLIC_API_URL=http://<mac-lan-ip>:3000 npx expo start`, then scan the QR code.
A dev build (`npx expo run:android`) is only needed for the screen-pinning module.

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
- Candidate endpoints are rate limited in memory per instance; use a shared store (for example Redis)
  once the app runs on more than one server.
