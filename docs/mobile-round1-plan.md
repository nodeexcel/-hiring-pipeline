# Round 1 mobile app: plan

Status: **M1 to M4 are implemented and verified without a device. M5 (real phone QA and a signed build) is open.**
See "Implementation status" at the end for what exists, what was verified, and what is still needed.
Scope: the candidate-facing aptitude test, as described in section 3 of `Interview_Process_Flow.docx`.

## 1. Goal

A minimal React Native (Expo) app that lets a candidate:

1. enter their invite code while online,
2. read and accept the rules of Round 1,
3. download an encrypted, randomised paper,
4. switch the internet off, and take the timed test offline,
5. submit the answers when back online, and see a clear confirmation.

Android first (it allows screen pinning and screenshot blocking). iOS builds are possible but weaker, see section 8.

## 2. What already exists, and what is new

`apps/mobile` already holds a working skeleton. It has never run on a device.

| Capability (from the doc) | Today | Work needed |
|---|---|---|
| Invite code entry | Basic input | Redesign, validation messages, paste-friendly |
| Encrypted randomised paper | Done (server AES-GCM, pure-JS decrypt, round-trip tested in `packages/shared`) | Keep |
| Refuse to start while online | Done (NetInfo check) | Better UX and edge cases (airplane mode, Wi-Fi only) |
| Monotonic timer | Done (`performance.now`) | Persist and resume; extract and unit test |
| Answers saved encrypted | Done | Keep |
| Flags: internet on, app backgrounded, screenshots | Done | Show non-accusing UX, batch upload |
| Android screen pinning | Native module written, never compiled | Build and verify on a device |
| Submit with signature | Done | Retry queue if the upload fails |
| **Rules and regulations screen** | **Missing** | **New** |
| **Design system (ChaiUI look)** | **Missing** | **New** |
| **Structure and tests** | One 310-line file, no tests | **Restructure, add tests** |
| Accessibility, reduced motion, error states | Missing | New |

## 3. Screens and flow

```
Welcome / invite code  ->  Rules (must accept)  ->  Download paper  ->  Ready (offline gate)
        ->  Test  ->  Review answers  ->  Submit  ->  Done
```

| Screen | Purpose | Notes |
|---|---|---|
| Invite code | Enter the code from the email | Uppercase, trims spaces, clear errors: unknown code, already submitted, round not open, no network |
| Rules and regulations | Candidate reads and accepts before anything is downloaded | Accept is required; acceptance time is logged as an event |
| Download | Fetch and store the encrypted paper | Skeleton loader, retry, shows question count and duration |
| Ready | Offline gate | Live "Internet is on / off" status; Start is disabled until offline; explains how to turn it off |
| Test | One question at a time, with progress and a visible countdown | Option select, previous and next, question palette, "flag for review" |
| Review | Summary of answered, unanswered and flagged | Jump to any question; final Submit with confirmation |
| Submit | Ask to turn internet back on, upload, show progress | Retry on failure; answers stay safely on the device |
| Done | Confirmation only | Does not reveal the score or cutoff, matching the server |

Edge states to design for: app killed mid-test and resumed, clock changed, time runs out (auto-submit), upload fails (queue and retry), low battery, device rotated.

## 4. Rules and regulations (draft for your approval)

Drafted from the mechanisms in the doc. Edit freely; the final wording is yours.

1. This is a timed test of **N questions in M minutes**. The timer starts when you tap Start and cannot be paused.
2. You get **one attempt**. Closing the app does not stop the timer.
3. **Turn your internet off before you start.** The test will not begin while you are online.
4. **Stay in the app.** Leaving the app, switching apps or turning the internet back on during the test is recorded and shown to the reviewer.
5. **No screenshots, recordings or copying** of the questions.
6. **Work alone.** No other person, device, calculator app, or websites. Rough paper is allowed.
7. Changing the phone's clock does not affect the timer.
8. Your answers are saved securely on your device. When time ends, or when you submit, **turn the internet back on** to upload them.
9. Do not uninstall the app or clear its data before your answers are uploaded.
10. Results are shared by the hiring team, not shown in the app.

Open question: should the rules be served from the server (editable by admins without an app release) or bundled in the app? **Recommendation: serve from the server** with a bundled fallback.

## 5. UI: applying the ChaiUI skill to React Native

The `@chaiui` registry components are web-only (Tailwind, Radix), so they cannot be installed into React Native. What carries over is the **design system itself**: its tokens and rules, ported into a small RN theme module.

