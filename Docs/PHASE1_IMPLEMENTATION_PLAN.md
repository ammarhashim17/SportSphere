# ScoreSphere — Phase 1 Implementation Plan (for the Antigravity coding agent)

**Phase 1 goal:** a solid, installable base — project tooling, the locked design system and UI kit, navigation shell, authentication, the database (cloud + local), and **Teams & Players** working end to end (offline-capable). The Home Dashboard is built to match Stitch.

**Authority:** this plan is written by the architect. Architectural decisions (section 2) and code (sections M1–M11) are **binding**. The agent implements; it does not redesign. Read `AGENT_RULES.md` first.

**Inputs the agent must have before starting**

| Item | Where it must be |
|---|---|
| Stitch export (second/updated zip: `home_dashboard`, `live_match_scoring`, `match_scorecard`, `scoresphere/DESIGN.md`) | unzipped into `design/stitch/` |
| Logo image (from the first Stitch zip: `scoresphere_logo/screen.png`) | `design/stitch/scoresphere_logo/screen.png` |
| SRS | `docs/ScoreSphere_SRS.md` |
| This plan + `AGENT_RULES.md` | `docs/` and repo root |

---

## 0. Milestones at a glance

| # | Milestone | Output |
|---|---|---|
| M0 | Pre-flight | Questions answered, environment verified |
| M1 | Scaffold & tooling | Expo SDK 54 app, TS strict, lint, tests, CI, git hooks |
| M2 | Styling pipeline & tokens | NativeWind + Stitch tokens + fonts + icons + **compatibility gate** + fidelity test |
| M3 | UI kit | Base components built from tokens |
| M4 | Navigation shell | Routes, auth guard, Stitch-style bottom tab bar |
| M5 | Backend | Supabase schema, RLS, storage, generated types |
| M6 | Authentication | Secure session, auth store, TEMP auth screens |
| M7 | Local DB & sync | Drizzle schema, repositories, outbox, push/pull sync |
| M8 | Teams & Players | Logic, forms, TEMP screens, image upload |
| M9 | Home Dashboard | Pixel-matched to Stitch (fixture data) |
| M10 | Settings & sync status | Profile/settings TEMP screen, sign-out wipe |
| M11 | QA & exit | Tests, fidelity sign-off, report |

---

## 1. How the agent must work (summary)
- Follow `AGENT_RULES.md`. Stop at the **gates** (marked 🚧) and when a question is unanswered.
- After each milestone: `npm run check` → acceptance checks → commit → short report → continue.
- All deviations go to `docs/DEVIATIONS.md`.

---

## 2. Architecture Decisions (binding)

