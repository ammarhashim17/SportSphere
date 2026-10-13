# ScoreSphere — Phase 2 Implementation Plan (for the Antigravity coding agent)

**Phase 2 goal:** a scorer can **create a match, pick the Playing XI, record the toss, and score a complete match ball by ball on a phone — including wickets, extras, undo and corrections — fully offline** — then see the innings break, the chase and the automatic result. The live scoring screen matches the Stitch design.

**Authority.** This plan, `AGENT_RULES.md` and the code in **`phase2-code.zip`** are written by the architect. The agent **installs and wires** what is here; it does **not** invent architecture, screens or rules. Where something is missing the agent **stops and asks** (lesson from Phase 1: the plan ended at M7 and the agent improvised M8–M11). Everything the agent needs for Phase 2 is in this file or in the zip.

---

## 0. What the architect has already verified (so you know what to trust)

I wrote the code below **and ran it** on a clean copy of your repository (`main` at the time of writing):

| Checked                                                                                                                                                                                                                              | Result            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------- |
| Scoring engine — 52 scenario tests (44 engine + 8 builder/audit: extras, strike rotation, over end, maidens, every wicket type, free hit, chase end, result text, undo/edit replay)                                                  | ✅ pass           |
| Engine **property tests**: about 900 random valid innings (4 properties × 200–300 runs each) — runs = bat + extras, legal balls, wickets = batters out, bowler totals, partnership sums, replay = incremental, undo = previous state | ✅ pass           |
| Repositories on **real SQL** (better-sqlite3 + real Drizzle migrations): create match → XI → toss → innings → score → innings break → chase → auto result → undo → audited edit → outbox order                                       | ✅ pass (4 flows) |
| Server migration `0002_matches.sql` in a real Postgres (PGlite): constraints + RLS (viewer cannot create/score, only scorer scores, no hard deletes, audit append-only, duplicate `(innings, seq)` rejected)                         | ✅ 19/19          |
| Whole project from a clean clone: `tsc` clean, **79 tests pass**, ESLint **0 errors/0 warnings**                                                                                                                                     | ✅                |

**NOT verified (this is what Phase 2 acceptance must prove on your device):** that the app builds and runs on Android; pixel fidelity of the live screen; behaviour of the TEMP sheets; sync against your hosted Supabase; installing `better-sqlite3` on Windows.

---

## 1. Inputs and installation

### 1.1 What you received

| File                            | Use                                                                                                                                                                                  |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `PHASE2_IMPLEMENTATION_PLAN.md` | this plan → put in `docs/` (**download the file; do not copy-paste it from chat** — a pasted copy of the Phase 1 plan was cut off)                                                   |
| `AGENT_RULES.md`                | standing rules → repo root **and** `.agent/rules/` (still missing from your repo)                                                                                                    |
| `phase2-code.zip`               | `new/` = files to copy as they are; `phase2-modified-files.patch` = edits to 8 existing files; `modified-full-copies/` = the same 8 files complete (use if the patch does not apply) |

### 1.2 Install (PowerShell, repo root)

```powershell
# 0. clean working tree first:  git status   (commit or stash anything pending)
Expand-Archive -Force "$HOME\Downloads\phase2-code.zip" "$env:TEMP\phase2"
$z = "$env:TEMP\phase2\phase2-code"

# 1. new files (copy as-is, keep the folder structure)
Copy-Item -Recurse -Force "$z\new\*" .

# 2. edits to existing files
git apply --3way "$z\phase2-modified-files.patch"
#    if this reports conflicts: copy the files from  $z\modified-full-copies\  over the repo files and record it in docs/DEVIATIONS.md

# 3. dependencies (tests only)
npm i -D fast-check better-sqlite3 @types/better-sqlite3

# 4. generate the local-database migration for the new tables, then verify
npm run db:generate
npm run check                    # lint + typecheck + tests — must be green (79 tests)
```

Commit as `feat(P2-M1): scoring engine + match data layer` **only when `npm run check` is green**. If `better-sqlite3` fails to install on your Node version, stop and report; do not delete the integration test.

---

## 2. 🚧 Gate G0 — Phase 1 must actually run (do this first)

The Phase 1 report says "100% passed", but the architect could not confirm the app runs.

