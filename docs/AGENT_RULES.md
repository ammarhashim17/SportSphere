# ScoreSphere — Standing Rules for the Coding Agent

> Put this file where Antigravity reads workspace rules (normally `.agent/rules/scoresphere.md`; if your version uses another location, put it there). Also keep a copy at the repo root as `AGENT_RULES.md`. These rules apply to **every** task in this repository.

## 1. Who decides what

- **The architect (Claude) decides** architecture, libraries, data model, file structure and code patterns. They are written in `PHASE1_IMPLEMENTATION_PLAN.md` (the "Plan") and in the SRS (`ScoreSphere_SRS.md`).
- **You (the agent) implement** exactly what the Plan says. Where the Plan contains code, use that code. Fix only genuine compile/runtime errors in it, and list every such fix in `docs/DEVIATIONS.md` (file, what, why).
- **Never** swap a library, rename a table/column, change a folder layout, add a dependency, or "improve" the design on your own. If you think something is wrong or missing, **stop and ask the user** (see section 4).
- If the Plan and the SRS disagree, **the Plan wins** (it lists its amendments to the SRS).

## 2. 🔒 UI Fidelity Lock (most important rule)

- The UI must be **identical** to the Stitch export in `design/stitch/` (`home_dashboard`, `live_match_scoring`, `match_scorecard`, and `scoresphere/DESIGN.md`). Layout, colours, fonts, sizes, spacing, radii, shadows, icons, text and order of elements must match `screen.png` / `code.html`.
- Design tokens come **only** from `src/theme/tokens.json` (copied verbatim from Stitch). Never hard-code a colour, size, radius or font that is not a token or copied exactly from `code.html`.
- Do **not** design UI. A screen with no Stitch design may only be built as a **TEMP-UI** screen using the UI kit, marked with the comment `// TEMP-UI: replace with Stitch design (LOCK-03)` and listed in `docs/TEMP_SCREENS.md`. Never present a TEMP-UI screen as finished.
- Never edit anything inside `design/stitch/`.
- A UI task is not done until it passes the fidelity check in the Plan (section "Fidelity procedure") and the user signs off.

## 3. Engineering rules

- TypeScript **strict**; no `any` except in the one sync adapter file the Plan names; no `// @ts-ignore`.
- `src/core/**` is **pure TypeScript**: it must not import `react`, `react-native`, `expo-*`, or anything from `src/db`, `src/lib`, `src/features`. (ESLint enforces this.)
- Styling: NativeWind classes + tokens. **Never put two classes that set the same property on one element** (NativeWind cannot resolve the conflict). Do not use `font-bold/semibold/medium` utilities; use `<Text weight=…>` or the `font-inter-*` classes.
- Every database write goes through a repository in `src/db/repositories/` inside a transaction that also writes the outbox row. Screens never touch Drizzle or Supabase directly.
- No secrets in the repo. Only `EXPO_PUBLIC_*` variables in the app; the Supabase **service-role key must never appear** in app code.
- Add tests for every pure function you write. Run `npm run check` (lint + typecheck + test) before every commit; never commit red.
- Small commits using Conventional Commits (`feat:`, `fix:`, `chore:`, `test:`, `docs:`), one logical change each, referencing the milestone (e.g., `feat(M7): add outbox repository`).

## 4. When to stop and ask the user

Stop and ask (do not guess) when:

1. A **Plan question (Q1–Q8)** has no answer yet — ask them all in one message at the start, and offer the defaults.
2. A **gate** in the Plan fails (e.g., the compatibility gate in M2).
3. A screen needs UI that is not in the Stitch export.
4. The Plan is ambiguous, contradictory, or a command/library behaves differently from what the Plan says.
5. You are tempted to deviate in any way.

When asking: state the problem in 2–3 lines, list the options you see, say which you would pick, and wait.

## 5. Working protocol

1. Work **milestone by milestone** (M0 → M11) in order. Keep the task list artifact in sync with the milestones.
2. At the end of each milestone: run `npm run check`, run the milestone's acceptance checks, commit, and post a short report (what was done, checks run, deviations, anything needing the user).
3. Continue automatically to the next milestone unless a stop-condition in section 4 applies.
4. Keep `docs/DEVIATIONS.md`, `docs/TEMP_SCREENS.md` and `docs/PHASE1_REPORT.md` up to date.
5. Never delete or rewrite user files (the Stitch export, the SRS, the Plan).
