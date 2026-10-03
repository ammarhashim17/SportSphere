# ScoreSphere — Decisions Log (Milestone 0)

| Decision Date | 3 October 2026 |
|---|---|
| **Project** | ScoreSphere |
| **Phase** | Phase 1 (M0 – Pre-flight) |

---

## Pre-flight Questions & Answers (Q1 – Q8)

| # | Question | Decision / Answer | Notes |
|---|---|---|---|
| **Q1** | Dev machine OS & test devices | **Windows 11 Enterprise**; test with **Expo (Android)**. iOS skipped. | Using Expo dev client on Android. |
| **Q2** | Supabase backend | **Hosted Supabase Project** (`udguebouinyvrbcyetjq`). | Connection: `postgresql://postgres.udguebouinyvrbcyetjq:***@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres`<br>Project URL: `https://udguebouinyvrbcyetjq.supabase.co` |
| **Q3** | App Name & Identifiers | **Name**: `ScoreSphere`<br>**Slug**: `scoresphere`<br>**Scheme**: `scoresphere`<br>**Android Package**: `com.scoresphere.app` | Aligned with architect recommendation. |
| **Q4** | Logo image | **Yes** — use `design/stitch/scoresphere_logo/screen.png` | Used for app icon, splash screen, and header branding. |
| **Q5** | Default roles for new accounts | `['team_manager', 'scorer']` | Set in `profiles.roles` upon sign-up. |
| **Q6** | Stitch designs for screens | Available for `home_dashboard`, `live_match_scoring`, `match_scorecard`. Other screens built as **TEMP-UI** per LOCK-03. | Tracked in `docs/TEMP_SCREENS.md`. |
| **Q7** | Git Remote | `https://github.com/ammarhashim17/SportSphere.git` | Remote origin configured and active. |
| **Q8** | Email confirmation at sign-up | **Required** | Enforced via Supabase Auth settings. |

---

## Environment Verification Summary

- **OS**: Windows 11 Enterprise (x64)
- **Git**: `git version 2.55.0.windows.5`
- **Node.js / npm**: Installing Node.js v22.x LTS into local environment
- **Stitch Assets**: Verified in `design/stitch/` (`home_dashboard`, `live_match_scoring`, `match_scorecard`, `scoresphere_logo`, `scoresphere/DESIGN.md`)
