# ScoreSphere — Software Requirements Specification (SRS)

| | |
|---|---|
| **Product** | ScoreSphere — *Score. Record. Analyze.* |
| **Document version** | 1.0 (draft) |
| **Date** | 3 October 2026 |
| **Platform** | Mobile app (Android + iOS) built with React Native |
| **Inputs** | ScoreSphere Product Development Brief; Stitch UI designs (Home Dashboard, Live Scoring, Match Scorecard + design system) |

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Overall Description](#2-overall-description)
3. [Functional Requirements](#3-functional-requirements)
4. [UI / UX Requirements](#4-ui--ux-requirements)
5. [Cricket Scoring Rules Engine](#5-cricket-scoring-rules-engine)
6. [Data Requirements](#6-data-requirements)
7. [Offline-First & Synchronization](#7-offline-first--synchronization)
8. [Non-Functional Requirements](#8-non-functional-requirements)
9. [Technology Stack](#9-technology-stack)
10. [System Architecture](#10-system-architecture)
11. [Security & Permissions](#11-security--permissions)
12. [Testing Strategy](#12-testing-strategy)
13. [Development Plan — 5 Phases](#13-development-plan--5-phases)
14. [Risks & Mitigations](#14-risks--mitigations)
15. [Open Decisions](#15-open-decisions)
16. [Appendices](#16-appendices)

---

## 1. Introduction

### 1.1 Purpose
This document specifies the requirements for **ScoreSphere**, a cricket scoring and record-management mobile application. It is the reference for design, development, testing and acceptance of the product.

### 1.2 Product Vision
> **Score once → ScoreSphere records and updates everything.**
> Every delivery is recorded exactly once as an event. The scorecard, player statistics, team statistics, tournament tables and records are all *derived* from those events, so the data can never disagree with itself.

### 1.3 Scope
**In scope (MVP, Version 1):** authentication and roles, teams, players, match creation, playing XI, toss, live ball-by-ball scoring (runs, extras, wickets, undo/correction), automatic scorecard, saved match history, automatic basic player and team statistics, offline scoring with sync.

**In scope (Version 2):** tournaments, points table, leaderboards, advanced records, public/live sharing, analytics and charts, notifications, multiple scorers with synchronized scoring.

**Out of scope (for now):** video/streaming, betting or fantasy features, DLS/Duckworth-Lewis calculation, umpire/DRS workflows, payments, web admin portal (may be added later).

### 1.4 Definitions

| Term | Meaning |
|---|---|
| Delivery / ball | One bowled ball, legal or illegal (wide, no-ball). Stored as one event. |
| Legal ball | A delivery that is not a wide or no-ball; six legal balls make an over. |
| CRR / RRR | Current run rate / required run rate. |
| SR | Strike rate = runs ÷ balls × 100. |
| Economy | Runs conceded per over. |
| Playing XI | The 11 players selected from a squad for a match. |
| Outbox | Local queue of events waiting to be synced to the server. |
| RLS | Row Level Security (database-level access control). |

### 1.5 References
- ScoreSphere Product Development Brief (docx).
- Stitch export: `home_dashboard`, `live_match_scoring`, `match_scorecard`, and `DESIGN.md` (ScoreSphere design system).

---

## 2. Overall Description

### 2.1 Product Perspective
ScoreSphere is a standalone, **offline-first mobile app** backed by a cloud database. The scorer's phone is the primary data-entry device; the cloud provides accounts, permanent storage, sharing and cross-device access.

```
 ┌─────────────────────────── Mobile App (React Native) ───────────────────────────┐
 │  UI  →  Scoring Engine (pure TypeScript)  →  Local SQLite (source of truth)     │
 │                                   │                     │                       │
 │                                   └──── Outbox/Sync ────┘                       │
 └──────────────────────────────────────────┬──────────────────────────────────────┘
                                            │ HTTPS / WebSocket
 ┌──────────────────────────────────────────▼──────────────────────────────────────┐
 │  Backend: Auth · PostgreSQL (+RLS) · Storage · Realtime · Functions (stats)     │
 └─────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 User Classes

| Role | Description | Key permissions |
|---|---|---|
| **Admin** | Owns the organisation/app data | Everything, including user and role management |
| **Scorer** | Scores matches ball by ball | Create/score/correct matches assigned to them |
| **Team Manager** | Runs a team | Create/edit team, manage squad, view team stats |
| **Player** | Individual cricketer | View own profile, career stats, match history |
| **Viewer** | Follower/spectator | Read-only: live scores, scorecards, stats |
| **Tournament Admin** *(V2)* | Runs a tournament | Create tournaments, add teams, schedule matches |

One account can hold more than one role (e.g., Scorer + Team Manager).

### 2.3 Operating Environment
- Android 8.0+ and iOS 15+ phones (phone-first; tablets supported but not optimized in MVP).
- Must work with **no internet** during a match, including a full 20- or 50-over innings.
- Used outdoors in bright sunlight, often one-handed.

### 2.4 Design & Implementation Constraints
- Built with **React Native + TypeScript**.
- 🔒 The UI must be **identical to the Stitch designs** (see 4.0 UI Fidelity Lock): white theme, turf-green primary, event colour coding, exactly as exported.
- Statistics must be **calculated from stored delivery events**, never typed in manually.
- Score corrections must be **audited**.

### 2.5 Assumptions & Dependencies
- A match is scored by **one scorer at a time** in the MVP (multi-scorer is V2).
- Limited-overs formats (T20, ODI, custom overs) are fully supported in the MVP; **Test format** support is scheduled later (see [Open Decisions](#15-open-decisions)).
- Users have a phone with a working camera/gallery for logos and photos (optional).

---

## 3. Functional Requirements

Priority: **M** = Must (MVP), **S** = Should (MVP if time allows), **V2** = Version 2.

### 3.1 Authentication & Users (AUTH)

| ID | Requirement | Pri |
|---|---|---|
| AUTH-01 | Users can sign up with email + password; email verification. | M |
| AUTH-02 | Users can log in/out; session persists securely across app restarts. | M |
| AUTH-03 | Password reset via email link. | M |
| AUTH-04 | Sign in with Google (and Apple on iOS). | S |
| AUTH-05 | User profile: name, photo, phone (optional), default role(s). | M |
| AUTH-06 | Role-based access (Admin, Scorer, Team Manager, Player, Viewer) enforced in the UI **and** the database. | M |
| AUTH-07 | A player account can be linked to a player profile ("This is me"). | S |
| AUTH-08 | Viewers can browse public matches without an account (guest mode). | V2 |

### 3.2 Teams (TEAM)

| ID | Requirement | Pri |
|---|---|---|
| TEAM-01 | Create/edit/delete a team: name, short name (3–4 letters, used for crests), logo, brand colour, location, description. | M |
| TEAM-02 | If no logo is uploaded, auto-generate a crest from the short name and team colour (as in the Stitch design). | M |
| TEAM-03 | Add/remove players to the squad (existing player or create new). | M |
| TEAM-04 | Assign captain and vice-captain. | M |
| TEAM-05 | Team profile: squad, record (matches, wins, losses, ties/NR, win %), highest/lowest score, match history. | M |
| TEAM-06 | A team cannot be deleted if it has completed matches (archive instead). | M |

### 3.3 Players (PLAY)

| ID | Requirement | Pri |
|---|---|---|
| PLAY-01 | Create/edit player: name, photo, playing role (BAT / BOWL / AR / WK), batting style (left/right), bowling style (e.g., right-arm fast, left-arm spin), date of birth (optional), jersey number. | M |
| PLAY-02 | A player can belong to multiple teams. | M |
| PLAY-03 | Player profile shows career batting, bowling and fielding statistics (auto-calculated). | M |
| PLAY-04 | Match-by-match performance history for each player. | M |
| PLAY-05 | Recent-form chart (last 5–10 innings). | V2 |
| PLAY-06 | Duplicate-player warning when names closely match within the same team. | S |

### 3.4 Match Creation (MATCH)

A 4-step wizard with a progress indicator.

| ID | Requirement | Pri |
|---|---|---|
| MATCH-01 | **Step 1 – Setup:** choose Team A and Team B (must differ); format T20 / ODI / Custom overs (Test later); date/time, venue, optional tournament and stage (e.g., "Round 4", "Final"). | M |
| MATCH-02 | **Step 2 – Playing XI:** select exactly the allowed number of players (default 11) per team from the squad; mark captain and wicket-keeper; set batting order (editable later). A counter shows "9/11". | M |
| MATCH-03 | Allow "quick add" of a new player during XI selection. | S |
| MATCH-04 | **Step 3 – Toss:** choose toss winner and decision (bat/bowl). | M |
| MATCH-05 | **Step 4 – Openers:** choose opening striker, non-striker and opening bowler, then **Start Match**. | M |
| MATCH-06 | Match settings: overs per innings, max overs per bowler (default derived from format: T20 = 4, ODI = 10), balls per over (default 6), enable/disable free-hit rule, enable/disable "last-man standing". | M |
| MATCH-07 | Matches can be saved as **Upcoming** before the XI is final and completed later. | M |
| MATCH-08 | A match can be edited until the first delivery is scored; afterwards only settings that don't affect scoring can change. | M |
| MATCH-09 | Match statuses: Upcoming → Live → Innings Break → Completed (also Abandoned, No Result). | M |

### 3.5 Live Ball-by-Ball Scoring (SCORE)

| ID | Requirement | Pri |
|---|---|---|
| SCORE-01 | Record runs off the bat: 0 (dot), 1, 2, 3, 4, 5, 6 using large keys (≥ 60 px). | M |
| SCORE-02 | Record extras: Wide, No Ball, Bye, Leg Bye, each with an optional additional-runs picker (e.g., "Wd + 2", "Nb + 4 off the bat"). | M |
| SCORE-03 | Record wickets: Bowled, Caught, LBW, Run Out, Stumped, Hit Wicket, Retired Hurt, Retired Out, Obstructing the Field, Hit the Ball Twice, Timed Out. The wicket sheet asks for the dismissal type, the fielder (where relevant), which batter is out (run-out) and the incoming batter. | M |
| SCORE-04 | Automatic strike rotation after odd runs and at the end of every over; manual **Swap Strike** control for corrections. | M |
| SCORE-05 | Automatic prompt for a **new bowler** at the end of an over; enforce "no consecutive overs" and "max overs per bowler" (override with warning). | M |
| SCORE-06 | Automatic computation of total runs, wickets, legal balls, overs, CRR, RRR, target, extras breakdown, partnerships, fall of wickets, maidens. | M |
| SCORE-07 | **Undo last ball** (unlimited steps back within the innings). | M |
| SCORE-08 | **Edit any previous ball** from the ball-by-ball list; all later state is recalculated from events; every edit is written to the audit log with a reason. | M |
| SCORE-09 | Change striker/non-striker/bowler mid-over for injury or error (with audit entry). | M |
| SCORE-10 | End innings automatically (all out, overs complete, target reached) or manually (declaration, forced end). Show an Innings Break screen and set the target for innings 2. | M |
| SCORE-11 | Match result is computed automatically (win by runs/wickets, tie, no result) and confirmed by the scorer. | M |
| SCORE-12 | Free-hit handling after a no-ball (if enabled): next ball flagged "FREE HIT"; only run-out-type dismissals allowed. | S |
| SCORE-13 | Penalty runs (5-run penalties), super over. | V2 |
| SCORE-14 | Haptic feedback and optional sound on each recorded ball; screen stays awake during scoring. | S |
| SCORE-15 | A "match in progress" banner on Home lets the scorer resume instantly after the app is closed or crashes. | M |

### 3.6 Live Match Screen (LIVE)

| ID | Requirement | Pri |
|---|---|---|
| LIVE-01 | Hero banner: batting team, score `runs/wickets`, overs, max overs, innings number, target, "Need X runs from Y balls", CRR, RRR. | M |
| LIVE-02 | Batting card: striker (marked), non-striker, runs, balls, 4s, 6s, SR. | M |
| LIVE-03 | Partnership bar showing total runs/balls and each batter's contribution. | M |
| LIVE-04 | Current bowler: overs-maidens-runs-wickets and economy. | M |
| LIVE-05 | "This over" ball bubbles with colour coding (see 4.4). | M |
| LIVE-06 | Sync status pill: **Synced / Syncing / Offline – saved locally**. | M |
| LIVE-07 | Viewers see a read-only version updating in near real-time. | V2 |

### 3.7 Scorecard & Commentary (CARD)

| ID | Requirement | Pri |
|---|---|---|
| CARD-01 | Result header: tournament/stage, venue, result text ("St. Jude CC won by 23 runs"), both teams' scores, overs, run rate. | M |
| CARD-02 | Tabs: **Summary · Scorecard · Commentary · Worm & Stats**. | M |
| CARD-03 | Batting table: batter, dismissal text ("c Smith b Kumar"), R, B, 4s, 6s, SR; highlight not-out batters; "did not bat" list. | M |
| CARD-04 | Bowling table: O, M, R, W, Econ (plus wides/no-balls). | M |
| CARD-05 | Extras breakdown (w, nb, b, lb), total, run rate. | M |
| CARD-06 | Fall of wickets (score-wicket, batter, over). | M |
| CARD-07 | Partnerships list for each wicket. | M |
| CARD-08 | Ball-by-ball commentary grouped by over with over summaries. Text is generated from the event ("Kumar to Warner, FOUR, driven through cover"). | M |
| CARD-09 | Run-progression / worm chart comparing both innings, with wicket markers. | S |
| CARD-10 | Player of the Match (selected by scorer/admin) card. | S |
| CARD-11 | Export/share scorecard as PDF or image. | S |

### 3.8 Automatic Statistics (STAT)

| ID | Requirement | Pri |
|---|---|---|
| STAT-01 | When a match is marked Completed, the system updates player batting, bowling and fielding stats and team stats **without any manual entry**. | M |
| STAT-02 | Player batting: matches, innings, not outs, runs, balls, average, SR, highest score, 4s, 6s, 50s, 100s, ducks. | M |
| STAT-03 | Player bowling: matches, innings, overs, maidens, runs, wickets, economy, average, strike rate, best bowling, 3/4/5-wicket hauls. | M |
| STAT-04 | Fielding: catches, run-outs, stumpings (where the fielder is recorded). | M |
| STAT-05 | Team: matches, wins, losses, ties, no-results, win %, highest/lowest totals, match history. | M |
| STAT-06 | Editing a completed match's deliveries automatically **recomputes** every affected statistic. | M |
| STAT-07 | Stats can be filtered by format (T20/ODI/Custom) and, in V2, by tournament and season. | S |

### 3.9 Match History (HIST)

| ID | Requirement | Pri |
|---|---|---|
| HIST-01 | Every completed match is stored permanently (soft-delete only). | M |
| HIST-02 | Matches tab with **Live / Upcoming / Completed** segments and a search bar. | M |
| HIST-03 | Filter by team, player, tournament, date range and venue. | M |
| HIST-04 | Open any match to view the full scorecard and ball-by-ball history. | M |

### 3.10 Tournaments *(Version 2)*

| ID | Requirement | Pri |
|---|---|---|
| TOUR-01 | Create tournament: name, format, overs, dates, points rules (win/tie/NR points, NRR on/off). | V2 |
| TOUR-02 | Add teams; generate fixtures (round-robin, groups, knockouts) or add matches manually. | V2 |
| TOUR-03 | Auto-maintained points table with Net Run Rate and tie-break rules. | V2 |
| TOUR-04 | Tournament leaderboards: orange-cap style (runs), purple-cap style (wickets), best strike rate/economy. | V2 |
| TOUR-05 | Tournament-specific player and team stats separate from career stats. | V2 |

### 3.11 Records (REC)

| ID | Requirement | Pri |
|---|---|---|
| REC-01 | Auto-detected records: highest individual score, most runs, most wickets, best bowling figures, highest/lowest team score, best partnerships, most 4s/6s. | V2 |
| REC-02 | Records scoped by player, team, tournament, format. | V2 |
| REC-03 | Basic leaderboards (top runs, top wickets) on the Stats tab. | S |

### 3.12 Sharing, Notifications & Multi-Scorer *(Version 2)*

| ID | Requirement | Pri |
|---|---|---|
| SHARE-01 | Public live-match link (read-only web view) and share sheet. | V2 |
| NOTIF-01 | Push notifications: match started, wicket, milestone (50/100), innings break, result. Follow teams/matches. | V2 |
| MULTI-01 | Several scorers can score the same match with a single "active scorer" lock and hand-over. | V2 |
| MULTI-02 | Real-time conflict-safe synchronization between devices (see section 7.5). | V2 |

---

## 4. UI / UX Requirements

### 4.0 🔒 UI Fidelity Lock (highest-priority rule)

> **The app's UI MUST be identical to the Stitch design files (`stitch_scoresphere_cricket_scoring_app.zip`). The Stitch designs are the single source of truth for the interface. This rule overrides every other UI statement in this document.**

| ID | Rule |
|---|---|
| **LOCK-01** | The screens `home_dashboard`, `live_match_scoring` and `match_scorecard` must be built to look **exactly** like their `screen.png` and `code.html` in the Stitch export: same layout, order of elements, colours, gradients, fonts, sizes, spacing, corner radii, shadows, icons, labels and wording. |
| **LOCK-02** | `scoresphere/DESIGN.md` is the locked design system. Tokens (colours, typography, spacing, radii, elevation, component specs) are copied from it **verbatim** into the theme file. No developer may invent, "improve" or substitute a colour, font, size or component style. |
| **LOCK-03** | Every screen that is not yet designed (Login, Matches, Create Match, Teams, Players, Stats, Tournaments, Settings, bottom sheets, etc.) must **first be designed in Stitch using the same design system**, approved by the product owner, and only then built. Developers must not design UI on their own. |
| **LOCK-04** | Any change to a locked screen (including fixing the issues listed in 4.6) requires **written approval from the product owner** and an updated Stitch export before implementation. |
| **LOCK-05** | The Stitch export folder is stored in the repository at `design/stitch/` (read-only reference) and is versioned. The build references it; it is never edited by developers. |
| **LOCK-06** | Fidelity is verified for every locked screen with a side-by-side comparison against `screen.png` on a 390 × 844 viewport. Allowed tolerance: **±2 px** on layout and **exact** match on colours, fonts, text and icons. |
| **LOCK-07** | A screen is **not "Done"** until it passes the fidelity check and receives product-owner sign-off. This is part of the Definition of Done for every UI task. |
| **LOCK-08** | Functionality must never change the look: dynamic data (scores, names, overs) fills the same slots; long text may wrap or ellipsize only where the design already shows it doing so. |

**How the lock is implemented**
1. Copy tokens from `DESIGN.md` into `theme.ts` / `tailwind.config.js` unchanged.
2. Build each component by reading the Stitch `code.html` (Tailwind classes and structure) and translating it 1:1 to React Native (`View`/`Text`/`Pressable`, NativeWind classes).
3. Compare against `screen.png` (overlay/onion-skin or side-by-side) before opening a pull request; attach the comparison to the PR.
4. Optionally add screenshot (visual-regression) tests for the three locked screens in CI so accidental UI drift fails the build.

The UI follows the Stitch **ScoreSphere design system**: a white, broadcast-grade interface with turf-green brand colour and strictly semantic event colours.

### 4.1 Screen Inventory

| # | Screen | Stitch design | Phase |
|---|---|---|---|
| 1 | Splash + Login / Sign Up / Reset password | To design | 1 |
| 2 | **Home Dashboard** (greeting, Start New Match, live match card, My Teams / My Stats tiles, upcoming carousel, recent results) | ✅ `home_dashboard` | 1–3 |
| 3 | Matches (Live / Upcoming / Completed, search, filters) | To design | 3 |
| 4 | Create Match wizard (4 steps) | To design | 2 |
| 5 | **Live Scoring** (header, batting card, partnership, bowler, over bubbles, keypad) | ✅ `live_match_scoring` | 2 |
| 5a | Bottom sheets: Wicket, Extras, New Bowler, New Batter, Edit Ball, End Innings | To design | 2 |
| 6 | **Match Scorecard** (result header, tabs, tables, FOW, worm chart, bowling, POTM, export) | ✅ `match_scorecard` | 3 |
| 7 | Ball-by-Ball / Commentary | To design (tab of #6) | 3 |
| 8 | Teams list + Team Profile + Create/Edit Team | To design | 1 |
| 9 | Players list + Player Profile + Create/Edit Player | To design | 1 |
| 10 | Stats & Records (Batting / Bowling / Records) | To design | 3 → 4 |
| 11 | Tournaments list, Tournament detail, Points Table, Leaderboards | To design | 4 |
| 12 | Profile / Settings (sync status, offline data, logout, role) | To design | 1 |
| 13 | Notifications settings & inbox | To design | 5 |

Bottom navigation (4 tabs): **Home · Matches · Teams · Stats**. Profile opens from the avatar at top-right.

### 4.2 Design Tokens (from `DESIGN.md`)

| Token | Value | Use |
|---|---|---|
| `primary` | `#0D5C3A` | Brand, primary buttons, boundary-4, active batter bar |
| `primaryGradient` | `135deg #0D5C3A → #1E8E5A` | Hero banners, result headers (with 8% crease-line texture) |
| `liveAmber` | `#F59E0B` (tint `#FEF3C7`, text `#B45309`) | LIVE badge, extras, innings break |
| `maxPurple` | `#6D28D9` | **Only** sixes |
| `wicketRed` | `#DC2626` | **Only** wickets, run-outs, penalties |
| `slate` | `#64748B` / border `#E8EBEF` | Secondary text, dividers |
| `canvas` / `surface` | `#F6F7F9` / `#FFFFFF` | Background / cards |
| Radius | cards 16, buttons 12, bubbles/crests 50%, pills 999 | |
| Spacing | 4 / 8 / 12 / 16 / 24 / 32 / 48 (8-pt grid), screen margin 16 | |
| Type | Inter; display-score 48/700, headline 28 & 20, title 17, body 15 & 13, caption 12, micro-label 11 caps | |
| Numbers | **Tabular figures everywhere** (`fontVariant: ['tabular-nums']`) | No layout shift when the score changes |
| Elevation | L1 card `0 2 8 rgba(16,24,40,.06)` + 1px border; L2 sheets; L3 sticky scoring console | |
| Touch targets | ≥ 48 px general; ≥ 60 px on scoring keys | |

### 4.3 Core Components (build once, reuse)

`ScoreBanner` · `TeamCrest` · `PlayerAvatar` (+ `RoleBadge`) · `StatusPill` (Live/Completed/Upcoming/Abandoned) · `SyncPill` · `BallBubble` · `OverStrip` · `ScoreKey` · `Keypad` · `PartnershipBar` · `BatterRow` · `BowlerRow` · `ScoreTable` (batting/bowling) · `FowChip` · `WormChart` · `MatchCard` · `ResultRow` · `StatTile` · `SegmentedTabs` · `BottomSheet` · `StepperHeader` · `EmptyState` · `ErrorState` · `Skeleton`.

### 4.4 Event Colour Coding (Over bubbles)

| Event | Style |
|---|---|
| Dot | `#F1F5F9` bg, grey "•" |
| 1 / 2 / 3 | White bg, `#E2E8F0` border, dark number |
| Four | `#0D5C3A` bg, white "4" |
| Six | `#6D28D9` bg, white "6" |
| Wicket | `#DC2626` bg, white "W" |
| Extras (Wd, Nb, B, Lb) | `#FEF3C7` bg, `#92400E` text, label + runs (e.g., "Wd+1") |

Colour is never the only signal — every bubble carries a letter/number.

### 4.5 Live Scoring Screen — Layout Rules

1. **Top (≈35 %)**: gradient score banner. Score is the hero element.
2. **Middle**: batting card → partnership bar → bowler row → this-over bubbles.
3. **Bottom thumb zone (≈40 %)**: keypad — row 1: `0 1 2 3`; row 2: `4 (green) 6 (purple) 5`; row 3: `Wd Nb Bye Lb` (amber tint); row 4: full-width **OUT / WICKET** (red); row 5: `Undo · Swap Strike · End Over`.
4. Every ball must be recordable in **one tap** for plain runs and **at most three taps** for any wicket or extra.
5. After "End Over", the New Bowler sheet opens automatically.
6. A pressed key shows immediate visual + haptic feedback; keys are disabled while a sheet is open.

### 4.6 Observations on the current Stitch exports (do NOT change without owner approval — see LOCK-04)

> Under the UI Fidelity Lock these are **proposals only**. The Stitch design stays as-is until the product owner approves a change and a new Stitch export is provided. Items 1 and 3 look like unintended rendering/data glitches in the mock-ups rather than design intent, so they are worth approving.

| # | Screen | Observation | Proposed fix (needs approval) |
|---|---|---|---|
| 1 | Live Scoring | The **6s** and **SR** columns collide in the batting table ("2144.8", "0150.0"). | Give each stat column a fixed width with right alignment; add gutter. |
| 2 | Live Scoring | Match title truncates ("Northwood CC vs Rive…"). | Use short names (NCC vs RXI) in the header; full names in a details sheet. |
| 3 | Scorecard | A **completed** match shows a **LIVE MATCH** badge. | Badge must come from `match.status`; completed = "Completed". |
| 4 | Scorecard | Innings selector text is cut ("…(165/6, 20.…"). | Use "SJC 165/6 (20)" format. |
| 5 | Live Scoring | The bottom row "Undo / Swap Strike" tiles are pale blue, outside the token palette. | Use `#F8FAFC` (Undo) and neutral tiles per `DESIGN.md`. |
| 6 | Scorecard | Tab labels "Worm & Stats" wrap tightly on small screens. | Make tabs horizontally scrollable. |
| 7 | All | Stock photos for users/players. | Use initials-avatar fallback; real photos only if uploaded. |

### 4.7 Accessibility & Usability
- WCAG AA contrast (4.5:1 body, 3:1 large); verify amber/white and green/white combinations.
- Dynamic type up to 130 % without clipping the keypad.
- All icon buttons have accessibility labels; screen-reader order follows visual order.
- Light theme only for v1 (as designed); tokens structured so a dark theme can be added later.
- Left-handed mode toggle (mirror keypad rows) — *Should*.

---

## 5. Cricket Scoring Rules Engine

The engine is a **pure TypeScript module** (no UI, no database) that takes an ordered list of delivery events and returns the full match state. This keeps the rules testable and guarantees the scorecard, live screen and statistics always agree.

```
state = reduce(initialState(match), deliveries.filter(d => !d.voided))
```

### 5.1 Delivery Event (input)

```ts
type Delivery = {
  id: string;                 // UUID generated on the device
  inningsId: string;
  seq: number;                // 1,2,3… order within the innings
  strikerId: string;
  nonStrikerId: string;
  bowlerId: string;
  runsOffBat: 0|1|2|3|4|5|6|7;
  isBoundary4?: boolean;      // true if reached boundary (vs ran four)
  isBoundary6?: boolean;
  extra?: { type: 'WIDE'|'NO_BALL'|'BYE'|'LEG_BYE'|'PENALTY'; runs: number };
  wicket?: {
    type: 'BOWLED'|'CAUGHT'|'LBW'|'RUN_OUT'|'STUMPED'|'HIT_WICKET'|
          'RETIRED_HURT'|'RETIRED_OUT'|'OBSTRUCTING'|'HIT_TWICE'|'TIMED_OUT';
    playerOutId: string;
    fielderId?: string;
    incomingBatterId?: string;
  };
  isFreeHit?: boolean;
  createdAt: string; deviceId: string; version: number;
};
```

### 5.2 Rules

| Topic | Rule |
|---|---|
| **Legal ball** | A delivery is legal unless it is a Wide or No-Ball. An over ends after 6 legal balls (configurable). |
| **Wide** | 1 penalty run + any runs run/byes added to the same extra. Ball is **not legal**, **not faced** by the batter, charged to the bowler. |
| **No-Ball** | 1 penalty run (charged to bowler) + runs off the bat (to batter) or byes/leg-byes (to extras). Ball is **not legal**; counts as a ball faced by the batter. Next ball is a Free Hit if enabled. |
| **Bye / Leg-Bye** | Legal ball; runs go to extras, **not** to the batter or bowler. Counts as a ball faced. |
| **Total runs** | `runsOffBat + extra.runs` for each delivery. |
| **Strike change** | Strike swaps when the *completed runs* (off bat + byes/leg-byes + runs run on wides/no-balls) are **odd**, and again at the end of each over. |
| **Over end** | After the 6th legal ball: swap strike, require a new bowler (≠ previous over's bowler). |
| **Maiden** | An over with zero runs charged to the bowler (byes/leg-byes allowed; wides/no-balls/bat runs disqualify). |
| **Bowler credited wickets** | Bowled, Caught, LBW, Stumped, Hit Wicket (and Hit Twice). **Not credited:** Run Out, Retired, Obstructing the Field, Timed Out. |
| **Runs conceded by bowler** | Runs off the bat + wides + no-balls. **Not** byes, leg-byes or penalty runs. |
| **Run Out** | Runs completed before the run-out count. The scorer selects which batter is out. |
| **Incoming batter** | Takes the end of the dismissed batter unless the scorer swaps (e.g., batters crossed on a catch). |
| **Free Hit** | Only Run Out, Obstructing the Field and Hit Twice dismissals are allowed. |
| **Retired Hurt** | Batter leaves, **not counted as a wicket**, may resume later. *Retired Out* counts as a wicket. |
| **Innings end** | All out (wickets = players − 1, or players if "last-man" enabled), overs complete, target reached, or manual end/declaration. |
| **Target** | Innings 2 target = innings 1 total + 1. |
| **Result** | Win by runs (batting first), win by wickets (chasing), Tie, No Result, Abandoned. DLS is out of scope. |

### 5.3 Derived Values

| Value | Formula |
|---|---|
| Overs | `floor(legalBalls/6)` `.` `legalBalls % 6` (e.g., 14.2) |
| Run rate (CRR) | `runs ÷ (legalBalls / 6)` |
| Required run rate | `(target − runs) ÷ (ballsRemaining / 6)` |
| Strike rate | `runs ÷ ballsFaced × 100` |
| Batting average | `runs ÷ dismissals` (dismissals = innings − not outs) |
| Economy | `runsConceded ÷ (legalBalls / 6)` |
| Bowling average | `runsConceded ÷ wickets` |
| Bowling strike rate | `legalBalls ÷ wickets` |
| Partnership | runs/balls between two wickets; per-batter contribution |
| Win % | `wins ÷ (matches − noResults) × 100` |
| NRR *(V2)* | `(runs scored ÷ overs faced) − (runs conceded ÷ overs bowled)` across the tournament |

### 5.4 Correction Semantics
Undo and edit **never delete history**. A voided delivery keeps its row with `voided = true`; an edit creates a new version and writes a `score_corrections` audit record (who, when, old value, new value, reason). The engine replays the active events, so every derived number updates consistently.

---

## 6. Data Requirements

### 6.1 Entities

```
profiles ─┬─< team_players >─┬─ teams
          │                  └─ players
          └─ (roles)
tournaments ─< tournament_teams >─ teams
tournaments ─< matches >─< playing_xi >─ players
matches ─< innings ─< deliveries ─< score_corrections
matches ─< batting_performances / bowling_performances / fielding_performances
players ─< player_stats        teams ─< team_stats        tournaments ─< points_table
```

### 6.2 Main Tables (PostgreSQL; mirrored in local SQLite)

| Table | Key fields |
|---|---|
| `profiles` | id (= auth uid), name, email, avatar_url, roles[], created_at |
| `teams` | id, name, short_name, logo_url, colour, location, created_by, archived_at |
| `players` | id, name, photo_url, role (BAT/BOWL/AR/WK), batting_style, bowling_style, dob, linked_profile_id, created_by |
| `team_players` | team_id, player_id, jersey_no, is_captain, is_vice_captain, active |
| `tournaments` | id, name, format, overs, start/end, status, points_rules (json) |
| `tournament_teams` | tournament_id, team_id, group_name |
| `matches` | id, tournament_id?, team_a_id, team_b_id, format, overs, balls_per_over, max_overs_per_bowler, date, venue, stage, toss_winner_id, toss_decision, status, result_type, winner_id, margin_type, margin_value, player_of_match_id, scorer_id, scorer_lock_until, created_at, updated_at |
| `playing_xi` | match_id, team_id, player_id, batting_order, is_captain, is_keeper |
| `innings` | id, match_id, innings_no, batting_team_id, bowling_team_id, target, status |
| `deliveries` | id (client UUID), innings_id, seq, over_no, ball_in_over, is_legal, striker_id, non_striker_id, bowler_id, runs_off_bat, is_four, is_six, extra_type, extra_runs, wicket_type, player_out_id, fielder_id, is_free_hit, voided, version, device_id, created_at |
| `score_corrections` | id, delivery_id, old_json, new_json, reason, edited_by, edited_at |
| `batting_performances` | match_id, innings_id, player_id, runs, balls, fours, sixes, dismissal_type, bowler_id, fielder_id, position, not_out |
| `bowling_performances` | match_id, innings_id, player_id, legal_balls, maidens, runs, wickets, wides, no_balls |
| `fielding_performances` | match_id, player_id, catches, run_outs, stumpings |
| `player_stats` | player_id, format, scope (career/tournament_id), aggregated batting/bowling/fielding columns, updated_at |
| `team_stats` | team_id, format, scope, matches, wins, losses, ties, no_results, highest, lowest |
| `points_table` *(V2)* | tournament_id, team_id, played, won, lost, tied, nr, points, nrr |
| `sync_outbox` *(device only)* | id, entity, op, payload, created_at, attempts, last_error |

### 6.3 Data Rules
- **Every delivery, legal or not, is one row.** Scorecards and stats are reproducible from `deliveries` at any time.
- `*_performances`, `player_stats` and `team_stats` are **materialized caches**, rebuilt by a function on match completion and on any correction to a completed match.
- All primary keys are UUIDs generated on the client so records can be created offline without collisions.
- Soft delete (`archived_at` / `voided`) for anything referenced by history.
- Referential integrity: a player in `playing_xi` must belong to a squad of that team at match time (snapshot the XI so later squad changes do not alter history).

---

## 7. Offline-First & Synchronization

### 7.1 Principles
1. **The local SQLite database is the source of truth while scoring.** The UI never waits on the network to record a ball.
2. Deliveries are **immutable, append-only events** with client-generated UUIDs and a per-innings sequence.
3. Sync is **idempotent**: sending the same event twice produces one row.

### 7.2 Flow

```
Score a ball → engine updates state → write delivery to SQLite + outbox (single transaction)
                              │
         NetInfo says online? ─┴─ yes → push outbox in order (batch) → server upserts by id → mark synced
                                  no  → keep queued; show "Offline – saved locally"
On reconnect / app foreground / every 30 s while Live → push outbox, then pull changes since last cursor
```

### 7.3 Requirements

| ID | Requirement | Pri |
|---|---|---|
| SYNC-01 | A complete match can be scored with airplane mode on, then synced later. | M |
| SYNC-02 | Outbox survives app kill, phone restart and low battery. | M |
| SYNC-03 | Retry with exponential back-off; failures visible in Settings → Sync. | M |
| SYNC-04 | Server upsert by `id`; ordering by `(innings_id, seq)`. | M |
| SYNC-05 | Pull sync for teams, players, matches via `updated_at` cursor. | M |
| SYNC-06 | Single-scorer lock per match (`scorer_lock_until`, renewed by heartbeat) to prevent two phones scoring the same match in the MVP. | M |
| SYNC-07 | Score corrections sync as new versions + audit rows. | M |
| SYNC-08 | Conflict policy for non-delivery data (teams, players): last-write-wins on `updated_at`, with the server timestamp authoritative. | M |
| SYNC-09 | Multiple scorers: server assigns a global event order; clients rebase unsynced events on top of it; hand-over protocol for the active scorer. | V2 |
| SYNC-10 | Local DB migrations are versioned and run at app start without data loss. | M |

### 7.4 Match Recovery
If the app crashes mid-ball, on relaunch the engine replays all stored deliveries and returns the scorer to the exact state; the Home screen shows **Resume Scoring Console**.

### 7.5 Realtime Viewing *(V2)*
Viewers subscribe to a match channel (WebSocket). The server pushes new deliveries; clients run the same engine to render the live screen. Offline viewers fall back to the last synced state.

---

## 8. Non-Functional Requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-01 | **Performance** | Recording a ball updates the screen in **< 100 ms** (p95) on a mid-range Android phone (e.g., 4 GB RAM). |
| NFR-02 | Performance | Cold start to Home < 3 s; scorecard of a 20-over match renders < 1 s from local data. |
| NFR-03 | Performance | Scrolling lists and tables at 60 fps; no layout shift when scores change (tabular numerals). |
| NFR-04 | **Reliability** | Zero lost deliveries: every ball is persisted to local storage before the UI confirms it. |
| NFR-05 | Reliability | Automatic crash recovery to the exact match state (section 7.4). |
| NFR-06 | Reliability | Server backups daily with point-in-time recovery; restore tested before launch. |
| NFR-07 | **Offline** | Scoring, scorecards, teams, players and history viewable offline for previously synced data. |
| NFR-08 | **Usability** | A new scorer can start and score a match without training; plain-run ball = 1 tap; wicket/extra ≤ 3 taps. |
| NFR-09 | Usability | Readable in direct sunlight (contrast ≥ AA, large numerals), one-handed operation. |
| NFR-10 | **Security** | See section 11. |
| NFR-11 | **Scalability** | Schema and APIs support 10 000+ teams, 100 000+ players, millions of deliveries; indexes on `(innings_id, seq)`, `(player_id)`, `(match_id)`. |
| NFR-12 | **Maintainability** | TypeScript strict mode; scoring engine ≥ 95 % branch coverage; shared design tokens; documented module boundaries. |
| NFR-13 | **Compatibility** | Android 8+ (API 26+), iOS 15+; screen widths 320–430 dp without clipping. |
| NFR-14 | **Battery/Data** | A 3-hour scoring session uses < 15 % battery with the screen kept awake; sync payloads batched and compressed. |
| NFR-15 | **Auditability** | Every correction records who, when, what changed and why. |
| NFR-16 | **Localization** | All strings externalized (English first); layout tolerant of longer text. Urdu/Hindi localization and RTL readiness planned for a later phase. |
| NFR-17 | **Privacy** | Collect only necessary personal data; users can export or delete their account data. |

---

## 9. Technology Stack

### 9.1 Recommended Stack

| Layer | Choice | Why |
|---|---|---|
| **Framework** | **React Native with Expo (latest stable SDK), TypeScript (strict)** | Fast iteration, one codebase for Android + iOS, EAS builds/OTA updates. |
| Navigation | **Expo Router** (file-based) + bottom tabs + stacks | Matches the 4-tab layout; deep links for share URLs. |
| Styling | **NativeWind (Tailwind for RN)** with tokens from `DESIGN.md` | Stitch's HTML export is Tailwind-based, so classes and tokens map almost 1:1. |
| UI primitives | `@gorhom/bottom-sheet`, `react-native-gesture-handler`, `react-native-reanimated` | Wicket/extras/bowler sheets, smooth key feedback, pulsing LIVE dot. |
| Icons / fonts | Material Symbols (`@expo/vector-icons`), **Inter** via `expo-font` | Matches the Stitch icon style and typography. |
| Client state | **Zustand** (UI/session state) | Minimal boilerplate. |
| Server state | **TanStack Query** | Caching, retries, background refresh for non-scoring data. |
| Forms & validation | **React Hook Form + Zod** | Team/player/match forms with shared validation schemas. |
| Local database | **expo-sqlite** + **Drizzle ORM** | Durable offline storage, typed queries, migrations. |
| Sync | **Custom outbox + pull-by-cursor** (Phase 3); optional **PowerSync** if multi-scorer sync (Phase 5) proves complex | Simple and transparent for append-only events. |
| Scoring engine | **Pure TypeScript package** (`packages/scoring-engine`), unit-tested | Shared by the app and backend functions. |
| Charts | `react-native-svg` + **victory-native** (or `react-native-gifted-charts`) | Worm chart, form charts, partnership bars. |
| Backend platform | **Supabase** (PostgreSQL, Auth, Storage, Realtime, Edge Functions) | Auth + relational DB + RLS + realtime in one service; quickest route to an MVP for a small team. |
| Database | **PostgreSQL** with RLS policies, SQL views/functions for stats | Relational model fits cricket data; stats rebuild as SQL/Edge Function. |
| Media | Supabase Storage + `expo-image`, `expo-image-picker` | Logos and photos with caching. |
| Export/share | `expo-print`, `expo-sharing`, `react-native-view-shot` | Scorecard PDF/image. |
| Device APIs | `@react-native-community/netinfo`, `expo-keep-awake`, `expo-haptics`, `expo-secure-store`, `expo-notifications` (Phase 5) | Offline detection, scoring ergonomics, secure tokens, push. |
| Monitoring | **Sentry** (crashes), optional **PostHog** (usage analytics) | Catch field crashes early. |
| Tooling | ESLint, Prettier, Husky + lint-staged, Jest, React Native Testing Library, **Maestro** (E2E), GitHub Actions, **EAS Build/Submit/Update** | Quality gates and automated releases. |
| Design handoff | Stitch exports + `DESIGN.md` stored in `design/stitch/` → tokens in `tailwind.config.js` / `theme.ts` | **Locked** single source of truth for look and feel (see 4.0). |

### 9.2 Alternative Backend (if you prefer owning the server)
**Node.js (NestJS) + PostgreSQL + Prisma/Drizzle + Redis + Socket.io**, hosted on Railway/Render/Fly.io, with S3-compatible storage and Firebase Cloud Messaging. More control and custom logic, but more setup (auth, realtime, migrations, ops). The rest of the stack stays the same.

### 9.3 Development Environment
- Node LTS, pnpm, Android Studio (emulator) and Xcode (iOS builds, requires macOS — or use EAS cloud builds), a physical mid-range Android phone for performance testing.
- Accounts: Expo/EAS, Supabase, Sentry, Google Play Console, Apple Developer (when releasing on iOS).

### 9.4 Suggested Project Structure

```
scoresphere/
├─ apps/mobile/
│  ├─ app/                      # Expo Router routes
│  │  ├─ (auth)/login.tsx
│  │  ├─ (tabs)/index.tsx matches.tsx teams.tsx stats.tsx
│  │  ├─ match/[id]/scorecard.tsx  match/[id]/score.tsx  match/new.tsx
│  │  ├─ team/[id].tsx  player/[id].tsx  settings.tsx
│  ├─ src/
│  │  ├─ components/            # ScoreBanner, Keypad, BallBubble, ScoreTable…
│  │  ├─ features/              # auth, teams, players, matches, scoring, stats
│  │  ├─ db/                    # Drizzle schema, migrations, repositories
│  │  ├─ sync/                  # outbox, pull, connectivity, scorer lock
│  │  ├─ theme/                 # tokens from DESIGN.md
│  │  └─ lib/                   # supabase client, utils, i18n
├─ packages/
│  ├─ scoring-engine/           # pure TS rules + tests
│  └─ shared/                   # types, zod schemas, constants
└─ supabase/
   ├─ migrations/               # SQL schema + RLS
   └─ functions/                # rebuild-stats, share-link, notifications
```

---

## 10. System Architecture

### 10.1 Logical Layers
1. **Presentation** — screens and components (React Native).
2. **Feature/Domain** — use-cases: `startMatch`, `recordDelivery`, `undoDelivery`, `editDelivery`, `completeMatch`.
3. **Scoring Engine** — deterministic reducer from events to match state.
4. **Data** — repositories over SQLite (local) with a sync service to Supabase (remote).
5. **Backend** — Auth, Postgres with RLS, Edge Functions (stats rebuild), Realtime channels (V2).

### 10.2 Key Flows

**Record a ball:** tap key → `recordDelivery()` → engine validates (e.g., bowler eligibility) → transaction: insert delivery + outbox row → state recomputed → UI updates → background sync.

**Complete a match:** scorer confirms result → local status = Completed → sync → server Edge Function `rebuild_stats(match_id)` recomputes performances, player stats and team stats → clients pull updated stats.

**Edit a past ball:** open Ball-by-Ball → edit → new delivery version + audit row → engine replays → if the match is Completed, server recomputes stats.

### 10.3 Backend API Surface (Supabase PostgREST/RPC + Edge Functions)

| Endpoint | Purpose |
|---|---|
| `POST /rpc/sync_push` | Upsert batch of events/entities (idempotent). |
| `GET /rpc/sync_pull?since=` | Changed rows since cursor. |
| `POST /rpc/acquire_scorer_lock` / `release` | Single-scorer lock with heartbeat. |
| `POST /functions/rebuild-stats` | Recompute stats for a match. |
| `GET /functions/match-share/:id` | Public read-only match payload (V2). |
| `POST /functions/notify` | Push notifications on wicket/result (V2). |

---

## 11. Security & Permissions

| ID | Requirement |
|---|---|
| SEC-01 | Passwords handled only by the auth provider (hashed server-side); no plaintext storage. |
| SEC-02 | Tokens stored in `expo-secure-store`; short-lived access tokens with refresh. |
| SEC-03 | **Row Level Security** on every table; the client never uses the service-role key. |
| SEC-04 | RLS examples: users read public/their own teams; only the match's scorer (or admin) can insert deliveries for that match; completed matches are append-only except by admin/scorer correction path with audit. |
| SEC-05 | Role checks enforced server-side, not just by hiding buttons. |
| SEC-06 | HTTPS only; certificate validation on; no secrets in the app bundle. |
| SEC-07 | Input validation with Zod on the client and database constraints/checks on the server. |
| SEC-08 | Uploaded images: size/type limits and private-bucket signed URLs where needed. |
| SEC-09 | Account deletion and data export flow (also an app-store requirement). |
| SEC-10 | Rate limiting on auth and sync endpoints. |
| SEC-11 | Local DB contains only data the user is authorised to see; wiped on logout. |

### Permission Matrix (MVP)

| Action | Admin | Scorer | Team Mgr | Player | Viewer |
|---|:-:|:-:|:-:|:-:|:-:|
| Manage users/roles | ✅ | – | – | – | – |
| Create/edit team | ✅ | – | ✅ (own) | – | – |
| Manage squad | ✅ | – | ✅ (own) | – | – |
| Create match | ✅ | ✅ | ✅ | – | – |
| Score a match | ✅ | ✅ (assigned) | – | – | – |
| Correct completed match | ✅ | ✅ (own, audited) | – | – | – |
| View scorecards/stats | ✅ | ✅ | ✅ | ✅ | ✅ |
| Edit own player profile | ✅ | – | – | ✅ | – |

---

## 12. Testing Strategy

| Level | Scope | Tools |
|---|---|---|
| Unit | Scoring engine: every rule in section 5 (extras, strike change, over end, maiden, wicket credit, free hit, chase end, result). Target ≥ 95 % branch coverage. Stats formulas. | Jest |
| Property/replay | Generate random valid innings; assert invariants: `total = bat + extras`, `legal balls ≤ overs × 6`, sum of batter runs + extras = team total, sum of bowler wickets ≤ team wickets, replay after undo = original state. | Jest + fast-check |
| Component | Keypad, ScoreTable, BallBubble, sheets, forms. | React Native Testing Library |
| Integration | SQLite repositories, outbox, sync against a local Supabase instance. | Jest + Supabase CLI |
| Database | RLS policies and stats functions. | SQL tests (pgTAP) |
| E2E | Create team → players → match → score a full T20 → scorecard → stats; offline scenario with airplane mode. | Maestro |
| Field/UAT | Score real club matches side by side with a paper scorebook; compare totals. | Real devices |
| Performance | Ball-entry latency, 50-over replay time, memory over a 3-hour session. | React Native profiler, Flashlight |
| Accessibility | Contrast, dynamic type, screen reader labels. | Manual + automated checks |

**Definition of Done (per feature):** UI matches the Stitch design and is signed off (LOCK-06/07), code reviewed, unit/integration tests pass, works offline where applicable, matches the Stitch design/tokens, no new lint/type errors, documented.

---

## 13. Development Plan — 5 Phases

> **Assumptions for the estimates:** 1–2 developers, part of the time spent on design polish and testing. Durations are planning estimates and should be re-baselined after Phase 1. Total ≈ **20 weeks**; **MVP ships at the end of Phase 3 (~week 12)**.

### Roadmap Overview

| Phase | Name | Duration | Outcome |
|---|---|---|---|
| **1** | Foundation, Design System & Core Data | ~3 weeks | App skeleton, auth, teams and players working end to end |
| **2** | Match Setup & Live Scoring Engine | ~5 weeks | A whole match can be scored ball by ball, offline-capable locally |
| **3** | Scorecard, Statistics, History & Sync → **MVP** | ~4 weeks | Complete MVP: scorecards, auto stats, match history, cloud sync, beta release |
| **4** | Tournaments, Records & Analytics | ~4 weeks | Points tables, leaderboards, records, charts, sharing |
| **5** | Multi-Scorer, Notifications, Test Format & Launch Hardening | ~4 weeks | Real-time multi-device scoring, push, polish, store release |

---

### Phase 1 — Foundation, Design System & Core Data (≈ 3 weeks)

**Goal:** a solid base so every later feature is fast to build.

| Workstream | Tasks |
|---|---|
| Project setup | Expo + TypeScript strict repo (pnpm workspace), ESLint/Prettier/Husky, GitHub Actions CI, EAS build profiles, Sentry. |
| Design system | Copy `DESIGN.md` tokens **verbatim** into Tailwind/NativeWind (LOCK-02); load Inter with tabular numbers; build base components (TeamCrest, PlayerAvatar, RoleBadge, StatusPill, SyncPill, SegmentedTabs, Card, Button, BottomSheet, Skeleton, EmptyState). |
| Navigation | Expo Router with 4 tabs (Home, Matches, Teams, Stats) + auth stack + profile/settings. |
| Backend | Supabase project; migrations for `profiles, teams, players, team_players`; RLS policies; storage buckets. |
| Auth | Sign up, login, logout, password reset, session persistence, role assignment. |
| Local DB | expo-sqlite + Drizzle setup, migration runner, repository pattern, connectivity service. |
| Teams & Players | Create/edit/archive team; auto crest; add/remove players; captain/vice-captain; player profile (role, styles, photo). |
| Design work (parallel) | Design the remaining screens **in Stitch first** (Login, Teams, Team Profile, Players, Player Profile, forms, Settings) and get owner approval (LOCK-03). Store the export in `design/stitch/`. |

**Deliverables:** installable app; user can sign up, create a team, add players, view profiles; CI builds on every push.
**Exit criteria:** auth + CRUD work with RLS; design tokens match Stitch; 60 fps lists; basic unit tests running in CI.

---

### Phase 2 — Match Setup & Live Scoring Engine (≈ 5 weeks)

**Goal:** the core of the product — scoring a complete match ball by ball.

| Workstream | Tasks |
|---|---|
| Scoring engine (first, test-driven) | Implement the reducer for runs, extras, wickets, strike rotation, over end, maidens, innings end, target, result; undo/void; free-hit; bowler constraints. Write exhaustive unit and property tests **before** wiring the UI. |
| Match creation wizard | 4 steps: teams/format/venue → Playing XI → toss → openers/bowler; match settings; save as Upcoming; edit before start. |
| Local persistence | `matches, playing_xi, innings, deliveries, score_corrections` tables; transactional write of delivery + outbox row; crash recovery and "Resume Scoring Console". |
| Live Scoring UI | Implement the Stitch Live Scoring screen: ScoreBanner, batting card, partnership bar, bowler row, OverStrip, Keypad; haptics; keep-awake; sync/offline pill. |
| Bottom sheets | Wicket (type, fielder, which batter, new batter), Extras (+runs), New Bowler (eligibility), Edit Ball, End Innings/Match. |
| Innings flow | Innings break screen, target setup, second innings, result computation and confirmation. |
| Design work (parallel) | Create Match wizard, bottom sheets, Innings Break, Matches list screens. |

**Deliverables:** a scorer can create a match and score a whole T20 or ODI innings pair on a phone, including wickets, extras, undo and edits, fully offline on the device.
**Exit criteria:** engine invariants pass on 1 000+ randomized innings; ball entry < 100 ms; app-kill recovery returns exact state; paper-scorebook comparison on at least 2 test matches.

---

### Phase 3 — Scorecard, Statistics, History & Sync → MVP Release (≈ 4 weeks)

**Goal:** turn recorded deliveries into permanent records and ship the MVP.

| Workstream | Tasks |
|---|---|
| Scorecard | Implement Stitch Scorecard: result header, tabs, batting/bowling tables, extras, FOW, partnerships, POTM; Commentary tab (generated text); worm chart (*Should*); PDF/image export. |
| Statistics | `batting/bowling/fielding_performances` builders; `player_stats` and `team_stats` aggregation (SQL function/Edge Function + local equivalent); recompute on correction; Team and Player profile stats; basic leaderboards. |
| Match history | Matches tab (Live/Upcoming/Completed), search, filters (team, player, date, venue), open full scorecard and ball-by-ball. |
| Sync | Outbox push, pull by cursor, retries/back-off, single-scorer lock, sync status UI, server RLS for deliveries, audit trail on corrections. |
| Home Dashboard | Implement Stitch Home: greeting, Start New Match, live card, tiles, upcoming carousel, recent results. |
| Quality | E2E tests (Maestro), accessibility pass, performance profiling on low-end device, crash monitoring, run fidelity checks on all locked screens (LOCK-06). |
| Release | Internal testing track on Google Play + TestFlight; closed beta with 2–3 real clubs; privacy policy and account-deletion flow. |

**Deliverables (MVP):** create team → add players → create match → score fully → finish → correct scorecard → stats auto-updated → history searchable; works offline and syncs later.
**Exit criteria:** every MVP requirement (priority M) passes acceptance tests; zero known data-loss bugs; stats verified against manual calculations for 5+ real matches; crash-free sessions ≥ 99 %.

---

### Phase 4 — Tournaments, Records & Analytics (≈ 4 weeks)

**Goal:** Version 2 competition features built on the MVP data.

| Workstream | Tasks |
|---|---|
| Tournaments | Create tournament, add teams/groups, fixtures (manual + round-robin generator), link matches. |
| Points table | Points rules, NRR, tie-breakers; auto-update on match completion; standings screen. |
| Leaderboards | Tournament batting/bowling leaderboards; tournament-scoped player and team stats. |
| Records | Detect and display records (highest score, most runs/wickets, best bowling, highest team score, best partnerships, most 4s/6s) by player/team/tournament/format. |
| Analytics | Player form charts, run-rate and partnership charts, team trends; improved Stats tab. |
| Sharing | Public read-only match/tournament web page (static or lightweight web app), share sheet, deep links, guest viewing mode. |
| Design work (parallel) | Tournament screens, points table, leaderboards, records, charts. |

**Deliverables:** an organiser can run a complete tournament with live standings and leaderboards; users can share a match link with non-users.
**Exit criteria:** points table matches hand-calculated standings on a sample tournament; records recompute correctly after score corrections; shared links load < 2 s.

---

### Phase 5 — Multi-Scorer, Notifications, Test Format & Launch Hardening (≈ 4 weeks)

**Goal:** real-time collaboration, engagement features and production readiness.

| Workstream | Tasks |
|---|---|
| Multi-scorer sync | Server-ordered events, scorer hand-over, rebase of unsynced events, realtime channel for viewers; conflict tests (two devices, flaky network). Evaluate PowerSync if custom sync becomes costly. |
| Live viewing | Realtime live-score updates for followers; "Follow match/team". |
| Notifications | Push for match start, wickets, 50/100 milestones, innings break, result; per-user settings. |
| Format coverage | Test format (two innings per side, follow-on, declarations), super over, penalty runs; DLS remains out of scope unless added deliberately. |
| Hardening | Security review of RLS, penetration checklist, load test sync endpoints, backup/restore drill, i18n readiness (Urdu/RTL planned), tablet layout pass. |
| Launch | Store listings and screenshots, onboarding/tutorial for scorers, crash/analytics dashboards, support channel, release on Google Play and App Store, OTA update pipeline. |

**Deliverables:** public release with real-time multi-scorer matches, notifications and complete V2 feature set.
**Exit criteria:** two-device scoring of one match stays consistent under network drops; notifications delivered within seconds; passes store review; monitoring and rollback plan in place.

---

## 14. Risks & Mitigations

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| R1 | Cricket rule edge cases (run-outs on no-balls, byes with no-balls, retirements, free hit) produce wrong scorecards | High | Build the engine first with extensive tests; validate against real scorebooks; keep rules in one module. |
| R2 | Offline sync bugs cause duplicate or missing balls | High | Append-only events with UUIDs, idempotent upserts, outbox in the same transaction as the delivery, sync tests with network chaos. |
| R3 | Scorer UI too slow or error-prone in the field | High | 60 px keys, haptics, undo everywhere, field testing early (Phase 2) with real scorers. |
| R4 | Multi-scorer sync complexity | Medium | Deferred to Phase 5; MVP uses single-scorer lock; consider PowerSync. |
| R5 | Stats drift from deliveries after corrections | Medium | Stats are derived caches rebuilt from events; automated reconciliation test. |
| R6 | Scope creep (tournaments, DLS, fantasy) delays the MVP | Medium | Lock MVP scope (priority M); log extras for later phases. |
| R7 | Stitch HTML designs don't map directly to React Native | Low–Medium | Treat the Stitch HTML as the exact visual spec (LOCK-01); translate it 1:1 to native components and verify with side-by-side checks. |
| R8 | Store rejection (privacy policy, account deletion, permissions) | Low | Include deletion/export and privacy policy in Phase 3; follow store checklists. |
| R9 | Low-end Android performance | Medium | Test on a real mid-range device each phase; memoize list rows; avoid heavy shadows on long lists. |

---

## 15. Open Decisions

| # | Question | Recommendation |
|---|---|---|
| D1 | **Test format in MVP?** The brief lists Test as a format, but Test needs two innings per side, follow-on and declarations. | Support T20/ODI/custom first; add Test in Phase 5. |
| D2 | **Backend choice** — Supabase vs custom Node server. | Supabase for the MVP; keep logic in the shared engine package so a later migration is possible. |
| D3 | **Free hit / penalty runs** in the MVP? | Free hit as *Should* (Phase 2); penalty runs in Phase 5. |
| D4 | **Public web viewing** — native app only, or a lightweight web page too? | Lightweight read-only web page in Phase 4. |
| D5 | **Languages** — English only at launch? | English first; externalize strings now for Urdu/Hindi later. |
| D6 | **Monetization / organisation model** (free, per-club, per-tournament)? | Decide before Phase 4; the data model already supports organisations later if needed. |
| D7 | **Who can edit a completed match?** | Scorer who scored it + admin, always audited. |

---

## 16. Appendices

### A. MVP Acceptance Checklist
- [ ] Sign up, log in, reset password; roles enforced.
- [ ] Create a team with crest/logo; add and edit players; set captain/vice-captain.
- [ ] Create a match (T20/ODI/custom), choose Playing XI, record toss, choose openers and bowler.
- [ ] Score a full match: runs 0–6, wides, no-balls, byes, leg-byes, all dismissal types, strike rotation, new bowler prompts.
- [ ] Undo last ball; edit an earlier ball; audit log entry created.
- [ ] Innings break and second innings with correct target; correct result text.
- [ ] Airplane-mode scoring of a full match, then automatic sync with no duplicate or missing balls.
- [ ] Scorecard shows batting, bowling, extras, fall of wickets, partnerships and result and matches a manual calculation.
- [ ] Player and team statistics update automatically after completion and recompute after a correction.
- [ ] Match history search and filters work; any match opens with full ball-by-ball.
- [ ] App recovers after force-quit mid-over.
- [ ] Every screen matches its Stitch design (LOCK-01…08) and has product-owner sign-off.

### B. Requirement Traceability (Brief → SRS)

| Brief section | SRS section |
|---|---|
| 3.1 User & Login | 3.1 AUTH, 11 |
| 3.2 Teams | 3.2 TEAM |
| 3.3 Players | 3.3 PLAY |
| 3.4 Match Creation | 3.4 MATCH |
| 3.5 Live Scoring | 3.5 SCORE, 5 |
| 3.6 Live Match Screen | 3.6 LIVE, 4.5 |
| 3.7 Scorecard | 3.7 CARD |
| 3.8 Automatic Statistics | 3.8 STAT, 5.3, 6 |
| 3.9 Tournaments | 3.10 TOUR (Phase 4) |
| 3.10 Match History | 3.9 HIST |
| 4 Records | 3.11 REC (Phase 4) |
| 5 Offline Scoring | 7 SYNC |
| 7 Data Model | 6 |
| 8 MVP / 9 Version 2 | 13 Phases 1–3 / 4–5 |
| 10 Non-Functional | 8, 11, 12 |

### C. Glossary of Dismissal Types
Bowled · Caught · LBW (leg before wicket) · Run Out · Stumped · Hit Wicket · Retired Hurt (not a wicket) · Retired Out · Obstructing the Field · Hit the Ball Twice · Timed Out.

---

*End of document — ScoreSphere SRS v1.0*