1. `npx expo run:android` on the emulator/phone. Record in `docs/PHASE1_REPORT.md`: device, Android version, **did the app open, did sign-up/login work, can you create a team and a player**.
2. Run the production bundle: `npx expo export --platform android --output-dir dist-check` and record the result.
3. **Known issue found by the architect (in a Linux test, not yet on your Windows machine):** step 2 fails with `private properties are not supported` (Hermes compiler), only when `withNativeWind(...)` is present in `metro.config.js`. The same project exports fine with plain Metro. What was tried **without** success: matching `babel-preset-expo` to SDK 54, forcing `unstable_transformProfile: 'hermes-stable'` (in Babel and in Metro), explicit class-property Babel plugins, removing each NativeWind Babel preset. **Not yet tried:** upgrading `nativewind`/`react-native-css-interop`.
   - If step 1 (dev build) works and step 2 fails the same way → try once: `npm i nativewind@latest react-native-css-interop@latest` and re-run steps 1–2. If it still fails → **STOP and send the architect the full error output.** Do not change the styling library, the SDK or the Babel/Metro setup beyond this one upgrade.
   - If both work on your machine → record "G0 passed on Windows" and continue.
4. Do the 5 RLS checks and the offline-login check from the Phase 1 plan (M5.4, M6) and record the results.

**Phase 2 may proceed in parallel on pure logic (P2-M1 to P2-M3) even if G0 is open, but UI milestones (P2-M5 onward) must not be accepted until G0 is passed.**

---

## 3. Architecture decisions (binding)

