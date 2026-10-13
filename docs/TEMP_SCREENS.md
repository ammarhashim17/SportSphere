# ScoreSphere — Temporary UI (TEMP-UI) Screen Inventory

Per **ADR-16** and **LOCK-03**, screens without an existing Stitch design export are constructed using the locked Design System tokens (`src/theme/tokens.json`) and UI kit primitives (`src/components/ui/`). Each temporary component bears the header comment:
`// TEMP-UI: replace with Stitch design (LOCK-03)`

| Screen Route                  | Component Path                       | Purpose                                           | Design Status     |
| ----------------------------- | ------------------------------------ | ------------------------------------------------- | ----------------- |
| `/(auth)/login`               | `app/(auth)/login.tsx`               | Email & password login                            | TEMP-UI (Phase 1) |
| `/(auth)/signup`              | `app/(auth)/signup.tsx`              | Account registration & confirmation               | TEMP-UI (Phase 1) |
| `/(auth)/forgot-password`     | `app/(auth)/forgot-password.tsx`     | Password reset request                            | TEMP-UI (Phase 1) |
| `/(app)/(tabs)/teams`         | `app/(app)/(tabs)/teams.tsx`         | User's teams list & creation CTA                  | TEMP-UI (Phase 1) |
| `/(app)/(tabs)/matches`       | `app/(app)/(tabs)/matches.tsx`       | Matches placeholder (Phase 2)                     | TEMP-UI (Phase 1) |
| `/(app)/(tabs)/stats`         | `app/(app)/(tabs)/stats.tsx`         | Statistics placeholder (Phase 3)                  | TEMP-UI (Phase 1) |
| `/(app)/team/new`             | `app/(app)/team/new.tsx`             | Create team form with logo upload                 | TEMP-UI (Phase 1) |
| `/(app)/team/[id]`            | `app/(app)/team/[id].tsx`            | Team details, roster & squad management           | TEMP-UI (Phase 1) |
| `/(app)/team/[id]/edit`       | `app/(app)/team/[id]/edit.tsx`       | Edit team details & archive team                  | TEMP-UI (Phase 1) |
| `/(app)/team/[id]/add-player` | `app/(app)/team/[id]/add-player.tsx` | Select & assign players to team squad             | TEMP-UI (Phase 1) |
| `/(app)/player/new`           | `app/(app)/player/new.tsx`           | Create player form with photo upload              | TEMP-UI (Phase 1) |
| `/(app)/player/[id]`          | `app/(app)/player/[id].tsx`          | Player profile details & batting/bowling style    | TEMP-UI (Phase 1) |
| `/(app)/player/[id]/edit`     | `app/(app)/player/[id]/edit.tsx`     | Edit player details & archive player              | TEMP-UI (Phase 1) |
| `/(app)/settings`             | `app/(app)/settings.tsx`             | Profile, sync diagnostics, manual sync & sign out | TEMP-UI (Phase 1) |
| UI Helper                     | `src/components/ui/TextField.tsx`    | Floating label text field                         | TEMP-UI (Phase 1) |
| UI Helper                     | `src/components/ui/TempScreen.tsx`   | Safe area container with header & back button     | TEMP-UI (Phase 1) |