| ChaiUI rule | RN implementation |
|---|---|
| Dark first, near-black neutral background, white type | `theme/colors.ts` from the skill's `tokens.css` values (oklch converted to hex); light theme supported via `useColorScheme` |
| One cream accent (orange-100 dark, yellow-800 light); orange never a fill | `colors.highlight`; no orange fills anywhere |
| Manrope for UI, Montserrat for titles, prices and buttons on cards, Onest for the wordmark | `@expo-google-fonts/manrope`, `montserrat`, `onest` via `expo-font`, with a splash hold until loaded |
| Solid white button with asymmetric corners, one per screen; outline mirrored beside it | `Button` with `borderTopRightRadius` and `borderBottomLeftRadius` large, the others 0 |
| Warm hairline cards, no shadow, faint fill | `Card` with 1px `cardEdge` border and `cardFill` background |
| Highlight phrase: one per paragraph, cream Montserrat | `<Highlight>` inline text component |
| Status as text or thin outline, never filled pills | `Chip` outline variants only |
| Sentence case, no em dashes, no all-caps eyebrows | Copy lint in tests (grep for the em dash character) |
| Skeleton loaders, reduced motion respected | Animated pulse that checks `AccessibilityInfo.isReduceMotionEnabled` |
| Destructive actions: confirm dialog saying exactly what happens | `ConfirmDialog` for Submit and for leaving the test |

The hexagon backdrop glow is optional on mobile (an SVG via `react-native-svg`); I would include it on the invite and done screens only, to keep the test screen clean and fast.

Brand note: the ChaiCode logo and cup mark are **not** used. The app shows a plain wordmark with your organisation's name.

## 6. Architecture

Keep it small. No state library.

```
apps/mobile/src/
  app/              App.tsx, navigation (a tiny reducer-driven stack, no router dependency)
  theme/            colors, typography, spacing, useTheme
  components/       Button, Card, Chip, Highlight, Field, Skeleton, ConfirmDialog, Timer
  features/round1/
    state.ts        pure reducer + types (testable without React Native)
    machine.ts      allowed transitions
    api.ts          paper, submit, events (typed, zod-validated responses)
    storage.ts      encrypted session persistence
    timer.ts        monotonic clock with checkpointing (pure, testable)
    proctor.ts      NetInfo, AppState, screenshot listeners -> event queue
    kiosk.ts        Android screen pinning wrapper (optional native module)
    screens/        CodeScreen, RulesScreen, DownloadScreen, ReadyScreen, TestScreen, ReviewScreen, SubmitScreen, DoneScreen
  lib/              config, errors
```

Principles: logic that matters (state transitions, timer, scoring inputs, event queue) lives in pure modules with unit tests; screens are thin; the server stays the single source of truth for scoring and cutoffs.

## 7. API contract

Uses the existing, tested endpoints. Proposed additions are marked.

| Endpoint | Status | Purpose |
|---|---|---|
| `POST /api/r1/paper` (`encrypt: true`) | exists | Issue or re-issue the encrypted paper |
| `POST /api/r1/submit` | exists | Signed answers, elapsed time, events |
| `POST /api/events` | exists | Proctoring events |
| `GET /api/r1/rules` | **proposed** | Rules text, question count and duration, so wording can change without a release |
| Request-level rate limiting | exists | Already on all candidate routes |

The paper endpoint draws only from **active** questions, so unreviewed drafts can never reach the app.

## 8. Honest limits (to set expectations)

- A candidate can still use a **second device or another person**. The app makes cheating harder and visible, not impossible.
- **Android only for blocking**: screenshot blocking and screen pinning are Android features. iOS can only detect screenshots, and cannot be locked down on personal phones.
- Screen pinning asks the user to confirm unless the device is company-managed.
- The paper decryption key ships with the paper, so on-device encryption protects data at rest, not against a candidate controlling the device.
- Going offline is **enforced at start**, but a candidate could turn the internet back on mid-test. That is detected and flagged, not prevented.

## 9. Testing and verification

- **Unit tests** (Vitest, in `packages/shared` or the app): state machine transitions, timer (clock changes, resume, background), event queue, signature compatibility (already covered), copy lint.
- **Type check and Metro bundle** in CI.
- **Device QA checklist** on a real Android phone: install, enter code, rules, download, airplane mode on, start, background the app, kill and resume, screenshot attempt, time out, restore network, upload, confirm in admin.
- **End to end**: a script drives the same API calls the app makes against the local stack (already how the mobile protocol is tested today).