| ID            | Decision                                                                                                                                                                                                                                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **P2-ADR-01** | **Event sourcing.** A delivery (or a dead-ball event) is an immutable event. The innings state is **always derived** by `replay(config, setup, deliveries)` — there is no stored running score, so the scorecard, live screen and later statistics cannot disagree.                                          |
| **P2-ADR-02** | The scoring engine is **pure TypeScript** in `src/core/scoring/` (no React/Expo/DB imports — ESLint-enforced). It is the only place cricket rules live. UI and repositories call it; they never re-implement a rule.                                                                                         |
| **P2-ADR-03** | **Undo = void, never delete.** A voided delivery keeps its row (`voided = true`, `version + 1`) and writes a `score_corrections` audit row. An **edit** replaces the ball's content, bumps `version`, and is accepted only if the whole innings still validates (`auditInnings`).                            |
| **P2-ADR-04** | **One reconciler.** `reconcileMatch()` is the _only_ code that sets `innings.status/end_reason` and `match.status/result_*`. It runs at the end of every transaction that changes deliveries or innings. A manual end (declare / forced) is stored on the innings row and survives until an undo reopens it. |
| **P2-ADR-05** | **Every write = one local SQLite transaction + outbox rows** (Phase 1 pattern). Deliveries sync as batches (consecutive rows of one table in one request, latest payload per key). Client UUIDs; `seq` per innings, unique `(innings_id, seq)` locally and on the server.                                    |
| **P2-ADR-06** | **Scoped pulls.** Teams, players, squads and **matches** are pulled for everyone. Playing XI, innings and deliveries are pulled **only for matches I created or score** (`my-matches` / `my-innings`). Audit rows are push-only. (Viewing other people's scorecards is Phase 3.)                             |
| **P2-ADR-07** | **Single scorer per match** (`matches.scorer_id`, RLS: creator / scorer / admin may write the match tree). No lock or hand-over in Phase 2 (Phase 5).                                                                                                                                                        |
| **P2-ADR-08** | **Limited-overs only** (T20, ODI, custom overs). Test format, super over, penalty runs, DLS, "timed out" are out of scope (Phase 5). `players_per_side` is 11 in the wizard; the engine supports 2–11.                                                                                                       |
| **P2-ADR-09** | **Bowler rules** enforced by the engine at the start of each over (not the previous over's bowler; per-bowler over quota). A mid-over bowler change (injury) is allowed only with the explicit `allowBowlerChange` option and is reflected in the next ball.                                                 |
| **P2-ADR-10** | **Retirements** are dead-ball events (`kind = 'DEAD'`): retired hurt = not a wicket, the batter may return; retired out = a wicket not credited to the bowler.                                                                                                                                               |
| **P2-ADR-11** | **Wickets credited to the bowler:** bowled, caught, LBW, stumped, hit wicket. _Not_ credited: run out, obstructing the field, hit the ball twice, retirements. (_Amends SRS 5.2, which listed hit-twice._)                                                                                                   |
| **P2-ADR-12** | **Strike rotation** follows completed runs (odd = swap) and the end of the over. When a batter is dismissed the incoming batter takes the dismissed batter's end _after_ the crossings; the scorer can override (`incomingAt`) for run-outs.                                                                 |
| **P2-ADR-13** | **UI:** the live scoring screen is **locked** to `design/stitch/live_match_scoring`. Everything not in that file (wizard, sheets, hub, matches list, innings-break) is **TEMP-UI** built only from the UI kit and tracked in `docs/TEMP_SCREENS.md`. Stitch prompts for them are in Appendix C.              |
| **P2-ADR-14** | **Reactive data:** screens read the local database through Drizzle `useLiveQuery`; the innings state is computed in `useLiveScoring` by replaying stored deliveries. No separate score store/cache.                                                                                                          |
| **P2-ADR-15** | Integration tests run repositories on **real SQLite** (`better-sqlite3`) with the real migrations. They are mandatory in CI.                                                                                                                                                                                 |

---

## 4. Questions for the user (ask all in ONE message at P2-M0; "use defaults" is accepted)

| #      | Question                                                                                                                                                                                                                                                         | Default                                                             |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| **Q1** | The Stitch live screen's stat grid (`grid-cols-5 w-44`) makes the strike-rate overlap the 6s column ("2144.8"). **Approve a minimal fix?** Same total width (176 px), columns R 34 · B 34 · 4s 28 · 6s 28 · SR 52 (already in `BattersCard.tsx` as `STAT_COLS`). | **Yes, approved.** (Reverting = change one constant.)               |
| **Q2** | The first innings has no target, so the Stitch hero's "Need X runs…" bar does not apply. Use a plain bar with only "CRR x.xx" until you design the first-innings variant?                                                                                        | Yes (TEMP variant, listed in `TEMP_SCREENS.md`).                    |
| **Q3** | Stitch's keypad shows "Wd +1" / "Nb +1" as one-tap buttons. In the code: **tap = record immediately; long-press = choose extra runs** (no-ball bat runs, wide + runs); **Bye / Leg Bye open a runs picker**. OK?                                                 | Yes.                                                                |
| **Q4** | Stitch's "End Over" has no function in cricket scoring (an over ends after 6 legal balls automatically). It opens the **bowler picker** (new over / injury change), matching Stitch's toast "Bowler change prompt opened". OK?                                   | Yes.                                                                |
| **Q5** | The header in Stitch shows a stock photo avatar and (on tablets) a logo. Phones: show **initials** avatar and no logo (the logo is `hidden sm:block`). OK?                                                                                                       | Yes.                                                                |
| **Q6** | Do you have Stitch designs for: Create-Match wizard (4 steps), bottom sheets (wicket, extras, new bowler), Matches list, innings-break/result? If not, use the prompts in Appendix C.                                                                            | Build as TEMP-UI now; design later.                                 |
| **Q7** | Which devices will you test scoring on (emulator size, a real phone)? Needed for the fidelity check at 390×844.                                                                                                                                                  | Android emulator with a custom 390×844 screen, plus one real phone. |
| **Q8** | Is it acceptable that Phase 2 scoring works for **one scorer per match** and limited-overs formats only (Test/DLS/super over later)?                                                                                                                             | Yes.                                                                |

---

## 5. Milestones

Work in order; run `npm run check` and commit at the end of each. **P2-M0 → P2-M9.**

### P2-M0 — Housekeeping and G0 (≈ 1 day)

1. Ask Q1–Q8.
2. Add `AGENT_RULES.md` (repo root + `.agent/rules/`), put this plan and the SRS in `docs/` (rename `Docs/` → `docs/`; delete `Stitch_UI/` and `Docs/SRS.md` duplicates).
3. Fix `.husky/pre-commit` so it does not contain a machine-specific path (`npx lint-staged && npm run typecheck` only). Add `.github/workflows/ci.yml` (Phase 1 plan M1.11) if a remote exists.
4. Update `docs/DEVIATIONS.md` with every Phase 1 deviation (legacy ESLint config, `legacy-peer-deps`, `--passWithNoTests`, Babel/Jest preset versions, hard-coded `#0D5C3A`).
5. Run **Gate G0** (section 2).

### P2-M1 — Scoring engine (pure logic)

Install (section 1.2). Files (all in the zip, do not edit without architect approval):

| File                                         | Role                                                                                                                                                                      |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/core/scoring/types.ts`                  | events, config, state, errors                                                                                                                                             |
| `src/core/scoring/engine.ts`                 | `emptyInnings`, `applyDelivery`, `replay`, `endInnings`, `nextBallContext`, `canStartOver`, `availableBatters`, `validateDelivery`, `assertValidDelivery`, `auditInnings` |
| `src/core/scoring/selectors.ts`              | `runRate`, `strikeRate`, `economy`, `bowlerFigures` ("3.2-1-24-2"), `chaseInfo`, `currentOverView`, `partnershipView`, scorecard rows                                     |
| `src/core/scoring/result.ts`                 | `computeResult`, `resultText` ("St. Jude CC won by 23 runs")                                                                                                              |
| `src/core/scoring/builders.ts`               | keypad actions → deliveries (`runsBall`, `wideBall`, `noBallBall`, `byeBall`, `legByeBall`, `wicketBall`, `retireEvent`)                                                  |
| `src/core/matchSetup.ts`                     | formats, default bowler quota, batting-first rule, XI validation                                                                                                          |
| `src/core/scoring/__tests__/*`, `testkit.ts` | 44 engine + 5 property + 8 builder/audit tests                                                                                                                            |
| `src/core/identity.ts` (patched)             | adds `shortName` ("R. Sharma") and `surname`                                                                                                                              |

**Acceptance:** `npx jest src/core` green. Then the **paper-scorebook check**: pick a short real or imagined 2-over innings with a wide, a no-ball, a bye, a wicket and a run-out; write the expected score by hand; replay it with a throw-away test and confirm every number (runs, wickets, overs, extras, bowler figures) matches. Record in the report.

### P2-M2 — Server schema

1. Apply `supabase/migrations/0002_matches.sql` (`npx supabase db push`).
2. Regenerate types: `npx supabase gen types typescript --project-id <REF> > src/lib/database.types.ts`.
3. Record these RLS checks in `docs/PHASE1_REPORT.md` → new `docs/PHASE2_REPORT.md` (use two real accounts A=scorer and B=viewer-only):
   - A creates a match ✅; B creates a match ❌; B reads A's match ✅
   - A inserts XI/innings/deliveries for A's match ✅; B inserts a delivery ❌
   - A updates a delivery (void) ✅; B updates it ❌; nobody can `delete` a delivery ❌
   - A inserts a `score_corrections` row ✅; updating it ❌ (append-only)
   - inserting a second delivery with the same `(innings_id, seq)` ❌

### P2-M3 — Local database and sync

Files: `src/db/schema.ts` (patched: `matches`, `playingXi`, `innings`, `deliveries` with unique `(innings_id, seq)`, `scoreCorrections`), `src/db/client.ts` (patched wipe), `src/db/outbox.ts` (patched type), `src/sync/registry.ts` (new), `src/sync/syncService.ts` (patched: batching + scoped pulls).

1. `npm run db:generate` → commit the new `drizzle/` migration.
2. Start the app: it must still open (migrations run at start) and Phase 1 screens must still work (sign in, teams, players).
3. **Sync check on the device (record results):** create a match offline (airplane mode) → reconnect → rows appear in Supabase in order `matches → playing_xi → innings → deliveries`; sign in on a second device/emulator as the same user → the match, XI, innings and deliveries appear (scoped pull).

### P2-M4 — Repositories and hooks (all verified on real SQL)

`src/features/scoring/mappers.ts`, `reconcile.ts`, `deliveryRepository.ts` (`recordDelivery`, `undoLastDelivery`, `editDelivery`, `endInningsManually`, `recentDeliveries`), `src/features/matches/matchRepository.ts` (`createMatch`, `saveXi`, `setToss`, `startFirstInnings`, `startSecondInnings`, `listMatches`), `src/features/scoring/useLiveScoring.ts`, `src/features/matches/useHomeLiveMatch.ts`, `src/features/__tests__/scoringFlow.int.test.ts`.
**Acceptance:** `npx jest src/features` green (4 integration flows). Screens must call only these repository functions — never Drizzle or Supabase directly.

### P2-M5 — Live scoring components (🔒 Stitch-locked)

Components in `src/components/scoring/` translate `design/stitch/live_match_scoring/code.html` 1:1: `LiveHeader`, `ScoreHero`, `BattersCard` (+ `BowlerRow`, partnership bar), `OverStrip` (bubbles), `Keypad`, `Toast`, `PingDot`; shadows added to `src/theme/shadows.ts`.

**Extra steps that are not in the zip (small, exact):**

1. **Filled icon (Stitch uses `FILL 1` for the striker's bat icon).** In `scripts/build-icon-font.mjs`, collect icons rendered with FILL 1 and build a second font:
   ```js
   const filled = new Set();
   for (const file of walk('design/stitch').filter((f) => f.endsWith('code.html'))) {
     const html = readFileSync(file, 'utf8');
     for (const m of html.matchAll(
       /<span[^>]*material-symbols-outlined[^>]*FILL[^>]*>\s*([a-z0-9_]+)\s*</g,
     ))
       filled.add(m[1]);
   }
   const filledUnicodes = [...filled]
     .filter((n) => codepoints.get(n))
     .map((n) => `U+${codepoints.get(n).toUpperCase()}`);
   execSync(
     'fonttools varLib.instancer ".cache/MaterialSymbolsOutlined.ttf" FILL=1 wght=400 GRAD=0 opsz=24 -o .cache/instance-fill.ttf',
     { stdio: 'inherit' },
   );
   execSync(
     `pyftsubset .cache/instance-fill.ttf --unicodes="${filledUnicodes.join(',')}" --output-file=assets/fonts/MaterialSymbolsFilled.ttf --no-hinting`,
     { stdio: 'inherit' },
   );
   ```
   Run `npm run icons`, commit `assets/fonts/MaterialSymbolsFilled.ttf`, load it in `app/_layout.tsx` (`MaterialSymbolsFilled: require('../assets/fonts/MaterialSymbolsFilled.ttf')`), and extend `Icon.tsx`:
   ```tsx
   const MaterialSymbolFilled = createIconSet(
     glyphMap,
     'MaterialSymbolsFilled',
     require('../../../assets/fonts/MaterialSymbolsFilled.ttf'),
   );
   type Props = {
     name: IconName;
     size?: number;
     color?: string;
     filled?: boolean;
     className?: string;
   };
   export function Icon({ name, size = 24, color = '#0b1c30', filled = false }: Props) {
     const Glyph = filled ? MaterialSymbolFilled : MaterialSymbol;
     return <Glyph name={name} size={size} color={color} />;
   }
   ```
   Then add `filled` to the striker's `sports_cricket` icon in `BattersCard.tsx`.
2. **Fidelity procedure** (Phase 1 plan section "Fidelity procedure" + new script): run the live screen with a seeded match so the numbers equal the Stitch screenshot (102/3, 14.2 overs, target 149, R. Sharma 42 (29), M. Ali 18 (12), K. Rabada 3.2-1-24-2, over 15 = • 1 4 W Wd+1 2), screenshot the emulator at 390×844, then:
   ```powershell
   node scripts/fidelity-diff.mjs design/stitch/live_match_scoring/screen.png <your-screenshot>.png fidelity-live.png
   ```
   Attach both images and `fidelity-live.png` to the report. The percentage is a guide; **the owner signs off by eye.** Expected, approved differences: Q1–Q5 above.

### P2-M6 — Live scoring screen and flows

Files: `app/(app)/match/[id]/score.tsx` (live screen), `src/components/scoring/sheets.tsx` (TEMP-UI sheets: bowler pick, runs, wicket), `src/components/ui/AppBottomSheet.tsx` (patched: `onDismiss`).

Behaviour (do not change):

| Control          | Behaviour                                                                                                                                                                                 |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0–6              | record immediately (4 and 6 = boundary); haptic                                                                                                                                           |
| Wd +1 / Nb +1    | tap = record (+1); long-press = pick extra runs                                                                                                                                           |
| Bye / Leg Bye    | runs picker (1–4)                                                                                                                                                                         |
| OUT / WICKET     | wicket sheet: how out → who → runs (run-out) → fielder (caught) → incoming batter; "Retire" tab for retirements; the sheet only offers types valid for the ball (free hit, wide, no-ball) |
| Undo             | voids the last ball (audit row), reopens an ended innings                                                                                                                                 |
| Swap Strike      | flips the next ball's striker (toast "Strike Rotated")                                                                                                                                    |
| End Over         | opens the bowler picker (new over, or injury change)                                                                                                                                      |
| Over complete    | bowler picker opens automatically; previous bowler and quota-exhausted bowlers are disabled                                                                                               |
| Innings complete | screen redirects to the match hub (innings break / result)                                                                                                                                |

**Also wire (not in zip):**

- `StartMatchButton.tsx`: `router.push('/match/new' as never)`.
- `LiveMatchCard.tsx`: take a `match: HomeLiveMatch` prop instead of reading the fixture; "Resume Scoring Console" → `/match/${match.id}/score` (disabled for the fixture). In `app/(app)/(tabs)/index.tsx`: `const real = useHomeLiveMatch(); const liveMatch = real ?? (env.useFixtures ? STITCH_HOME_FIXTURES.liveMatch : null);` and render the card only when `liveMatch` exists. (Same visual; no new layout.)

**Acceptance (on the device, record screenshots):** score an entire 2-over match: a four, a six, a wide, a no-ball (then a free-hit ball), a bye, a bowled, a run-out, a caught; undo twice; edit an earlier ball; verify the over strip, score, CRR/RRR and bowler figures after every step; force-quit the app mid-over and reopen → exact same state; airplane mode throughout, then reconnect and confirm sync.

### P2-M7 — Create Match wizard, match hub, matches list (TEMP-UI)

Files: `app/(app)/match/new.tsx` (4 steps: teams/format/overs/date/venue → Playing XI → toss → openers & bowler; resumes an upcoming match), `app/(app)/match/[id]/index.tsx` (hub: continue setup / innings break with second-innings openers / result / undo), `app/(app)/(tabs)/matches.tsx` (Live / Upcoming / Completed list). All carry `// TEMP-UI` and must be listed in `docs/TEMP_SCREENS.md`.
**Acceptance:** a wizard run takes ≤ 2 minutes with two teams of 11; XI must be exactly 11 per side with no overlap; the toss decides who bats; the second innings target = first innings + 1; the result text is correct for win by runs, win by wickets and a tie (create each by scoring); an upcoming match can be left and resumed.

### P2-M8 — Hardening

1. Performance: record a ball on a mid-range Android phone — target **< 100 ms** from tap to updated score (measure with a simple timestamp log in dev); replay of a 50-over innings (300 balls) < 50 ms.
2. Rapid-tap test: 20 taps in 5 seconds must record exactly 20 balls (no duplicates, no lost ball); keep-awake during scoring (`expo-keep-awake`).
3. Fix any lint/type issue; **no new `any`** outside `src/sync`.
4. Update `docs/TEMP_SCREENS.md`, `docs/DEVIATIONS.md`.

### P2-M9 — Exit

Write `docs/PHASE2_REPORT.md` (template below) and stop. The architect reviews, then the owner signs off.

---

## 6. Locked-UI deviations (all pending owner approval — see Q1–Q5)

| #   | Where               | Stitch                        | Code                              | Reason                                |
| --- | ------------------- | ----------------------------- | --------------------------------- | ------------------------------------- |
| 1   | Batters grid        | 5 equal columns               | 34/34/28/28/52                    | SR overlapped 6s                      |
| 2   | Hero, first innings | only chase variant designed   | "CRR" bar only                    | no target                             |
| 3   | Wd/Nb keys          | label only                    | tap records, long-press asks runs | extra runs need a path                |
| 4   | End Over            | toast only                    | opens bowler picker               | no cricket meaning otherwise          |
| 5   | Header              | photo avatar, logo on tablets | initials, no logo                 | no photo data; logo `hidden sm:block` |
| 6   | Free-hit            | not designed                  | "FREE HIT" caption                | rule support                          |

---

## 7. Phase 2 exit criteria

- [ ] G0 passed (device run + `expo export` OK, or an architect-approved fix).
- [ ] `npm run check` green, including the 4 integration flows, in CI.
- [ ] Migration `0002` applied; RLS checks recorded.
- [ ] A full match scored on the device **offline**, synced afterwards, identical on a second device.
- [ ] Live screen fidelity images attached; owner sign-off on deviations 1–6.
- [ ] Undo and edit work and leave audit rows (`score_corrections`); verified in Supabase.
- [ ] Paper-scorebook comparison of at least **two** real or invented matches matches to the run.
- [ ] `docs/TEMP_SCREENS.md`, `DEVIATIONS.md`, `PHASE2_REPORT.md` complete. **The report states plainly what was NOT tested.**

`docs/PHASE2_REPORT.md` template: milestones done · device and Android version · screenshots (live screen, wizard, hub) · fidelity image + owner sign-off · RLS results · sync results (offline → online, second device) · performance numbers · deviations · TEMP screens · known problems · **not tested**.

---

## Appendix A — Engine rules the code implements (for reviewing scorebook comparisons)

- Legal ball = not a wide/no-ball. Over = 6 legal balls. Wide: 1 + runs run, not legal, not faced, charged to bowler. No-ball: 1 penalty (bowler) + bat runs (batter, ball faced) + optional byes/leg-byes (extras, not charged to bowler); next ball is a free hit (if enabled) until a legal ball is bowled. Bye/leg-bye: legal, faced, runs to extras, not charged to the bowler.
- Strike swaps after an odd number of **completed** runs, then again at the end of every over.
- Maiden = a full over of 6 legal balls with 0 runs charged to that bowler (byes allowed; wides/no-balls/bat runs spoil it).
- On a no-ball or free hit only run-out, obstructing, hit-twice; on a wide only stumped, run-out, hit-wicket, obstructing. Non-striker can be dismissed only by run-out/obstruction.
- Innings ends: target reached (2nd innings, checked first) → all out (`playersPerSide − 1` wickets) → overs complete → manual (declared/forced).
- Result: chasing team wins by `(playersPerSide − 1 − wickets)` wickets if it passes the target; if both innings end level → tie; otherwise first-batting team wins by the run difference.
- Known simplifications: a 4 that is _run_ (not a boundary) has no keypad key (edit the ball to un-tick boundary is not available in the TEMP UI — Phase 3), "timed out" is unsupported, retired-hurt batter returning is allowed by the engine but has no dedicated UI.

## Appendix B — Known limitations to keep visible

Pull cursor can skip rows when ≥ 500 rows share one `updated_at` (Phase 3 hardening). Manual end then undo reopens the innings. Edits that would invalidate a _later_ ball are rejected with the ball number (the scorer must undo back to it instead). No scorer lock (a second device scoring the same match is not prevented until Phase 5).

## Appendix C — Stitch prompts for the screens that are still TEMP-UI

Use the same white theme and design system (`DESIGN.md`) — copy the "RULES" block from the previous Stitch prompt.

**1. Create Match wizard**

```
Design 4 mobile screens in the existing ScoreSphere design system (white theme, green primary, Inter, same cards/buttons/chips as the Live Scoring and Home screens). A step-indicator (4 segments) sits under the header on every screen.
Step 1 "Match setup": Team A and Team B pickers (team crest + name rows), format segmented control (T20 / ODI / Custom), overs field (enabled only for Custom), date-time, venue, stage. Primary button "Next".
Step 2 "Playing XI": two tabs (Team A / Team B); selectable player rows with avatar, name, role badge (BAT/BOWL/AR/WK), checkbox, a counter chip "9/11", captain (C) and keeper (WK) toggles. Sticky "Next".
Step 3 "Toss": coin-style cards for the two teams (winner), then two large choice cards "Bat" / "Bowl".
Step 4 "Openers": "<Team> bat first", pick striker and non-striker (rows), pick opening bowler, big "Start match" button.
```

**2. Bottom sheets** (same style as cards, 24px top radius, drag handle)

```
Design these bottom sheets: (a) "Wicket": chips for Bowled, Caught, LBW, Run out, Stumped, Hit wicket, Obstructing, Hit twice; sections that appear as needed — Who is out, Runs completed (0–3), Fielder (player chips), Incoming batter (player chips), toggles "On a wide" / "On a no-ball"; red "Record wicket" button; a "Retire" tab. (b) "Extra runs": big number chips 0–6 and a confirm button, titled Wide / No-ball / Bye / Leg bye. (c) "New bowler": player list with overs bowled, disabled rows for "Just bowled" and "Quota used". (d) "Retired hurt / out".
```

**3. Matches tab** — tabs Live / Upcoming / Completed, search field, match cards (crests, scores, status pill, venue/date, result line), floating "New match" button.
**4. Innings break & result** — "Innings break" summary card with target and required rate, opener selection; "Match result" screen with result headline, both team scores, Player of the match placeholder, "View scorecard" button.
**5. First-innings variant of the live hero** — the same hero without the chase equation (CRR and projected score instead).
