# ScoreSphere — Phase 2 Progress & Exit Report

**Status:** IN PROGRESS (P2-M2 Complete)  
**Remote Repository:** `https://github.com/ammarhashim17/SportSphere` (Branch: `main`)

---

## 1. Milestones Done

| Milestone | Scope                            | Deliverables & Verification                                                                                                                                             | Status                  |
| --------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| **P2-M0** | Pre-flight & Housekeeping        | Standing rules, folder structure, `.husky/pre-commit`, `.github/workflows/ci.yml`, deviations updated, Gate G0 passed on Windows                                        | ✅ Complete (`2a53dbc`) |
| **P2-M1** | Scoring Engine & Data Layer      | Pure TS scoring engine (52 scenario tests, property tests, 4 SQLite integration flows), Drizzle migration `0001_cooing_the_enforcers.sql`, paper-scorebook 2-over check | ✅ Complete (`58553cb`) |
| **P2-M2** | Server Schema & RLS              | Migration `0002_matches.sql` applied to Supabase, updated `database.types.ts`, RLS matrix verified                                                                      | ✅ Complete (`9f86238`) |
| **P2-M3** | Local Database & Sync            | Drizzle schema, batching + scoped pulls sync service, startup migration                                                                                                 | ✅ Complete             |
| **P2-M4** | Repositories & Hooks             | Verified on real SQL (4 integration flows pass)                                                                                                                         | ✅ Complete             |
| **P2-M5** | Live Scoring UI Components       | Stitch-locked components, MaterialSymbolsFilled font, Home live match connected                                                                                         | ✅ Complete             |
| **P2-M6** | Live Scoring Screen & Flows      | Keypad actions, bottom sheets, full live scoring flow and console navigation                                                                                            | ✅ Complete             |
| **P2-M7** | Match Wizard, Hub & Matches List | TEMP-UI screens, 4-step wizard, match hub, tabs                                                                                                                         | ⏳ In Progress          |
| **P2-M8** | Hardening & Performance          | Latency verification (<100ms), rapid-tap test, keep-awake                                                                                                               | ⏳ Pending              |
| **P2-M9** | Phase 2 Exit                     | Final sign-off, scorebook comparisons, exit audit                                                                                                                       | ⏳ Pending              |

---

## 2. Server Schema & RLS Matrix (P2-M2)

Migration `0002_matches.sql` applied to Supabase project `udguebouinyvrbcyetjq`:

- Enums created: `match_format`, `match_status`, `toss_decision`, `result_type`, `margin_type`, `extra_type`, `wicket_type`, `innings_status`, `innings_end_reason`.
- Core match tables: `matches`, `playing_xi`, `innings`, `deliveries`, `score_corrections`.
- Authorization helper functions: `can_manage_match`, `can_manage_innings`, `can_manage_delivery`.
- Trigger functions: `set_updated_at()` attached to all tables.

### RLS Policy Verification Matrix

| Check                   | Actor / Context                   | Operation                                  | Expected                                                | Result  |
| ----------------------- | --------------------------------- | ------------------------------------------ | ------------------------------------------------------- | ------- |
| Match creation          | Account A (scorer / team_manager) | `INSERT INTO matches`                      | Allowed                                                 | ✅ Pass |
| Match creation          | Account B (viewer)                | `INSERT INTO matches`                      | Denied by RLS                                           | ✅ Pass |
| Match read              | Account B (viewer)                | `SELECT FROM matches`                      | Allowed (all matches public to authenticated)           | ✅ Pass |
| Child records           | Account A (match creator/scorer)  | `INSERT playing_xi / innings / deliveries` | Allowed                                                 | ✅ Pass |
| Child records           | Account B (viewer)                | `INSERT deliveries`                        | Denied by RLS (`can_manage_innings` = false)            | ✅ Pass |
| Delivery update         | Account A (scorer)                | `UPDATE deliveries SET voided = true`      | Allowed                                                 | ✅ Pass |
| Delivery update         | Account B (viewer)                | `UPDATE deliveries`                        | Denied by RLS                                           | ✅ Pass |
| Delivery hard delete    | Anyone                            | `DELETE FROM deliveries`                   | Denied (no DELETE policy exists; audit trail preserved) | ✅ Pass |
| Score correction insert | Account A (scorer)                | `INSERT INTO score_corrections`            | Allowed                                                 | ✅ Pass |
| Score correction update | Anyone                            | `UPDATE score_corrections`                 | Denied (append-only table)                              | ✅ Pass |
| Unique sequence         | Account A                         | Insert duplicate `(innings_id, seq)`       | Denied by unique constraint `(innings_id, seq)`         | ✅ Pass |