| ID | Decision | Rationale |
|---|---|---|
| **ADR-01** | **Expo SDK 54** (React Native 0.81, New Architecture, Hermes). Pin it; upgrading is a separate, later task. Use **development builds** (`expo-dev-client`), not Expo Go. | The libraries below are known to work together on SDK 54. Expo Go on iOS only supports the newest SDK, so a dev client avoids surprises. |
| **ADR-02** | **Single app package** (no monorepo yet). Pure domain code lives in `src/core/` (no React/Expo imports; ESLint-enforced) so it can be extracted into a package in Phase 3. | Simplest for a small team. *Amends SRS 9.4 (monorepo).* |
| **ADR-03** | **npm** as package manager. | Fewest tooling problems with Expo. *Amends SRS (pnpm).* |
| **ADR-04** | Styling = **NativeWind v4 + Tailwind CSS 3.4**. `src/theme/tokens.json` is a **verbatim copy** of the Tailwind config embedded in Stitch's `code.html` (colours, spacing, radii, font sizes) so Stitch classes translate 1:1. | Fidelity lock. |
| **ADR-05** | Fonts = **Inter** static weights (`@expo-google-fonts/inter`). Weight is selected by **font-family token** (`font-inter-semibold`), never `font-weight`. Letter-spacing converted from em to px. | `fontWeight` with custom fonts causes faux-bold/fallback on Android. |
| **ADR-06** | Shadows use the RN `boxShadow` style (New Architecture) with the **exact** values from Stitch. Header/tab-bar `backdrop-blur` is rendered as the same colour at the same opacity without blur (visually equivalent at 90–95 % white). | Exact cross-platform shadows. |
| **ADR-07** | Icons = **Material Symbols Outlined** (the same set Stitch uses), as a **subset font** built from only the icons used in the Stitch HTML, via `createIconSet`. | Fidelity; small bundle. No filled variant is used in the designs. |
| **ADR-08** | Backend = **Supabase** (Postgres + Auth + Storage). RLS on every table. App uses the **anon key only**. | SRS 9.1. |
| **ADR-09** | **Local-first for Teams/Players/Squads:** SQLite (`expo-sqlite` + Drizzle) is what the UI reads; every write = local transaction + **outbox** row; background **push/pull sync** to Supabase. | Offline requirement; same pattern Phase 3 reuses for deliveries. |
| **ADR-10** | **IDs are client-generated UUIDs** (`expo-crypto`). `updated_at` is **server-authoritative** (trigger). Deletes are **soft** (`archived_at` / `active=false`); no hard deletes from the app. | Offline-safe, history-safe. |
| **ADR-11** | Auth = Supabase **email + password**. Session persisted with **LargeSecureStore** (AES key in SecureStore, ciphertext in AsyncStorage). Profile cached locally. Local data is wiped on sign-out or when a different user signs in. | SEC-02, SEC-11. |
| **ADR-12** | **Roles** live in `profiles.roles` (enum array). New accounts get `{team_manager, scorer}` (answer Q6 may change it). Users cannot edit their own roles (column-level grant). Enforcement is in RLS; the UI only hides buttons. | SEC-05. |
| **ADR-13** | State: **Zustand** for auth/session/sync-status; **Drizzle `useLiveQuery`** for data. **TanStack Query is NOT installed in Phase 1** (nothing remote-only yet). | YAGNI. *Amends SRS 9.1.* |
| **ADR-14** | Forms = **React Hook Form + Zod**; Zod schemas live in `src/core/schemas.ts` and are reused by repositories. | One validation source. |
| **ADR-15** | **Home Dashboard** is built to match Stitch using **fixtures** (`EXPO_PUBLIC_USE_FIXTURES=true`). Real match data is wired in Phases 2–3. | Match data does not exist until scoring exists. |
| **ADR-16** | Screens without a Stitch design are **TEMP-UI** (UI-kit only, flagged, tracked). | LOCK-03. |
| **ADR-17** | Image upload (logo/photo/avatar) is **online-only** in Phase 1; the picker button is disabled offline with an inline message. | Keeps sync simple. |
| **ADR-18** | Tests: **Jest (jest-expo)** + RNTL. Includes an automated **token-fidelity test** comparing `tokens.json` to the Stitch HTML. E2E (Maestro) starts in Phase 3. | LOCK-02 enforced by CI. |
| **ADR-19** | Routing = **Expo Router** (typed routes), groups `(auth)` and `(app)`; guard via `Stack.Protected`. | Matches SRS 9.1. |

---

## 3. Questions for the user (agent asks these in ONE message at M0)

The agent must ask all of these at once, show the default, and accept "use defaults".

| # | Question | Default if the user says "use defaults" |
|---|---|---|
| **Q1** | Which OS is your dev machine (Windows / macOS / Linux), and which devices will you test on (Android emulator, Android phone, iOS simulator, iPhone)? | Android only, via emulator or USB phone (`npx expo run:android`). iOS is skipped (needs macOS). |
| **Q2** | Do you already have a **Supabase project** (URL + anon key)? Is **Docker** installed for running Supabase locally? | Use a **hosted** Supabase project: the user creates it and pastes the URL and anon key into `.env`. Local Supabase is skipped. |
| **Q3** | App name and ids? | Name `ScoreSphere`, slug `scoresphere`, scheme `scoresphere`, Android package / iOS bundle `com.scoresphere.app` (change before store release). |
| **Q4** | Is the logo at `design/stitch/scoresphere_logo/screen.png` the correct logo (the updated Stitch HTML only links a remote logo URL)? | Yes, use it for the app icon, splash and header. |
| **Q5** | Default roles for new accounts? | `team_manager` + `scorer`. |
| **Q6** | Do you have Stitch designs for **Login / Sign-up / Teams / Team Profile / Players / Player Profile / Forms / Settings**? | No → build them as **TEMP-UI** and list them for later replacement. |
| **Q7** | Is a git remote available (GitHub)? | Local git only; skip GitHub Actions. |
| **Q8** | Must email confirmation be required at sign-up? | Required in the hosted project (Supabase default); disabled only in local dev. |