I cannot run the app on a device from here. Everything above except the device checklist is verifiable by me; the checklist needs a real phone and Android Studio (JDK 17 plus the Android SDK) on your side.

## 10. Build and distribution

- Needs an **Expo dev build** (the native pinning module means Expo Go will not work). `npx expo run:android` locally, or EAS Build.
- Distribution for a hiring round: signed APK shared directly, or Play Store internal testing. iOS needs an Apple developer account and TestFlight.
- App identity: name, bundle id (`co.example.interview` is a placeholder), icon.

## 11. Milestones

| # | Milestone | Outcome |
|---|---|---|
| M1 | Theme, fonts and components | The ChaiUI-style kit, a screen gallery |
| M2 | Flow and screens | Code, rules, download, ready, test, review, submit, done working against the local stack |
| M3 | Offline, resume, retry | Offline gate, persisted timer, upload retry queue, proctoring flags |
| M4 | Tests and hardening | Unit tests, copy lint, accessibility pass, error states |
| M5 | Device QA and build | Real-phone checklist passed, signed Android build |

## 12. Acceptance criteria

- A candidate can go from invite code to confirmation without help.
- The test cannot start while online, and the timer survives a restart and a clock change.
- Rules must be accepted before the paper downloads, and acceptance is recorded.
- Only active questions are ever served.
- Every screen follows the ChaiUI rules (checked with the review checklist).
- The admin panel shows the submission, score and flags.

## 13. Decisions needed from you

1. **Rules text:** approve or edit section 4, and decide server-served versus bundled.
2. **Navigation inside the test:** free movement between questions (recommended) or strictly forward-only?
3. **Show the result to the candidate** after submit, or confirmation only (recommended)?
4. **Platforms:** Android only for the first release (recommended), or iOS as well?
5. **Branding:** app name, icon and organisation name for the wordmark.
6. **Distribution:** direct APK or Play Store internal testing?
7. **Light theme:** dark only (ChaiUI default), or dark and light?


## 14. Implementation status

### Decisions taken (the defaults recommended above; change any of them and I will adjust)
1. **Rules text:** served by the API (`POST /api/r1/rules`) with the real question count and duration, so it can change without an app release. The wording in section 4 is what ships.
2. **Navigation inside the test:** free movement between questions, a review screen, and a flag-for-review toggle.
3. **Result:** confirmation only. Neither the score nor the cutoff is shown, matching the server.
4. **Platforms:** Android first. iOS builds, but screen pinning and screenshot blocking are Android only.
5. **Branding:** plain "Hiring pipeline" wordmark in Onest (placeholder, set `copy.appName`). The ChaiCode logo is not used.
6. **Theme:** follows the phone setting, dark by default.

### What exists
| Milestone | State | Where |
|---|---|---|
| M1 theme and components | Done | `src/theme`, `src/ui` (Button with asymmetric corners, Card, Chip, Highlight, Skeleton, ConfirmDialog) |
| M2 flow and screens | Done | `src/screens`: code, rules, preparing, ready, test, review, submitting, done |
| M3 offline, resume, retry | Done | `src/round1/useRound1.ts`: offline gate, persisted clock, restart resume, upload retry |
| M4 tests and hardening | Done | 16 tests: state machine, clock, events, copy lint, and an integration test of the real client modules against the local stack |
| M5 device QA and build | **Open** | needs a real Android phone |

### Verified
- Pure logic: state transitions, monotonic clock (wall clock cannot add time, resume after restart, expiry), event de-duplication and cap, and a lint that fails on em dashes anywhere in the app source.
- The app's real API client, decryption, signing and state machine against the real server: rules, then accept, then encrypted paper, then answer, then signed submit, ending with a score of 100, no `bad_signature` flag and the candidate advanced to "R1 done". A second submit is refused and mapped to a friendly outcome.
- Types are clean and the app bundles for Android with Metro (681 modules, 6 font files).

### Not verified (needs your phone)
- Running on a device or emulator: layout, touch targets, fonts rendering, keyboard behaviour.
- The Kotlin screen-pinning module compiling and pinning (it needs a development build, not Expo Go).
- Screenshot blocking on Android, airplane-mode behaviour, and resume after the OS kills the app.

### How to run it
```bash
cd apps/web && pnpm dev:local          # server on :3100 using the local stack
cd apps/mobile
EXPO_PUBLIC_API_URL=http://<your-computer-ip>:3100 npx expo run:android   # needs Android Studio
pnpm test                              # unit + integration tests
```
For a physical phone use your computer's LAN address (not localhost); for the emulator the default `10.0.2.2` works.
