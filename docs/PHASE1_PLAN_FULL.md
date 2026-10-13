<USER_REQUEST>

# ScoreSphere — Phase 1 Implementation Plan (for the Antigravity coding agent)

**Phase 1 goal:** a solid, installable base — project tooling, the locked design system and UI kit, navigation shell, authentication, the database (cloud + local), and **Teams & Players** working end to end (offline-capable). The Home Dashboard is built to match Stitch.

**Authority:** this plan is written by the architect. Architectural decisions (section 2) and code (sections M1–M11) are **binding**. The agent implements; it does not redesign. Read `AGENT_RULES.md` first.

**Inputs the agent must have before starting**

| Item                                                                                                                   | Where it must be                            |
| ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Stitch export (second/updated zip: `home_dashboard`, `live_match_scoring`, `match_scorecard`, `scoresphere/DESIGN.md`) | unzipped into `design/stitch/`              |
| Logo image (from the first Stitch zip: `scoresphere_logo/screen.png`)                                                  | `design/stitch/scoresphere_logo/screen.png` |
| SRS                                                                                                                    | `docs/ScoreSphere_SRS.md`                   |
| This plan + `AGENT_RULES.md`                                                                                           | `docs/` and repo root                       |

---

## 0. Milestones at a glance

| #   | Milestone                 | Output                                                                              |
| --- | ------------------------- | ----------------------------------------------------------------------------------- |
| M0  | Pre-flight                | Questions answered, environment verified                                            |
| M1  | Scaffold & tooling        | Expo SDK 54 app, TS strict, lint, tests, CI, git hooks                              |
| M2  | Styling pipeline & tokens | NativeWind + Stitch tokens + fonts + icons + **compatibility gate** + fidelity test |
| M3  | UI kit                    | Base components built from tokens                                                   |
| M4  | Navigation shell          | Routes, auth guard, Stitch-style bottom tab bar                                     |
| M5  | Backend                   | Supabase schema, RLS, storage, generated types                                      |
| M6  | Authentication            | Secure session, auth store, TEMP auth screens                                       |
| M7  | Local DB & sync           | Drizzle schema, repositories, outbox, push/pull sync                                |
| M8  | Teams & Players           | Logic, forms, TEMP screens, image upload                                            |
| M9  | Home Dashboard            | Pixel-matched to Stitch (fixture data)                                              |
| M10 | Settings & sync status    | Profile/settings TEMP screen, sign-out wipe                                         |
| M11 | QA & exit                 | Tests, fidelity sign-off, report                                                    |

---

## 1. How the agent must work (summary)

- Follow `AGENT_RULES.md`. Stop at the **gates** (marked 🚧) and when a question is unanswered.
- After each milestone: `npm run check` → acceptance checks → commit → short report → continue.
- All deviations go to `docs/DEVIATIONS.md`.

---

## 2. Architecture Decisions (binding)

| ID         | Decision                                                                                                                                                                                                                              | Rationale                                                                                                                                |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **ADR-01** | **Expo SDK 54** (React Native 0.81, New Architecture, Hermes). Pin it; upgrading is a separate, later task. Use **development builds** (`expo-dev-client`), not Expo Go.                                                              | The libraries below are known to work together on SDK 54. Expo Go on iOS only supports the newest SDK, so a dev client avoids surprises. |
| **ADR-02** | **Single app package** (no monorepo yet). Pure domain code lives in `src/core/` (no React/Expo imports; ESLint-enforced) so it can be extracted into a package in Phase 3.                                                            | Simplest for a small team. _Amends SRS 9.4 (monorepo)._                                                                                  |
| **ADR-03** | **npm** as package manager.                                                                                                                                                                                                           | Fewest tooling problems with Expo. _Amends SRS (pnpm)._                                                                                  |
| **ADR-04** | Styling = **NativeWind v4 + Tailwind CSS 3.4**. `src/theme/tokens.json` is a **verbatim copy** of the Tailwind config embedded in Stitch's `code.html` (colours, spacing, radii, font sizes) so Stitch classes translate 1:1.         | Fidelity lock.                                                                                                                           |
| **ADR-05** | Fonts = **Inter** static weights (`@expo-google-fonts/inter`). Weight is selected by **font-family token** (`font-inter-semibold`), never `font-weight`. Letter-spacing converted from em to px.                                      | `fontWeight` with custom fonts causes faux-bold/fallback on Android.                                                                     |
| **ADR-06** | Shadows use the RN `boxShadow` style (New Architecture) with the **exact** values from Stitch. Header/tab-bar `backdrop-blur` is rendered as the same colour at the same opacity without blur (visually equivalent at 90–95 % white). | Exact cross-platform shadows.                                                                                                            |
| **ADR-07** | Icons = **Material Symbols Outlined** (the same set Stitch uses), as a **subset font** built from only the icons used in the Stitch HTML, via `createIconSet`.                                                                        | Fidelity; small bundle. No filled variant is used in the designs.                                                                        |
| **ADR-08** | Backend = **Supabase** (Postgres + Auth + Storage). RLS on every table. App uses the **anon key only**.                                                                                                                               | SRS 9.1.                                                                                                                                 |
| **ADR-09** | **Local-first for Teams/Players/Squads:** SQLite (`expo-sqlite` + Drizzle) is what the UI reads; every write = local transaction + **outbox** row; background **push/pull sync** to Supabase.                                         | Offline requirement; same pattern Phase 3 reuses for deliveries.                                                                         |
| **ADR-10** | **IDs are client-generated UUIDs** (`expo-crypto`). `updated_at` is **server-authoritative** (trigger). Deletes are **soft** (`archived_at` / `active=false`); no hard deletes from the app.                                          | Offline-safe, history-safe.                                                                                                              |
| **ADR-11** | Auth = Supabase **email + password**. Session persisted with **LargeSecureStore** (AES key in SecureStore, ciphertext in AsyncStorage). Profile cached locally. Local data is wiped on sign-out or when a different user signs in.    | SEC-02, SEC-11.                                                                                                                          |
| **ADR-12** | **Roles** live in `profiles.roles` (enum array). New accounts get `{team_manager, scorer}` (answer Q6 may change it). Users cannot edit their own roles (column-level grant). Enforcement is in RLS; the UI only hides buttons.       | SEC-05.                                                                                                                                  |
| **ADR-13** | State: **Zustand** for auth/session/sync-status; **Drizzle `useLiveQuery`** for data. **TanStack Query is NOT installed in Phase 1** (nothing remote-only yet).                                                                       | YAGNI. _Amends SRS 9.1._                                                                                                                 |
| **ADR-14** | Forms = **React Hook Form + Zod**; Zod schemas live in `src/core/schemas.ts` and are reused by repositories.                                                                                                                          | One validation source.                                                                                                                   |
| **ADR-15** | **Home Dashboard** is built to match Stitch using **fixtures** (`EXPO_PUBLIC_USE_FIXTURES=true`). Real match data is wired in Phases 2–3.                                                                                             | Match data does not exist until scoring exists.                                                                                          |
| **ADR-16** | Screens without a Stitch design are **TEMP-UI** (UI-kit only, flagged, tracked).                                                                                                                                                      | LOCK-03.                                                                                                                                 |
| **ADR-17** | Image upload (logo/photo/avatar) is **online-only** in Phase 1; the picker button is disabled offline with an inline message.                                                                                                         | Keeps sync simple.                                                                                                                       |
| **ADR-18** | Tests: **Jest (jest-expo)** + RNTL. Includes an automated **token-fidelity test** comparing `tokens.json` to the Stitch HTML. E2E (Maestro) starts in Phase 3.                                                                        | LOCK-02 enforced by CI.                                                                                                                  |
| **ADR-19** | Routing = **Expo Router** (typed routes), groups `(auth)` and `(app)`; guard via `Stack.Protected`.                                                                                                                                   | Matches SRS 9.1.                                                                                                                         |

---

## 3. Questions for the user (agent asks these in ONE message at M0)

The agent must ask all of these at once, show the default, and accept "use defaults".

| #      | Question                                                                                                                                             | Default if the user says "use defaults"                                                                                                         |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Q1** | Which OS is your dev machine (Windows / macOS / Linux), and which devices will you test on (Android emulator, Android phone, iOS simulator, iPhone)? | Android only, via emulator or USB phone (`npx expo run:android`). iOS is skipped (needs macOS).                                                 |
| **Q2** | Do you already have a **Supabase project** (URL + anon key)? Is **Docker** installed for running Supabase locally?                                   | Use a **hosted** Supabase project: the user creates it and pastes the URL and anon key into `.env`. Local Supabase is skipped.                  |
| **Q3** | App name and ids?                                                                                                                                    | Name `ScoreSphere`, slug `scoresphere`, scheme `scoresphere`, Android package / iOS bundle `com.scoresphere.app` (change before store release). |
| **Q4** | Is the logo at `design/stitch/scoresphere_logo/screen.png` the correct logo (the updated Stitch HTML only links a remote logo URL)?                  | Yes, use it for the app icon, splash and header.                                                                                                |
| **Q5** | Default roles for new accounts?                                                                                                                      | `team_manager` + `scorer`.                                                                                                                      |
| **Q6** | Do you have Stitch designs for **Login / Sign-up / Teams / Team Profile / Players / Player Profile / Forms / Settings**?                             | No → build them as **TEMP-UI** and list them for later replacement.                                                                             |
| **Q7** | Is a git remote available (GitHub)?                                                                                                                  | Local git only; skip GitHub Actions.                                                                                                            |
| **Q8** | Must email confirmation be required at sign-up?                                                                                                      | Required in the hosted project (Supabase default); disabled only in local dev.                                                                  |

---

## 4. Target repository layout

```
scoresphere/
├─ AGENT_RULES.md
├─ app/                                  # Expo Router routes (thin: compose features only)
│  ├─ _layout.tsx
│  ├─ (auth)/_layout.tsx  login.tsx  signup.tsx  forgot-password.tsx
│  └─ (app)/
│     ├─ _layout.tsx
│     ├─ (tabs)/_layout.tsx  index.tsx  matches.tsx  teams.tsx  stats.tsx
│     ├─ team/new.tsx  team/[id].tsx  team/[id]/edit.tsx  team/[id]/add-player.tsx
│     ├─ player/new.tsx  player/[id].tsx  player/[id]/edit.tsx
│     └─ settings.tsx
├─ assets/ (fonts/, images/)
├─ design/stitch/                        # READ-ONLY Stitch export
├─ docs/  (ScoreSphere_SRS.md, PHASE1_IMPLEMENTATION_PLAN.md, DEVIATIONS.md, TEMP_SCREENS.md, PHASE1_REPORT.md)
├─ drizzle/                              # generated SQL migrations (+ migrations.js)
├─ scripts/ (build-icon-font.mjs, fidelity-diff.mjs)
├─ supabase/ (config.toml, migrations/0001_core.sql)
├─ src/
│  ├─ components/ui/                     # UI kit (Text, Icon, Card, Button, …)
│  ├─ components/home/                   # Stitch-locked Home components
│  ├─ core/                              # PURE TS: schemas, permissions, utils (no RN imports)
│  ├─ db/ (client.ts, schema.ts, outbox.ts, repositories/)
│  ├─ features/ (auth/, teams/, players/, settings/)
│  ├─ fixtures/                          # stitchHome.ts
│  ├─ lib/ (supabase.ts, secureStorage.ts, env.ts, cn.ts, database.types.ts)
│  ├─ sync/ (syncService.ts, SyncProvider.tsx, syncStore.ts)
│  └─ theme/ (tokens.json, colors.ts, shadows.ts, gradients.ts, iconGlyphs.json)
├─ babel.config.js  metro.config.js  tailwind.config.js  global.css  nativewind-env.d.ts
├─ drizzle.config.ts  eslint.config.js  jest.config.js  tsconfig.json  app.json  .env.example
```

---

## M0 — Pre-flight

1. Ask Q1–Q8 (section 3) in one message. Record answers in `docs/DECISIONS_LOG.md`.
2. Verify the environment and report versions:
   ```bash
   node -v        # must be 20 or newer
   npm -v
   git --version
   java -version  # JDK 17 for Android builds
   # Android SDK + an emulator (or a USB phone with USB debugging) must exist; verify with:
   adb devices
   ```
3. Verify `design/stitch/` contains the three screen folders and `scoresphere/DESIGN.md`. If not, **stop and ask**.
4. `git init` (if not already a repo) with a Node/Expo `.gitignore` (include `.env`, `/android`, `/ios`, `/drizzle` **not** ignored).

**Acceptance:** answers recorded; tool versions printed; Stitch files present.

---

## M1 — Scaffold & tooling

### M1.1 Create the app (SDK 54)

```bash
npx create-expo-app@latest scoresphere --template default@sdk-54
cd scoresphere
npm run reset-project        # answer: n (delete the example files, do not keep app-example)
```

If the `@sdk-54` template tag is unavailable: create with the default template, then `npx expo install expo@~54.0.0 && npx expo install --fix`. Report any version issue.

Move the project root contents if the CLI created a nested folder, so the repo root **is** the app root.

### M1.2 Install dependencies (exactly these)

```bash
# Expo-compatible versions (let Expo pick the right versions)
npx expo install expo-router expo-font expo-splash-screen expo-status-bar expo-constants expo-linking \
  expo-linear-gradient expo-sqlite expo-secure-store expo-crypto expo-image expo-image-picker expo-haptics \
  expo-dev-client react-native-svg react-native-reanimated react-native-worklets react-native-gesture-handler \
  react-native-safe-area-context react-native-screens @react-native-async-storage/async-storage \
  @react-native-community/netinfo @expo-google-fonts/inter

# Pure JS libraries
npm i nativewind@^4 @supabase/supabase-js react-native-url-polyfill zustand react-hook-form zod \
  @hookform/resolvers drizzle-orm aes-js @gorhom/bottom-sheet

# Dev dependencies
npm i -D tailwindcss@^3.4.17 prettier-plugin-tailwindcss drizzle-kit babel-plugin-inline-import \
  @types/aes-js jest jest-expo @types/jest @testing-library/react-native \
  prettier husky lint-staged sharp pixelmatch pngjs
```

> `fonttools` (used in M2.3 to subset the icon font) is a **Python** tool, installed there with `pip install fonttools`; it is not an npm package.

Do **not** install `@tanstack/react-query` (ADR-13) or any other library not listed.

### M1.3 `tsconfig.json`

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "resolveJsonModule": true,
    "allowJs": true,
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts", "nativewind-env.d.ts"]
}
```

### M1.4 `app.json` (merge into the generated file; keep other generated keys)

```json
{
  "expo": {
    "name": "ScoreSphere",
    "slug": "scoresphere",
    "scheme": "scoresphere",
    "version": "0.1.0",
    "orientation": "portrait",
    "userInterfaceStyle": "light",
    "newArchEnabled": true,
    "icon": "./assets/images/icon.png",
    "ios": { "bundleIdentifier": "com.scoresphere.app", "supportsTablet": false },
    "android": { "package": "com.scoresphere.app" },
    "experiments": { "typedRoutes": true },
    "plugins": [
      "expo-router",
      "expo-font",
      "expo-sqlite",
      "expo-secure-store",
      [
        "expo-image-picker",
        {
          "photosPermission": "ScoreSphere needs access to your photos to set team logos and player pictures."
        }
      ],
      [
        "expo-splash-screen",
        {
          "image": "./assets/images/splash-icon.png",
          "backgroundColor": "#FFFFFF",
          "imageWidth": 160
        }
      ]
    ]
  }
}
```

Use the answers to Q3 for names/ids. Generate `assets/images/icon.png` (1024×1024) and `splash-icon.png` from the approved logo; if the logo is too small to upscale cleanly, **stop and ask**.

### M1.5 `.env.example` (copy to `.env`, never commit `.env`)

```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_USE_FIXTURES=true
```

### M1.6 `src/lib/env.ts`

```ts
const required = (name: string, value: string | undefined): string => {
  if (!value)
    throw new Error(
      `Missing environment variable: ${name}. Copy .env.example to .env and fill it in.`,
    );
  return value;
};

export const env = {
  supabaseUrl: required('EXPO_PUBLIC_SUPABASE_URL', process.env.EXPO_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: required(
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  ),
  useFixtures: process.env.EXPO_PUBLIC_USE_FIXTURES === 'true',
} as const;
```

### M1.7 `src/lib/cn.ts`

```ts
/** Joins class names, ignoring falsy values. NOTE: it does NOT resolve conflicts — never pass two classes that set the same property. */
export const cn = (...parts: Array<string | false | null | undefined>): string =>
  parts.filter(Boolean).join(' ');
```

### M1.8 ESLint — add to `eslint.config.js` (keep the Expo flat config that the template generated)

```js
// Append these entries to the exported array
{
  files: ['src/core/**/*.{ts,tsx}'],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [
        { group: ['react', 'react-native', 'react-native-*', 'expo', 'expo-*', '@expo/*'], message: 'src/core must stay pure TypeScript.' },
        { group: ['@/db/*', '@/lib/*', '@/features/*', '@/sync/*', '@/components/*'], message: 'src/core must not depend on app layers.' },
      ],
    }],
  },
},
{ ignores: ['drizzle/**', 'design/**', 'android/**', 'ios/**', 'dist/**'] },
```

### M1.9 Prettier, scripts, hooks

`.prettierrc`:

```json
{
  "singleQuote": true,
  "semi": true,
  "trailingComma": "all",
  "printWidth": 100,
  "plugins": ["prettier-plugin-tailwindcss"],
  "tailwindFunctions": ["cn"]
}
```

`package.json` scripts (add/merge):

```json
{
  "scripts": {
    "start": "expo start --dev-client",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "lint": "expo lint",
    "typecheck": "tsc --noEmit",
    "test": "jest",
    "check": "npm run lint && npm run typecheck && npm test",
    "db:generate": "drizzle-kit generate",
    "icons": "node scripts/build-icon-font.mjs",
    "fidelity": "node scripts/fidelity-diff.mjs",
    "prepare": "husky"
  },
  "lint-staged": { "*.{ts,tsx,js,json,md}": "prettier --write" },
  "main": "expo-router/entry"
}
```

```bash
npx husky init
echo "npx lint-staged && npm run typecheck" > .husky/pre-commit
```

### M1.10 `jest.config.js`

```js
module.exports = {
  preset: 'jest-expo',
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  testPathIgnorePatterns: ['/node_modules/', '/design/', '/android/', '/ios/'],
};
```

### M1.11 CI (only if Q7 = yes) `.github/workflows/ci.yml`

```yaml
name: CI
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run check
```

**Acceptance (M1):** `npm run check` passes on the empty app; `npx expo run:android` installs and opens a blank screen on the emulator/phone; commit `chore(M1): scaffold`.

---

## M2 — Styling pipeline, tokens, fonts, icons (+ 🚧 compatibility gate)

### M2.1 NativeWind configuration files

`babel.config.js`

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  };
};
```

(Do not add a Reanimated/worklets plugin manually; `babel-preset-expo` handles it on SDK 54.)

`metro.config.js`

```js
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);
config.resolver.sourceExts.push('sql'); // Drizzle migrations

module.exports = withNativeWind(config, { input: './global.css' });
```

`global.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

`nativewind-env.d.ts`

```ts
/// <reference types="nativewind/types" />
```

`tailwind.config.js`

```js
const t = require('./src/theme/tokens.json');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: { ...t.colors, brand: t.brand },
      borderRadius: t.borderRadius,
      spacing: t.spacing,
      fontFamily: t.fontFamily,
      fontSize: t.fontSize,
    },
  },
  plugins: [],
};
```

### M2.2 `src/theme/tokens.json` (verbatim from Stitch)

> `colors`, `spacing`, `borderRadius` are **copied exactly** from the `tailwind.config` inside the Stitch `code.html` files. `fontSize` keeps Stitch's size and line-height; `fontWeight` is removed (ADR-05) and `letterSpacing` is converted from em to px (size × em). `fontFamily` maps each Stitch family key to the Inter static file that carries that token's weight. `brand` holds the extra named colours from `DESIGN.md` (aliases only).

```json
{
  "colors": {
    "surface": "#f8f9ff",
    "error": "#ba1a1a",
    "on-secondary-fixed": "#2a1700",
    "surface-bright": "#f8f9ff",
    "on-tertiary-fixed-variant": "#5b00c5",
    "on-primary-fixed": "#002111",
    "error-container": "#ffdad6",
    "on-surface-variant": "#404942",
    "on-secondary-container": "#684000",
    "tertiary": "#4a00a4",
    "secondary": "#855300",
    "primary-container": "#0d5c3a",
    "on-secondary-fixed-variant": "#653e00",
    "tertiary-container": "#6519d1",
    "on-error": "#ffffff",
    "background": "#f8f9ff",
    "primary": "#004328",
    "primary-fixed": "#a9f3c5",
    "on-primary": "#ffffff",
    "surface-container": "#e5eeff",
    "secondary-container": "#fea619",
    "on-tertiary-container": "#d0b7ff",
    "outline": "#707971",
    "surface-container-low": "#eff4ff",
    "surface-container-highest": "#d3e4fe",
    "on-tertiary": "#ffffff",
    "on-tertiary-fixed": "#250059",
    "inverse-surface": "#213145",
    "inverse-on-surface": "#eaf1ff",
    "on-surface": "#0b1c30",
    "tertiary-fixed": "#ebddff",
    "inverse-primary": "#8ed6aa",
    "secondary-fixed-dim": "#ffb95f",
    "on-error-container": "#93000a",
    "on-primary-container": "#8ad2a7",
    "primary-fixed-dim": "#8ed6aa",
    "outline-variant": "#bfc9c0",
    "tertiary-fixed-dim": "#d3bbff",
    "on-primary-fixed-variant": "#005232",
    "surface-variant": "#d3e4fe",
    "surface-container-high": "#dce9ff",
    "surface-container-lowest": "#ffffff",
    "surface-dim": "#cbdbf5",
    "secondary-fixed": "#ffddb8",
    "on-background": "#0b1c30",
    "on-secondary": "#ffffff",
    "surface-tint": "#226b47"
  },
  "borderRadius": { "DEFAULT": "0.25rem", "lg": "0.5rem", "xl": "0.75rem", "full": "9999px" },
  "spacing": {
    "gutter": "1rem",
    "space-xl": "2rem",
    "margin": "1rem",
    "space-lg": "1.5rem",
    "space-sm": "0.5rem",
    "space-md": "1rem",
    "space-xs": "0.25rem"
  },
  "fontFamily": {
    "inter-regular": ["Inter_400Regular"],
    "inter-medium": ["Inter_500Medium"],
    "inter-semibold": ["Inter_600SemiBold"],
    "inter-bold": ["Inter_700Bold"],
    "body-md": ["Inter_400Regular"],
    "body-sm": ["Inter_400Regular"],
    "caption": ["Inter_500Medium"],
    "title-sm": ["Inter_600SemiBold"],
    "micro-label": ["Inter_600SemiBold"],
    "headline-md": ["Inter_600SemiBold"],
    "headline-lg": ["Inter_700Bold"],
    "display-score": ["Inter_700Bold"]
  },
  "fontSize": {
    "body-md": ["15px", { "lineHeight": "22px" }],
    "body-sm": ["13px", { "lineHeight": "18px" }],
    "headline-md": ["20px", { "lineHeight": "26px", "letterSpacing": "-0.2px" }],
    "headline-lg": ["28px", { "lineHeight": "34px", "letterSpacing": "-0.56px" }],
    "caption": ["12px", { "lineHeight": "16px" }],
    "title-sm": ["17px", { "lineHeight": "22px" }],
    "micro-label": ["11px", { "lineHeight": "14px", "letterSpacing": "0.5px" }],
    "display-score": ["48px", { "lineHeight": "52px", "letterSpacing": "-1.44px" }]
  },
  "brand": {
    "turf": "#0D5C3A",
    "pitch": "#1E8E5A",
    "amber": "#F59E0B",
    "amberTint": "#FEF3C7",
    "amberText": "#B45309",
    "purple": "#6D28D9",
    "red": "#DC2626",
    "slate": "#64748B",
    "border": "#E8EBEF",
    "canvas": "#F6F7F9",
    "ink": "#0F172A"
  }
}
```

### M2.3 Icon font (Material Symbols Outlined subset)

The Stitch HTML uses the `material-symbols-outlined` font with default settings (no FILL variants). Build a subset font containing only the icons used.

```bash
pip install fonttools brotli
mkdir -p assets/fonts .cache
# 1. download the variable font and codepoints (one time)
curl -L -o ".cache/MaterialSymbolsOutlined.ttf" "https://github.com/google/material-design-icons/raw/master/variablefont/MaterialSymbolsOutlined%5BFILL%2CGRAD%2Copsz%2Cwght%5D.ttf"
curl -L -o ".cache/MaterialSymbolsOutlined.codepoints" "https://github.com/google/material-design-icons/raw/master/variablefont/MaterialSymbolsOutlined%5BFILL%2CGRAD%2Copsz%2Cwght%5D.codepoints"
npm run icons
```

If a URL fails, **stop and ask** the user to download the two files manually into `.cache/`.

`scripts/build-icon-font.mjs`

```js
// Builds assets/fonts/MaterialSymbolsOutlined.ttf (subset) and src/theme/iconGlyphs.json
// from the icons found in design/stitch/**/code.html plus EXTRA_ICONS below.
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const EXTRA_ICONS = [
  'home',
  'search',
  'close',
  'check_circle',
  'error',
  'cloud_off',
  'sync',
  'photo_camera',
  'person',
  'groups',
  'logout',
  'visibility',
  'visibility_off',
  'edit',
  'delete',
  'more_vert',
  'arrow_back',
];

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const used = new Set(EXTRA_ICONS);
for (const file of walk('design/stitch').filter((f) => f.endsWith('code.html'))) {
  const html = readFileSync(file, 'utf8');
  for (const m of html.matchAll(/material-symbols-outlined[^>]*>\s*([a-z0-9_]+)\s*</g))
    used.add(m[1]);
}

const codepoints = new Map(
  readFileSync('.cache/MaterialSymbolsOutlined.codepoints', 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => l.trim().split(' ')),
);

const glyphMap = {};
const unicodes = [];
for (const name of [...used].sort()) {
  const hex = codepoints.get(name);
  if (!hex) {
    console.warn(`! no codepoint for icon "${name}"`);
    continue;
  }
  glyphMap[name] = parseInt(hex, 16);
  unicodes.push(`U+${hex.toUpperCase()}`);
}

mkdirSync('assets/fonts', { recursive: true });
writeFileSync('src/theme/iconGlyphs.json', JSON.stringify(glyphMap, null, 2));
// Pin the variable axes to the defaults used by the Stitch HTML (FILL 0, wght 400, GRAD 0, opsz 24), then subset.
execSync(
  'fonttools varLib.instancer ".cache/MaterialSymbolsOutlined.ttf" FILL=0 wght=400 GRAD=0 opsz=24 -o .cache/instance.ttf',
  { stdio: 'inherit' },
);
execSync(
  `pyftsubset .cache/instance.ttf --unicodes="${unicodes.join(',')}" --output-file=assets/fonts/MaterialSymbolsOutlined.ttf --no-hinting`,
  { stdio: 'inherit' },
);
console.log(`Built icon font with ${unicodes.length} icons.`);
```

Add `.cache/` to `.gitignore`; **commit** `assets/fonts/MaterialSymbolsOutlined.ttf` and `src/theme/iconGlyphs.json`.

> If the subset ligature-less glyph approach fails (icons render as boxes), **stop and ask**; do not switch icon libraries.

### M2.4 Core theme helpers

`src/theme/colors.ts`

```ts
import tokens from './tokens.json';

/** Resolved hex values for places where a className cannot be used (icon colours, gradients, native props). */
export const colors = { ...tokens.colors, ...tokens.brand } as const;
```

`src/theme/shadows.ts` — **exact** values copied from Stitch; extend by copying from `code.html` when a screen needs another shadow.

```ts
import type { ViewStyle } from 'react-native';

export const shadow = {
  /** Level 1 card (DESIGN.md) */
  l1: { boxShadow: '0 2px 8px rgba(16, 24, 40, 0.06)' } satisfies ViewStyle,
  /** Level 2 */
  l2: {
    boxShadow: '0 8px 16px -4px rgba(16, 24, 40, 0.08), 0 2px 4px -2px rgba(16, 24, 40, 0.04)',
  } satisfies ViewStyle,
  /** Level 3 */
  l3: {
    boxShadow: '0 20px 24px -4px rgba(16, 24, 40, 0.12), 0 8px 8px -4px rgba(16, 24, 40, 0.04)',
  } satisfies ViewStyle,
  /** Stitch top header: shadow-[0_1px_8px_rgba(0,0,0,0.04)] */
  header: { boxShadow: '0 1px 8px rgba(0, 0, 0, 0.04)' } satisfies ViewStyle,
  /** Stitch bottom nav: shadow-[0_-2px_12px_rgba(0,0,0,0.04)] */
  navTop: { boxShadow: '0 -2px 12px rgba(0, 0, 0, 0.04)' } satisfies ViewStyle,
} as const;
```

`src/theme/gradients.ts`

```ts
export const heroGradient = {
  colors: ['#0D5C3A', '#1E8E5A'] as const,
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
} as const; // CSS: linear-gradient(135deg, #0D5C3A 0%, #1E8E5A 100%)
```

### M2.5 Root layout (fonts, providers) — final version is in M4; for M2 use a minimal one to run the gate:

`app/_layout.tsx` (temporary)

```tsx
import '../global.css';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

export default function RootLayout() {
  const [loaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    MaterialSymbolsOutlined: require('../assets/fonts/MaterialSymbolsOutlined.ttf'),
  });
  if (!loaded) return null;
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

### M2.6 🚧 Compatibility gate (must pass before M3)

Create a **temporary** screen `app/index.tsx` that renders each line below, run it on the device, and take a screenshot of each result.

```tsx
import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function Gate() {
  return (
    <View className="flex-1 gap-4 bg-surface p-margin pt-16">
      <Text className="font-display-score text-display-score text-on-surface">102/3</Text>
      <Text className="font-title-sm text-title-sm text-primary">Title Sm 17 semibold</Text>
      <Text className="font-micro-label text-micro-label uppercase text-on-surface-variant">
        Micro Label
      </Text>
      <View className="rounded-2xl border border-[#E8EBEF] bg-white p-4 shadow-[0_2px_8px_rgba(16,24,40,0.06)]">
        <Text>Arbitrary shadow class</Text>
      </View>
      <View className="rounded-xl bg-white/90 p-4">
        <Text>White at 90% opacity</Text>
      </View>
      <View className="h-2 w-2 rounded-full bg-primary-container" />
      <LinearGradient
        colors={['#0D5C3A', '#1E8E5A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ height: 80, borderRadius: 16 }}
      />
    </View>
  );
}
```

**Pass criteria:** Inter renders in the right weights; spacing/colour/radius tokens apply; the arbitrary shadow is visible (if **not**, record it and use the `shadow.*` style objects everywhere instead — this is allowed, ADR-06); opacity colours work; gradient renders; no red-screen errors from NativeWind/Reanimated.

**If anything other than the arbitrary-shadow check fails → STOP and ask the user.** Do not change styling libraries or SDK versions. Record the outcome in `docs/DEVIATIONS.md` (even if all pass, add a "gate passed" note with device and OS).

### M2.7 Token-fidelity test (enforces LOCK-02 in CI)

`src/theme/__tests__/tokens.fidelity.test.ts`

```ts
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import tokens from '../tokens.json';

function findHtml(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? findHtml(p) : p.endsWith('code.html') ? [p] : [];
  });
}

function stitchConfig(file: string) {
  const html = readFileSync(file, 'utf8');
  const m = html.match(/tailwind\.config\s*=\s*(\{[\s\S]*?\})\s*;?\s*<\/script>/);
  if (!m) throw new Error(`No tailwind config in ${file}`);
  // The config is a JS object literal; evaluate it in isolation.
  return new Function(`return (${m[1]});`)() as {
    theme: { extend: Record<string, Record<string, unknown>> };
  };
}

const root = join(__dirname, '../../../design/stitch');
const files = existsSync(root) ? findHtml(root) : [];

describe('tokens.json matches the Stitch Tailwind config (LOCK-02)', () => {
  it('finds Stitch screens', () => expect(files.length).toBeGreaterThan(0));

  it.each(files)('%s', (file) => {
    const ext = stitchConfig(file).theme.extend;
    expect(tokens.colors).toEqual(ext.colors);
    expect(tokens.spacing).toEqual(ext.spacing);
    expect(tokens.borderRadius).toEqual(ext.borderRadius);
    // fontSize: compare size + lineHeight only (weight/letterSpacing are intentionally translated)
    const ours = Object.fromEntries(
      Object.entries(tokens.fontSize).map(([k, v]) => [
        k,
        [v[0], (v[1] as { lineHeight: string }).lineHeight],
      ]),
    );
    const theirs = Object.fromEntries(
      Object.entries(ext.fontSize as Record<string, [string, { lineHeight: string }]>).map(
        ([k, v]) => [k, [v[0], v[1].lineHeight]],
      ),
    );
    expect(ours).toEqual(theirs);
  });
});
```

**Acceptance (M2):** gate passed; `npm run check` green including the fidelity test; icon font built; commit `feat(M2): styling pipeline and Stitch tokens`.

---

## M3 — UI kit (`src/components/ui/`)

General rules: build from tokens only; every component accepts `className` (for layout only — **never** colour/size props that the component already sets) and has a unit test where logic exists. Export everything from `src/components/ui/index.ts`.

### M3.1 `Text.tsx`

```tsx
import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { cn } from '@/lib/cn';

export type TextVariant =
  | 'display-score'
  | 'headline-lg'
  | 'headline-md'
  | 'title-sm'
  | 'body-md'
  | 'body-sm'
  | 'caption'
  | 'micro-label';
export type TextWeight = 'regular' | 'medium' | 'semibold' | 'bold';
export type TextTone = 'default' | 'muted' | 'primary' | 'inverse' | 'error' | 'amber' | 'none';

// Full class strings (static) so Tailwind can see them.
const SIZE: Record<TextVariant, string> = {
  'display-score': 'text-display-score',
  'headline-lg': 'text-headline-lg',
  'headline-md': 'text-headline-md',
  'title-sm': 'text-title-sm',
  'body-md': 'text-body-md',
  'body-sm': 'text-body-sm',
  caption: 'text-caption',
  'micro-label': 'text-micro-label',
};
const DEFAULT_WEIGHT: Record<TextVariant, TextWeight> = {
  'display-score': 'bold',
  'headline-lg': 'bold',
  'headline-md': 'semibold',
  'title-sm': 'semibold',
  'body-md': 'regular',
  'body-sm': 'regular',
  caption: 'medium',
  'micro-label': 'semibold',
};
const FAMILY: Record<TextWeight, string> = {
  regular: 'font-inter-regular',
  medium: 'font-inter-medium',
  semibold: 'font-inter-semibold',
  bold: 'font-inter-bold',
};
const TONE: Record<TextTone, string> = {
  default: 'text-on-surface',
  muted: 'text-on-surface-variant',
  primary: 'text-primary',
  inverse: 'text-on-primary',
  error: 'text-error',
  amber: 'text-[#B45309]',
  none: '',
};

export type TextProps = RNTextProps & {
  variant?: TextVariant;
  weight?: TextWeight;
  tone?: TextTone;
  uppercase?: boolean;
  className?: string;
};

/** Always uses tabular numerals (DESIGN.md) so scores never shift layout. */
export function Text({
  variant = 'body-md',
  weight,
  tone = 'default',
  uppercase,
  className,
  style,
  ...rest
}: TextProps) {
  return (
    <RNText
      {...rest}
      className={cn(
        SIZE[variant],
        FAMILY[weight ?? DEFAULT_WEIGHT[variant]],
        TONE[tone],
        uppercase && 'uppercase',
        className,
      )}
      style={[{ fontVariant: ['tabular-nums'] }, style]}
    />
  );
}
```

### M3.2 `Icon.tsx`

```tsx
import { createIconSet } from '@expo/vector-icons';
import glyphMap from '@/theme/iconGlyphs.json';

export type IconName = keyof typeof glyphMap;
const MaterialSymbol = createIconSet(glyphMap, 'MaterialSymbolsOutlined');

type Props = { name: IconName; size?: number; color?: string; className?: string };

export function Icon({ name, size = 24, color = '#0b1c30' }: Props) {
  return <MaterialSymbol name={name} size={size} color={color} />;
}
```

> Note: `Icon` takes `color` as a hex (use `colors['on-surface-variant']` from `@/theme/colors`). The font is loaded in the root layout (M4).

### M3.3 `Card.tsx`

```tsx
import { View, type ViewProps } from 'react-native';
import { cn } from '@/lib/cn';
import { shadow } from '@/theme/shadows';

type Props = ViewProps & { level?: 1 | 2 | 3; className?: string };
const LEVEL = { 1: shadow.l1, 2: shadow.l2, 3: shadow.l3 } as const;

/** DESIGN.md Level 1–3 surface. Compose screens may override radius/padding via className ONLY where Stitch does. */
export function Card({ level = 1, className, style, ...rest }: Props) {
  return (
    <View
      {...rest}
      className={cn('rounded-2xl border border-[#E8EBEF] bg-surface-container-lowest', className)}
      style={[LEVEL[level], style]}
    />
  );
}
```

### M3.4 `Button.tsx`

```tsx
import { ActivityIndicator, Pressable, View, type PressableProps } from 'react-native';
import { cn } from '@/lib/cn';
import { colors } from '@/theme/colors';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Props = Omit<PressableProps, 'children'> & {
  label: string;
  variant?: Variant;
  icon?: IconName;
  loading?: boolean;
  full?: boolean;
  className?: string;
};

const WRAP: Record<Variant, string> = {
  primary: 'bg-primary',
  secondary: 'bg-surface-container-low',
  danger: 'bg-error',
  ghost: 'bg-transparent',
};
const TEXT_TONE = {
  primary: 'inverse',
  secondary: 'primary',
  danger: 'inverse',
  ghost: 'primary',
} as const;
const ICON_COLOR: Record<Variant, string> = {
  primary: colors['on-primary'],
  secondary: colors.primary,
  danger: colors['on-error'],
  ghost: colors.primary,
};

/** Min height 48 (touch target), radius 12 (DESIGN.md). Compare with Stitch buttons when a screen uses it. */
export function Button({
  label,
  variant = 'primary',
  icon,
  loading,
  full,
  disabled,
  className,
  ...rest
}: Props) {
  const off = disabled || loading;
  return (
    <Pressable
      {...rest}
      disabled={off}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      className={cn(
        'min-h-[48px] flex-row items-center justify-center gap-2 rounded-xl px-5',
        WRAP[variant],
        full && 'w-full',
        off && 'opacity-50',
        className,
      )}
    >
      {loading ? (
        <ActivityIndicator color={ICON_COLOR[variant]} />
      ) : icon ? (
        <Icon name={icon} size={20} color={ICON_COLOR[variant]} />
      ) : (
        <View />
      )}
      <Text variant="title-sm" tone={TEXT_TONE[variant]}>
        {label}
      </Text>
    </Pressable>
  );
}
```

(Pressed-state feedback: wrap with a `style={({pressed}) => ({ opacity: pressed ? 0.85 : 1 })}` only if Stitch shows one; otherwise leave as is.)

### M3.5 `PulseDot.tsx`

```tsx
import { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

/** Equivalent of Tailwind `animate-pulse` (opacity 1 → .5 → 1, 2 s). */
export function PulseDot({ color, size = 8 }: { color: string; size?: number }) {
  const o = useSharedValue(1);
  useEffect(() => {
    const ease = Easing.bezier(0.4, 0, 0.6, 1);
    o.value = withRepeat(
      withSequence(
        withTiming(0.5, { duration: 1000, easing: ease }),
        withTiming(1, { duration: 1000, easing: ease }),
      ),
      -1,
      false,
    );
  }, [o]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View
      style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }, style]}
    />
  );
}
```

### M3.6 `SyncPill.tsx` (matches the Stitch header pill: `px-2.5 py-1 rounded-full bg-surface-container-low`, 8 px dot, micro-label uppercase)

```tsx
import { View } from 'react-native';
import { colors } from '@/theme/colors';
import { PulseDot } from './PulseDot';
import { Text } from './Text';

export type SyncStatus = 'synced' | 'syncing' | 'offline';
const DOT: Record<SyncStatus, string> = {
  synced: colors['primary-container'],
  syncing: colors['secondary-container'],
  offline: colors.outline,
};
const LABEL: Record<SyncStatus, string> = {
  synced: 'Synced',
  syncing: 'Syncing',
  offline: 'Offline',
};

export function SyncPill({ status, label }: { status: SyncStatus; label?: string }) {
  return (
    <View
      className="flex-row items-center gap-1.5 rounded-full bg-surface-container-low px-2.5 py-1"
      style={{ boxShadow: '0 1px 4px rgba(0, 0, 0, 0.03)' }}
    >
      <PulseDot color={DOT[status]} />
      <Text variant="micro-label" uppercase className="tracking-wide">
        {label ?? LABEL[status]}
      </Text>
    </View>
  );
}
```

### M3.7 `StatusPill.tsx`

```tsx
import { View } from 'react-native';
import { colors } from '@/theme/colors';
import { PulseDot } from './PulseDot';
import { Text } from './Text';

export type MatchStatus = 'live' | 'completed' | 'upcoming' | 'abandoned';
const WRAP: Record<MatchStatus, string> = {
  live: 'bg-[#FEF3C7]',
  completed: 'bg-primary-fixed',
  upcoming: 'bg-surface-container-low',
  abandoned: 'bg-surface-container',
};
const TEXT: Record<MatchStatus, string> = {
  live: 'LIVE',
  completed: 'Completed',
  upcoming: 'Upcoming',
  abandoned: 'Abandoned',
};

/** The label ALWAYS comes from match.status — a completed match can never show LIVE. Reconcile exact classes with Stitch `code.html` when composing screens. */
export function StatusPill({ status }: { status: MatchStatus }) {
  return (
    <View className={`flex-row items-center gap-1.5 rounded-full px-2.5 py-1 ${WRAP[status]}`}>
      {status === 'live' && <PulseDot color={colors.amber} size={6} />}
      <Text
        variant="micro-label"
        tone={status === 'live' ? 'amber' : status === 'completed' ? 'primary' : 'muted'}
      >
        {TEXT[status]}
      </Text>
    </View>
  );
}
```

### M3.8 Pure helpers for crests/avatars — `src/core/identity.ts` (+ test)

```ts
/** Up to 4 uppercase letters/digits for a crest. */
export function crestText(shortName: string | null | undefined, fallbackName = ''): string {
  const s = (shortName ?? '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (s.length >= 2) return s.slice(0, 4);
  const initials = fallbackName
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  return (initials || 'T').slice(0, 4);
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1] ?? '') : '';
  return ((first[0] ?? '') + (last[0] ?? '')).toUpperCase();
}

/** Black-ish or white text, whichever is readable on the given #RRGGBB background (WCAG relative luminance). */
export function readableTextColor(hex: string): '#FFFFFF' | '#0B1C30' {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4]
    .map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)) as [
    number,
    number,
    number,
  ];
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return L > 0.4 ? '#0B1C30' : '#FFFFFF';
}
```

`src/core/__tests__/identity.test.ts`

```ts
import { crestText, initialsOf, readableTextColor } from '../identity';

test('crestText prefers short name', () => expect(crestText('ncc')).toBe('NCC'));
test('crestText falls back to name initials', () =>
  expect(crestText('', 'Riverside XI')).toBe('RX'));
test('initialsOf', () => {
  expect(initialsOf('Rohit Sharma')).toBe('RS');
  expect(initialsOf('')).toBe('?');
});
test('readableTextColor', () => {
  expect(readableTextColor('#0D5C3A')).toBe('#FFFFFF');
  expect(readableTextColor('#A9F3C5')).toBe('#0B1C30');
});
```

### M3.9 `TeamCrest.tsx`, `PlayerAvatar.tsx`, `RoleBadge.tsx`

```tsx
// TeamCrest.tsx — circle with logo or crest text. Sizes follow DESIGN.md (32–40 px; 48 for profiles).
import { View } from 'react-native';
import { Image } from 'expo-image';
import { crestText, readableTextColor } from '@/core/identity';
import { Text } from './Text';

const SIZE = { sm: 32, md: 40, lg: 48, xl: 72 } as const;
type Props = {
  shortName?: string | null;
  name?: string;
  colour?: string | null;
  logoUrl?: string | null;
  size?: keyof typeof SIZE;
};

export function TeamCrest({ shortName, name, colour, logoUrl, size = 'md' }: Props) {
  const px = SIZE[size];
  const bg = colour ?? '#0D5C3A';
  if (logoUrl) {
    return (
      <Image
        source={{ uri: logoUrl }}
        style={{ width: px, height: px, borderRadius: px / 2 }}
        contentFit="cover"
      />
    );
  }
  return (
    <View
      style={{ width: px, height: px, borderRadius: px / 2, backgroundColor: bg }}
      className="items-center justify-center"
    >
      <Text
        variant={px >= 48 ? 'title-sm' : 'micro-label'}
        weight="bold"
        tone="none"
        style={{ color: readableTextColor(bg) }}
      >
        {crestText(shortName, name)}
      </Text>
    </View>
  );
}
```

```tsx
// RoleBadge.tsx — DESIGN.md: 16 px high, uppercase micro-label, dark ink background
import { View } from 'react-native';
import { Text } from './Text';

export type PlayerRole = 'BAT' | 'BOWL' | 'AR' | 'WK';
export function RoleBadge({ role }: { role: PlayerRole }) {
  return (
    <View className="h-4 items-center justify-center rounded-full bg-brand-ink px-1.5">
      <Text variant="micro-label" tone="inverse" style={{ fontSize: 9, lineHeight: 12 }}>
        {role}
      </Text>
    </View>
  );
}
```

```tsx
// PlayerAvatar.tsx — 40 px avatar, optional overlapping role badge (bottom-right)
import { View } from 'react-native';
import { Image } from 'expo-image';
import { initialsOf } from '@/core/identity';
import { RoleBadge, type PlayerRole } from './RoleBadge';
import { Text } from './Text';

type Props = { name: string; photoUrl?: string | null; role?: PlayerRole; size?: number };
export function PlayerAvatar({ name, photoUrl, role, size = 40 }: Props) {
  return (
    <View style={{ width: size, height: size }}>
      {photoUrl ? (
        <Image
          source={{ uri: photoUrl }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          contentFit="cover"
        />
      ) : (
        <View
          style={{ width: size, height: size, borderRadius: size / 2 }}
          className="items-center justify-center bg-surface-container"
        >
          <Text variant="caption" tone="muted" weight="semibold">
            {initialsOf(name)}
          </Text>
        </View>
      )}
      {role && (
        <View className="absolute -bottom-1 -right-1">
          <RoleBadge role={role} />
        </View>
      )}
    </View>
  );
}
```

### M3.10 `SegmentedTabs.tsx`, `Skeleton.tsx`, `EmptyState.tsx`, `AppBottomSheet.tsx`

```tsx
// SegmentedTabs.tsx — pill track with a white active segment (Stitch scorecard tabs). Verify spacing against code.html when used.
import { Pressable, View } from 'react-native';
import { shadow } from '@/theme/shadows';
import { Text } from './Text';

type Props<T extends string> = {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
};
export function SegmentedTabs<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <View className="flex-row rounded-xl bg-surface-container-low p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            className={`min-h-[40px] flex-1 items-center justify-center rounded-lg ${active ? 'bg-surface-container-lowest' : ''}`}
            style={active ? shadow.l1 : undefined}
          >
            <Text
              variant="body-sm"
              weight={active ? 'semibold' : 'medium'}
              tone={active ? 'primary' : 'muted'}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
```

```tsx
// Skeleton.tsx
import { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

export function Skeleton({
  width = '100%',
  height = 16,
  radius = 8,
}: {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
}) {
  const o = useSharedValue(0.5);
  useEffect(() => {
    o.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
  }, [o]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius, backgroundColor: '#E5EEFF' }, style]}
    />
  );
}
```

```tsx
// EmptyState.tsx
import { View } from 'react-native';
import { colors } from '@/theme/colors';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

type Props = {
  icon: IconName;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
};
export function EmptyState({ icon, title, body, actionLabel, onAction }: Props) {
  return (
    <View className="items-center gap-3 px-margin py-space-xl">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-surface-container-low">
        <Icon name={icon} size={32} color={colors.outline} />
      </View>
      <Text variant="title-sm" className="text-center">
        {title}
      </Text>
      {body ? (
        <Text variant="body-sm" tone="muted" className="text-center">
          {body}
        </Text>
      ) : null}
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} /> : null}
    </View>
  );
}
```

```tsx
// AppBottomSheet.tsx — thin wrapper over @gorhom/bottom-sheet (requires BottomSheetModalProvider in the root layout)
import { forwardRef, useCallback } from 'react';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';

type Props = { children: React.ReactNode; snapPoints?: (string | number)[] };
export const AppBottomSheet = forwardRef<BottomSheetModal, Props>(function AppBottomSheet(
  { children, snapPoints },
  ref,
) {
  const backdrop = useCallback(
    (p: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...p} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" />
    ),
    [],
  );
  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      enableDynamicSizing={!snapPoints}
      backdropComponent={backdrop}
      backgroundStyle={{ borderRadius: 24 }}
      handleIndicatorStyle={{ backgroundColor: '#D0D5DD' }}
    >
      <BottomSheetView style={{ padding: 16, paddingBottom: 32 }}>{children}</BottomSheetView>
    </BottomSheetModal>
  );
});
```

`src/components/ui/index.ts` re-exports all of the above.

**Acceptance (M3):** a temporary dev route `app/dev/kit.tsx` shows every component (delete it before M11 or gate it behind `__DEV__`); unit tests for `core/identity` pass; no hard-coded colours except those quoted from Stitch/DESIGN.md in this plan; commit `feat(M3): UI kit`.

---

## M4 — Navigation shell

### M4.1 Final `app/_layout.tsx`

```tsx
import '../global.css';
import 'react-native-url-polyfill/auto';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { db } from '@/db/client';
import migrations from '../drizzle/migrations';
import { useAuthStore } from '@/features/auth/authStore';
import { SyncProvider } from '@/sync/SyncProvider';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    MaterialSymbolsOutlined: require('../assets/fonts/MaterialSymbolsOutlined.ttf'),
  });
  const { success: dbReady, error: dbError } = useMigrations(db, migrations);
  const init = useAuthStore((s) => s.init);
  const initialized = useAuthStore((s) => s.initialized);
  const session = useAuthStore((s) => s.session);

  useEffect(() => init(), [init]); // init returns an unsubscribe function

  const ready = fontsLoaded && dbReady && initialized;
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (dbError) throw dbError;
  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <BottomSheetModalProvider>
          <StatusBar style="dark" />
          <SyncProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Protected guard={!!session}>
                <Stack.Screen name="(app)" />
              </Stack.Protected>
              <Stack.Protected guard={!session}>
                <Stack.Screen name="(auth)" />
              </Stack.Protected>
            </Stack>
          </SyncProvider>
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
```

(This file compiles only after M5–M7 create the imported modules. In M4 temporarily stub `useAuthStore`, `db`, `migrations`, `SyncProvider` exactly as specified in their milestones, or build M4 after M7; the agent may reorder **M4 after M7** if it prefers — record that in the task list. Nothing else may be reordered.)

### M4.2 Route groups

- `app/(auth)/_layout.tsx`: `export default function AuthLayout() { return <Stack screenOptions={{ headerShown: false }} />; }` (import `Stack` from `expo-router`).
- `app/(app)/_layout.tsx`: same `Stack`, headerShown false.
- `app/(app)/(tabs)/_layout.tsx`:

```tsx
import { Tabs } from 'expo-router';
import { AppTabBar } from '@/components/nav/AppTabBar';

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <AppTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="matches" options={{ title: 'Matches' }} />
      <Tabs.Screen name="teams" options={{ title: 'Teams' }} />
      <Tabs.Screen name="stats" options={{ title: 'Stats' }} />
    </Tabs>
  );
}
```

- `matches.tsx` and `stats.tsx`: TEMP-UI placeholder using `EmptyState` ("Coming in a later phase"), flagged in `docs/TEMP_SCREENS.md`. (`teams.tsx` is built in M8, `index.tsx` in M9.)

### M4.3 `src/components/nav/AppTabBar.tsx` — Stitch bottom nav

The Stitch markup is: container `fixed bottom-0 pb-safe bg-surface-container-lowest/95 shadow-[0_-2px_12px_rgba(0,0,0,0.04)]`; row `flex justify-around items-center h-16 px-space-xs`; item `flex-col items-center justify-center min-w-[48px] min-h-[48px] px-3 py-1 rounded-lg gap-0.5`; active `text-primary font-semibold`, inactive `text-on-surface-variant`; icon 24 px; label `font-caption text-caption`. Icons: Home = `sports_cricket`, Matches = `scoreboard`, Teams = `shield`, Stats = `bar_chart`.

```tsx
import { Pressable, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, Text, type IconName } from '@/components/ui';
import { colors } from '@/theme/colors';
import { shadow } from '@/theme/shadows';

const TABS: Record<string, { label: string; icon: IconName }> = {
  index: { label: 'Home', icon: 'sports_cricket' },
  matches: { label: 'Matches', icon: 'scoreboard' },
  teams: { label: 'Teams', icon: 'shield' },
  stats: { label: 'Stats', icon: 'bar_chart' },
};

export function AppTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        { paddingBottom: insets.bottom, backgroundColor: 'rgba(255,255,255,0.95)' },
        shadow.navTop,
      ]}
    >
      <View className="h-16 flex-row items-center justify-around px-space-xs">
        {state.routes.map((route, index) => {
          const cfg = TABS[route.name];
          if (!cfg) return null;
          const focused = state.index === index;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={cfg.label}
              onPress={() => {
                if (!focused) navigation.navigate(route.name);
              }}
              className="min-h-[48px] min-w-[48px] items-center justify-center gap-0.5 rounded-lg px-3 py-1"
            >
              <Icon
                name={cfg.icon}
                size={24}
                color={focused ? colors.primary : colors['on-surface-variant']}
              />
              <Text
                variant="caption"
                weight={focused ? 'semibold' : 'medium'}
                tone={focused ? 'primary' : 'muted'}
                className="text-center leading-tight"
              >
                {cfg.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
```

`@react-navigation/bottom-tabs` ships with Expo Router; if the type import fails, run `npx expo install @react-navigation/bottom-tabs` and record it in `docs/DEVIATIONS.md`.

**Acceptance (M4):** four tabs switch correctly; auth guard redirects logged-out users to `/(auth)/login` and logged-in users to Home; tab bar visually matches the Stitch `home_dashboard` bottom nav (fidelity procedure, section 8); commit `feat(M4): navigation shell`.

---

## M5 — Backend (Supabase)

### M5.1 Setup

```bash
npm i -D supabase
npx supabase init                     # creates supabase/config.toml
```

**Hosted project (default, Q2):** the user creates a project at supabase.com, then:

```bash
npx supabase login
npx supabase link --project-ref <PROJECT_REF>
```

Put the project URL and **anon** key into `.env`. **Never** put the service-role key anywhere in the app or repo.

Auth settings (hosted dashboard → Authentication): enable Email provider; keep "Confirm email" **on** (Q8 default). For local-only Supabase, set `[auth.email] enable_confirmations = false` in `supabase/config.toml`.

### M5.2 Migration `supabase/migrations/0001_core.sql`

```sql
-- ScoreSphere Phase 1 — core schema: profiles, teams, players, team_players (+ RLS, storage)
create extension if not exists pgcrypto;

-- ---------- enums ----------
create type public.user_role     as enum ('admin', 'scorer', 'team_manager', 'player', 'viewer');
create type public.player_role   as enum ('BAT', 'BOWL', 'AR', 'WK');
create type public.batting_style as enum ('right', 'left');

-- ---------- helpers ----------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();   -- server time is authoritative (ADR-10)
  return new;
end $$;

-- ---------- profiles (1:1 with auth.users) ----------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '',
  avatar_url  text,
  phone       text,
  roles       public.user_role[] not null default array['team_manager', 'scorer']::public.user_role[],
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- admin passes every role check
create or replace function public.has_role(r public.user_role) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and (r = any (p.roles) or 'admin' = any (p.roles))
  );
$$;
revoke execute on function public.has_role(public.user_role) from public, anon;
grant  execute on function public.has_role(public.user_role) to authenticated;

-- ---------- teams ----------
create table public.teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 2 and 60),
  short_name  text not null check (short_name ~ '^[A-Za-z0-9]{2,4}$'),
  logo_url    text,
  colour      text check (colour ~ '^#[0-9A-Fa-f]{6}$'),
  location    text,
  description text,
  created_by  uuid not null references public.profiles (id),
  archived_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index teams_updated_at_idx on public.teams (updated_at);

-- ---------- players ----------
create table public.players (
  id                uuid primary key default gen_random_uuid(),
  name              text not null check (char_length(name) between 2 and 80),
  photo_url         text,
  role              public.player_role not null default 'BAT',
  batting_style     public.batting_style,
  bowling_style     text,
  date_of_birth     date,
  linked_profile_id uuid unique references public.profiles (id) on delete set null,
  created_by        uuid not null references public.profiles (id),
  archived_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index players_updated_at_idx on public.players (updated_at);

-- ---------- team_players (squads) ----------
create table public.team_players (
  team_id         uuid not null references public.teams (id)   on delete cascade,
  player_id       uuid not null references public.players (id) on delete cascade,
  jersey_no       smallint check (jersey_no between 0 and 999),
  is_captain      boolean not null default false,
  is_vice_captain boolean not null default false,
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  primary key (team_id, player_id),
  constraint captain_not_vice check (not (is_captain and is_vice_captain))
);
create unique index one_captain_per_team on public.team_players (team_id) where is_captain and active;
create unique index one_vice_per_team    on public.team_players (team_id) where is_vice_captain and active;
create index team_players_updated_at_idx on public.team_players (updated_at);

-- ---------- updated_at triggers ----------
create trigger trg_profiles_updated     before insert or update on public.profiles     for each row execute function public.set_updated_at();
create trigger trg_teams_updated        before insert or update on public.teams        for each row execute function public.set_updated_at();
create trigger trg_players_updated      before insert or update on public.players      for each row execute function public.set_updated_at();
create trigger trg_team_players_updated before insert or update on public.team_players for each row execute function public.set_updated_at();

-- ---------- Row Level Security ----------
alter table public.profiles     enable row level security;
alter table public.teams        enable row level security;
alter table public.players      enable row level security;
alter table public.team_players enable row level security;

-- profiles: everyone signed in can read names/avatars; users edit only their own non-role columns
create policy profiles_read       on public.profiles for select to authenticated using (true);
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
revoke update on public.profiles from authenticated;
grant  update (full_name, avatar_url, phone) on public.profiles to authenticated;

-- teams
create policy teams_read   on public.teams for select to authenticated using (true);
create policy teams_insert on public.teams for insert to authenticated
  with check (public.has_role('team_manager') and (created_by = (select auth.uid()) or public.has_role('admin')));
create policy teams_update on public.teams for update to authenticated
  using      (created_by = (select auth.uid()) or public.has_role('admin'))
  with check (created_by = (select auth.uid()) or public.has_role('admin'));
-- no DELETE policy: teams are archived, never deleted (TEAM-06)

-- players
create policy players_read   on public.players for select to authenticated using (true);
create policy players_insert on public.players for insert to authenticated
  with check ((public.has_role('team_manager') or public.has_role('scorer'))
              and (created_by = (select auth.uid()) or public.has_role('admin')));
create policy players_update on public.players for update to authenticated
  using      (created_by = (select auth.uid()) or linked_profile_id = (select auth.uid()) or public.has_role('admin'))
  with check (created_by = (select auth.uid()) or linked_profile_id = (select auth.uid()) or public.has_role('admin'));

-- team_players: only the team's owner (or admin) manages the squad
create policy team_players_read on public.team_players for select to authenticated using (true);
create policy team_players_write on public.team_players for all to authenticated
  using (exists (select 1 from public.teams t where t.id = team_id
                 and (t.created_by = (select auth.uid()) or public.has_role('admin'))))
  with check (exists (select 1 from public.teams t where t.id = team_id
                      and (t.created_by = (select auth.uid()) or public.has_role('admin'))));

-- ---------- storage (public-read buckets, per-user write folders) ----------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true), ('team-logos', 'team-logos', true), ('player-photos', 'player-photos', true)
on conflict (id) do nothing;

create policy media_read on storage.objects for select
  using (bucket_id in ('avatars', 'team-logos', 'player-photos'));
create policy media_insert on storage.objects for insert to authenticated
  with check (bucket_id in ('avatars', 'team-logos', 'player-photos') and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy media_update on storage.objects for update to authenticated
  using      (bucket_id in ('avatars', 'team-logos', 'player-photos') and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy media_delete on storage.objects for delete to authenticated
  using      (bucket_id in ('avatars', 'team-logos', 'player-photos') and (storage.foldername(name))[1] = (select auth.uid())::text);
```

### M5.3 Apply and generate types

```bash
npx supabase db push                                   # hosted (or `npx supabase db reset` for local)
npx supabase gen types typescript --project-id <PROJECT_REF> > src/lib/database.types.ts
```

Commit `database.types.ts`. If the CLI cannot reach the project, **stop and ask** the user to run the SQL in the Supabase SQL editor and paste confirmation.

### M5.4 Manual RLS verification (record results in `docs/PHASE1_REPORT.md`)

Using two test users A and B (create via the app or dashboard):

1. A creates a team ✅; B updates A's team ❌ (blocked); B reads A's team ✅.
2. A adds a player to A's squad ✅; B adds a player to A's squad ❌.
3. A tries `update profiles set roles = '{admin}'` ❌ (permission denied).
4. Anonymous (no token) `select * from teams` returns nothing / error ✅.
5. A uploads to `team-logos/<A-uid>/x.jpg` ✅; A uploads to `team-logos/<B-uid>/x.jpg` ❌.

**Acceptance (M5):** migration applied; types generated; the five RLS checks behave as listed; commit `feat(M5): supabase schema and RLS`.

---

## M6 — Authentication

### M6.1 `src/lib/secureStorage.ts` (LargeSecureStore: AES key in SecureStore, ciphertext in AsyncStorage)

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import aesjs from 'aes-js';

async function encrypt(key: string, value: string): Promise<string> {
  const k = Crypto.getRandomBytes(32);
  const cipher = new aesjs.ModeOfOperation.ctr(k, new aesjs.Counter(1));
  const encrypted = cipher.encrypt(aesjs.utils.utf8.toBytes(value));
  await SecureStore.setItemAsync(key, aesjs.utils.hex.fromBytes(k));
  return aesjs.utils.hex.fromBytes(encrypted);
}

async function decrypt(key: string, value: string): Promise<string | null> {
  const keyHex = await SecureStore.getItemAsync(key);
  if (!keyHex) return null;
  const cipher = new aesjs.ModeOfOperation.ctr(
    aesjs.utils.hex.toBytes(keyHex),
    new aesjs.Counter(1),
  );
  return aesjs.utils.utf8.fromBytes(cipher.decrypt(aesjs.utils.hex.toBytes(value)));
}

/** Supabase auth storage adapter. Session JSON is larger than SecureStore's limit, so only the key lives in SecureStore. */
export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    const v = await AsyncStorage.getItem(key);
    return v ? decrypt(key, v) : null;
  },
  async setItem(key: string, value: string): Promise<void> {
    await AsyncStorage.setItem(key, await encrypt(key, value));
  },
  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
    await SecureStore.deleteItemAsync(key);
  },
};
```

### M6.2 `src/lib/supabase.ts`

```ts
import 'react-native-url-polyfill/auto';
import { AppState } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import { env } from './env';
import { secureStorage } from './secureStorage';
import type { Database } from './database.types';

export const supabase = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    storage: secureStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Refresh tokens only while the app is in the foreground.
AppState.addEventListener('change', (state) => {
  if (state === 'active') void supabase.auth.startAutoRefresh();
  else void supabase.auth.stopAutoRefresh();
});
```

### M6.3 `src/core/schemas.ts` (auth part — extended in M8)

```ts
import { z } from 'zod';

export const USER_ROLES = ['admin', 'scorer', 'team_manager', 'player', 'viewer'] as const;
export type UserRole = (typeof USER_ROLES)[number];

const email = z.string().trim().toLowerCase().email('Enter a valid email');

export const loginSchema = z.object({ email, password: z.string().min(1, 'Enter your password') });
export type LoginForm = z.infer<typeof loginSchema>;

export const signupSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Enter your name').max(60),
    email,
    password: z.string().min(8, 'Use at least 8 characters'),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    path: ['confirm'],
    message: 'Passwords do not match',
  });
export type SignupForm = z.infer<typeof signupSchema>;

export const forgotSchema = z.object({ email });
export type ForgotForm = z.infer<typeof forgotSchema>;
```

### M6.4 `src/features/auth/authStore.ts`

```ts
import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { clearLocalData } from '@/db/client';

type Result = { error?: string };

type AuthState = {
  session: Session | null;
  initialized: boolean;
  /** Starts listening to auth changes; returns the unsubscribe function. */
  init: () => () => void;
  signIn: (email: string, password: string) => Promise<Result>;
  signUp: (
    fullName: string,
    email: string,
    password: string,
  ) => Promise<Result & { needsConfirmation?: boolean }>;
  sendReset: (email: string) => Promise<Result>;
  signOut: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  initialized: false,

  init: () => {
    void supabase.auth
      .getSession()
      .then(({ data }) => set({ session: data.session, initialized: true }));
    const { data } = supabase.auth.onAuthStateChange((_event, session) =>
      set({ session, initialized: true }),
    );
    return () => data.subscription.unsubscribe();
  },

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? { error: error.message } : {};
  },

  signUp: async (fullName, email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) return { error: error.message };
    return { needsConfirmation: !data.session };
  },

  sendReset: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return error ? { error: error.message } : {};
  },

  signOut: async () => {
    await supabase.auth.signOut({ scope: 'local' }); // local scope works offline
    await clearLocalData(); // SEC-11
    set({ session: null });
  },
}));
```

### M6.5 `src/core/permissions.ts` (+ test)

```ts
import type { UserRole } from './schemas';

export type Action =
  | 'team.create'
  | 'team.edit'
  | 'squad.manage'
  | 'player.create'
  | 'player.edit'
  | 'match.create'
  | 'match.score'
  | 'users.manage';

type Ctx = { userId?: string; ownerId?: string | null; linkedProfileId?: string | null };

const has = (roles: readonly UserRole[], ...wanted: UserRole[]) =>
  wanted.some((r) => roles.includes(r));

/** UI-side mirror of the RLS rules (SRS 11). The database remains the real enforcement. */
export function can(roles: readonly UserRole[], action: Action, ctx: Ctx = {}): boolean {
  if (roles.includes('admin')) return true;
  const owner = !!ctx.userId && ctx.userId === ctx.ownerId;
  switch (action) {
    case 'team.create':
      return has(roles, 'team_manager');
    case 'team.edit':
    case 'squad.manage':
      return has(roles, 'team_manager') && owner;
    case 'player.create':
      return has(roles, 'team_manager', 'scorer');
    case 'player.edit':
      return owner || (!!ctx.userId && ctx.userId === ctx.linkedProfileId);
    case 'match.create':
      return has(roles, 'team_manager', 'scorer');
    case 'match.score':
      return has(roles, 'scorer');
    case 'users.manage':
      return false;
  }
}
```

`src/core/__tests__/permissions.test.ts`

```ts
import { can } from '../permissions';

test('admin can do anything', () => expect(can(['admin'], 'users.manage')).toBe(true));
test('team manager creates teams but edits only own', () => {
  expect(can(['team_manager'], 'team.create')).toBe(true);
  expect(can(['team_manager'], 'team.edit', { userId: 'a', ownerId: 'b' })).toBe(false);
  expect(can(['team_manager'], 'team.edit', { userId: 'a', ownerId: 'a' })).toBe(true);
});
test('viewer cannot create anything', () => {
  expect(can(['viewer'], 'team.create')).toBe(false);
  expect(can(['viewer'], 'player.create')).toBe(false);
});
test('player edits own linked profile', () =>
  expect(can(['player'], 'player.edit', { userId: 'u', ownerId: 'x', linkedProfileId: 'u' })).toBe(
    true,
  ));
```

### M6.6 TEMP-UI auth screens

`src/components/ui/TextField.tsx` and `TempScreen.tsx` are **TEMP-UI** (no Stitch design yet); both start with the comment `// TEMP-UI: replace with Stitch design (LOCK-03)`.

```tsx
// TextField.tsx
import { TextInput, View, type TextInputProps } from 'react-native';
import { colors } from '@/theme/colors';
import { Text } from './Text';

type Props = TextInputProps & { label: string; error?: string };
export function TextField({ label, error, ...rest }: Props) {
  return (
    <View className="gap-1">
      <Text variant="micro-label" tone="muted" uppercase>
        {label}
      </Text>
      <TextInput
        {...rest}
        placeholderTextColor={colors.outline}
        className="min-h-[48px] rounded-xl border border-outline-variant bg-surface-container-lowest px-4 font-inter-regular text-body-md text-on-surface"
      />
      {error ? (
        <Text variant="caption" tone="error">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
```

```tsx
// TempScreen.tsx — safe-area screen with simple title and optional back
import { ScrollView, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from './Icon';
import { Text } from './Text';
import { colors } from '@/theme/colors';

export function TempScreen({
  title,
  back,
  children,
}: {
  title: string;
  back?: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-surface" style={{ paddingTop: insets.top }}>
      <View className="h-16 flex-row items-center gap-2 px-margin">
        {back ? (
          <Pressable
            accessibilityLabel="Back"
            onPress={() => router.back()}
            className="h-11 w-11 items-center justify-center"
          >
            <Icon name="arrow_back" size={24} color={colors['on-surface']} />
          </Pressable>
        ) : null}
        <Text variant="headline-md">{title}</Text>
      </View>
      <ScrollView
        contentContainerClassName="gap-space-md px-margin pb-24"
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </View>
  );
}
```

`app/(auth)/login.tsx`

```tsx
// TEMP-UI: replace with Stitch design (LOCK-03)
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { View } from 'react-native';
import { Button, Text, TextField, TempScreen } from '@/components/ui';
import { loginSchema, type LoginForm } from '@/core/schemas';
import { useAuthStore } from '@/features/auth/authStore';

export default function Login() {
  const signIn = useAuthStore((s) => s.signIn);
  const [formError, setFormError] = useState<string>();
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setFormError(undefined);
    const { error } = await signIn(email, password);
    if (error) setFormError(error);
  });

  return (
    <TempScreen title="Log in">
      <Controller
        control={control}
        name="email"
        render={({ field }) => (
          <TextField
            label="Email"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            error={errors.email?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field }) => (
          <TextField
            label="Password"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            secureTextEntry
            autoComplete="password"
            error={errors.password?.message}
          />
        )}
      />
      {formError ? (
        <Text variant="body-sm" tone="error">
          {formError}
        </Text>
      ) : null}
      <Button label="Log in" onPress={onSubmit} loading={isSubmitting} full />
      <View className="flex-row justify-between">
        <Link href="/(auth)/forgot-password">
          <Text variant="body-sm" tone="primary" weight="semibold">
            Forgot password?
          </Text>
        </Link>
        <Link href="/(auth)/signup">
          <Text variant="body-sm" tone="primary" weight="semibold">
            Create account
          </Text>
        </Link>
      </View>
    </TempScreen>
  );
}
```

`signup.tsx`: same pattern with fields `fullName`, `email`, `password`, `confirm`, schema `signupSchema`, action `signUp(fullName, email, password)`; when `needsConfirmation` is true show the message "Check your email to confirm your account, then log in." instead of navigating.
`forgot-password.tsx`: one `email` field, `forgotSchema`, `sendReset`; on success show "If that email exists, a reset link was sent."

Export `TextField` and `TempScreen` from `src/components/ui/index.ts`.

**Acceptance (M6):** sign up (confirm email on hosted), log in, kill and reopen the app → still signed in (also in airplane mode); log out → returns to login; wrong password shows an error; unit tests pass; commit `feat(M6): authentication`.

---

## M7 — Local database, repositories, sync

### M7.1 Drizzle config and client

`drizzle.config.ts`

```ts
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  driver: 'expo',
} satisfies Config;
```

`src/db/schema.ts` (use **relative** type imports — drizzle-kit does not resolve `@/`)

```ts
import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import type { UserRole } from '../core/schemas';

export const profile = sqliteTable('profile', {
  id: text('id').primaryKey(),
  fullName: text('full_name').notNull().default(''),
  avatarUrl: text('avatar_url'),
  phone: text('phone'),
  roles: text('roles', { mode: 'json' }).$type<UserRole[]>().notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const teams = sqliteTable('teams', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  shortName: text('short_name').notNull(),
  logoUrl: text('logo_url'),
  colour: text('colour'),
  location: text('location'),
  description: text('description'),
  createdBy: text('created_by').notNull(),
  archivedAt: text('archived_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const players = sqliteTable('players', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  photoUrl: text('photo_url'),
  role: text('role', { enum: ['BAT', 'BOWL', 'AR', 'WK'] })
    .notNull()
    .default('BAT'),
  battingStyle: text('batting_style', { enum: ['right', 'left'] }),
  bowlingStyle: text('bowling_style'),
  dateOfBirth: text('date_of_birth'),
  linkedProfileId: text('linked_profile_id'),
  createdBy: text('created_by').notNull(),
  archivedAt: text('archived_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const teamPlayers = sqliteTable(
  'team_players',
  {
    teamId: text('team_id').notNull(),
    playerId: text('player_id').notNull(),
    jerseyNo: integer('jersey_no'),
    isCaptain: integer('is_captain', { mode: 'boolean' }).notNull().default(false),
    isViceCaptain: integer('is_vice_captain', { mode: 'boolean' }).notNull().default(false),
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [primaryKey({ columns: [t.teamId, t.playerId] })],
);

/** Pending changes to push to Supabase (ADR-09). One row per local write, pushed in order. */
export const syncOutbox = sqliteTable('sync_outbox', {
  id: text('id').primaryKey(),
  entity: text('entity').notNull(), // 'teams' | 'players' | 'team_players'
  entityKey: text('entity_key').notNull(), // id, or "teamId:playerId"
  payload: text('payload').notNull(), // JSON, server column names
  createdAt: text('created_at').notNull(),
  attempts: integer('attempts').notNull().default(0),
  lastError: text('last_error'),
});

export const syncState = sqliteTable('sync_state', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});
```

Generate the migration: `npm run db:generate` → commit the `drizzle/` folder (including `migrations.js`).

`src/db/client.ts`

```ts
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import * as schema from './schema';

const sqlite = openDatabaseSync('scoresphere.db', { enableChangeListener: true });
export const db = drizzle(sqlite, { schema });

export type Db = typeof db;
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

/** Removes every locally stored row (used on sign-out and when a different user signs in). */
export async function clearLocalData(): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(schema.teamPlayers);
    await tx.delete(schema.players);
    await tx.delete(schema.teams);
    await tx.delete(schema.profile);
    await tx.delete(schema.syncOutbox);
    await tx.delete(schema.syncState);
  });
}
```

### M7.2 Case mapping — `src/core/caseMap.ts` (+ test)

```ts
const toSnake = (s: string) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
const toCamel = (s: string) => s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

export const toServer = (o: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [toSnake(k), v]));

export const fromServer = (o: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [toCamel(k), v]));
```

```ts
// src/core/__tests__/caseMap.test.ts
import { fromServer, toServer } from '../caseMap';

test('round trip', () => {
  const row = { id: '1', shortName: 'NCC', isViceCaptain: false, archivedAt: null };
  expect(toServer(row)).toEqual({
    id: '1',
    short_name: 'NCC',
    is_vice_captain: false,
    archived_at: null,
  });
  expect(fromServer(toServer(row))).toEqual(row);
});
```

### M7.3 Outbox helper — `src/db/outbox.ts`

```ts
import * as Crypto from 'expo-crypto';
import { toServer } from '@/core/caseMap';
import type { Tx } from './client';
import { syncOutbox } from './schema';

export type SyncEntity = 'teams' | 'players' | 'team_players';

/** Call INSIDE the same transaction as the local write. Always pass the FULL row (the server upsert needs every NOT NULL column). */
export async function enqueue(
  tx: Tx,
  entity: SyncEntity,
  entityKey: string,
  row: Record<string, unknown>,
): Promise<void> {
  await tx.insert(syncOutbox).values({
    id: Crypto.randomUUID(),
    entity,
    entityKey,
    payload: JSON.stringify(toServer(row)),
    createdAt: new Date().toISOString(),
    attempts: 0,
  });
}
```

### M7.4 Sync store and service

`src/sync/syncStore.ts`

```ts
import { create } from 'zustand';

export type SyncStatusValue = 'synced' | 'syncing' | 'offline' | 'error';
type State = {
  status: SyncStatusValue;
  pending: number;
  lastSyncedAt: string | null;
  lastError: string | null;
  patch: (p: Partial<Omit<State, 'patch'>>) => void;
};
export const useSyncStore = create<State>((set) => ({
  status: 'synced',
  pending: 0,
  lastSyncedAt: null,
  lastError: null,
  patch: (p) => set(p),
}));
```

`src/sync/syncService.ts` — **the only file allowed to use `any`** (Supabase's typed client cannot express the dynamic table name):

```ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import NetInfo from '@react-native-community/netinfo';
import { asc, count, eq } from 'drizzle-orm';
import { fromServer } from '@/core/caseMap';
import { db } from '@/db/client';
import { players, profile, syncOutbox, syncState, teamPlayers, teams } from '@/db/schema';
import { supabase } from '@/lib/supabase';
import { useSyncStore } from './syncStore';

type Entity = 'teams' | 'players' | 'team_players';
const ENTITIES: Entity[] = ['teams', 'players', 'team_players']; // parent tables first (FK order)
const EPOCH = '1970-01-01T00:00:00.000Z';
const PAGE = 500;

const upsertLocal = async (entity: Entity, row: any): Promise<void> => {
  if (entity === 'teams')
    await db.insert(teams).values(row).onConflictDoUpdate({ target: teams.id, set: row });
  else if (entity === 'players')
    await db.insert(players).values(row).onConflictDoUpdate({ target: players.id, set: row });
  else
    await db
      .insert(teamPlayers)
      .values(row)
      .onConflictDoUpdate({ target: [teamPlayers.teamId, teamPlayers.playerId], set: row });
};
const keyOf = (entity: Entity, row: any): string =>
  entity === 'team_players' ? `${row.teamId}:${row.playerId}` : row.id;
const conflictTarget = (entity: Entity) => (entity === 'team_players' ? 'team_id,player_id' : 'id');

let running = false;
let again = false;
let timer: ReturnType<typeof setTimeout> | undefined;

/** Debounced request, called after every local write. */
export function requestSync(delayMs = 1500): void {
  clearTimeout(timer);
  timer = setTimeout(() => void syncNow(), delayMs);
}

export async function refreshPending(): Promise<void> {
  const [row] = await db.select({ n: count() }).from(syncOutbox);
  useSyncStore.getState().patch({ pending: row?.n ?? 0 });
}

export async function syncNow(): Promise<void> {
  if (running) {
    again = true;
    return;
  }
  running = true;
  const patch = useSyncStore.getState().patch;
  try {
    const net = await NetInfo.fetch();
    if (!net.isConnected || net.isInternetReachable === false) {
      patch({ status: 'offline' });
      return;
    }
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) return;

    patch({ status: 'syncing', lastError: null });
    await push();
    await pull(userId);
    patch({ status: 'synced', lastSyncedAt: new Date().toISOString() });
  } catch (e) {
    patch({ status: 'error', lastError: e instanceof Error ? e.message : String(e) });
  } finally {
    running = false;
    await refreshPending();
    if (again) {
      again = false;
      void syncNow();
    }
  }
}

/** Sends outbox rows in the order they were written. Stops at the first failure so order is preserved. */
async function push(): Promise<void> {
  for (;;) {
    const batch = await db.select().from(syncOutbox).orderBy(asc(syncOutbox.createdAt)).limit(50);
    if (batch.length === 0) return;
    for (const item of batch) {
      const entity = item.entity as Entity;
      const { error } = await (supabase as any)
        .from(entity)
        .upsert(JSON.parse(item.payload), { onConflict: conflictTarget(entity) });
      if (error) {
        await db
          .update(syncOutbox)
          .set({ attempts: item.attempts + 1, lastError: error.message })
          .where(eq(syncOutbox.id, item.id));
        throw new Error(`${entity}: ${error.message}`);
      }
      await db.delete(syncOutbox).where(eq(syncOutbox.id, item.id));
    }
  }
}

async function getCursor(entity: Entity): Promise<string> {
  const [row] = await db
    .select()
    .from(syncState)
    .where(eq(syncState.key, `cursor:${entity}`));
  return row?.value ?? EPOCH;
}
const setCursor = (entity: Entity, value: string) =>
  db
    .insert(syncState)
    .values({ key: `cursor:${entity}`, value })
    .onConflictDoUpdate({ target: syncState.key, set: { value } });

async function pending(entity: Entity): Promise<Set<string>> {
  const rows = await db
    .select({ k: syncOutbox.entityKey })
    .from(syncOutbox)
    .where(eq(syncOutbox.entity, entity));
  return new Set(rows.map((r) => r.k));
}

/**
 * Pulls rows changed since the cursor (server `updated_at`). Rows with a pending local change are skipped so they are
 * never overwritten by an older server copy.
 * KNOWN LIMITATION (Phase 3 hardening): a page boundary falling inside a run of identical `updated_at` values could skip rows;
 * replace the cursor with (updated_at, key) when deliveries are added.
 */
async function pull(userId: string): Promise<void> {
  const { data: p } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (p) {
    const row = {
      id: p.id,
      fullName: p.full_name,
      avatarUrl: p.avatar_url,
      phone: p.phone,
      roles: p.roles,
      updatedAt: p.updated_at,
    };
    await db.insert(profile).values(row).onConflictDoUpdate({ target: profile.id, set: row });
  }
  for (const entity of ENTITIES) {
    let cursor = await getCursor(entity);
    for (;;) {
      const { data, error } = await (supabase as any)
        .from(entity)
        .select('*')
        .gt('updated_at', cursor)
        .order('updated_at', { ascending: true })
        .limit(PAGE);
      if (error) throw new Error(`${entity}: ${error.message}`);
      if (!data || data.length === 0) break;
      const skip = await pending(entity);
      for (const raw of data) {
        const row = fromServer(raw);
        if (!skip.has(keyOf(entity, row))) await upsertLocal(entity, row);
      }
      cursor = data[data.length - 1].updated_at as string;
      await setCursor(entity, cursor);
      if (data.length < PAGE) break;
    }
  }
}
```

`src/sync/SyncProvider.tsx`

```tsx
import { useEffect } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { eq } from 'drizzle-orm';
import { clearLocalData, db } from '@/db/client';
import { syncState } from '@/db/schema';
import { useAuthStore } from '@/features/auth/authStore';
import { refreshPending, syncNow } from './syncService';
import { useSyncStore } from './syncStore';

/** If the local database belongs to another account, wipe it before syncing (SEC-11). */
async function ensureOwner(userId: string): Promise<void> {
  const [row] = await db.select().from(syncState).where(eq(syncState.key, 'owner'));
  if (row && row.value !== userId) await clearLocalData();
  await db
    .insert(syncState)
    .values({ key: 'owner', value: userId })
    .onConflictDoUpdate({ target: syncState.key, set: { value: userId } });
}

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const userId = useAuthStore((s) => s.session?.user.id);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void (async () => {
      await ensureOwner(userId);
      await refreshPending();
      if (!cancelled) void syncNow();
    })();
    const appSub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void syncNow();
    });
    const netUnsub = NetInfo.addEventListener((state) => {
      if (state.isConnected) void syncNow();
      else useSyncStore.getState().patch({ status: 'offline' });
    });
    return () => {
      cancelled = true;
      appSub.remove();
      netUnsub();
    };
  }, [userId]);

  return <>{children}</>;
}
```

**Acceptance (M7):** migrations generated and applied at app start; app boots to the login screen; sign in → profile row appears locally; unit tests pass; commit `feat(M7): local database and sync`. (Repositories come in M8.)
</USER_REQUEST>
<ADDITIONAL_METADATA>
The current local time is: 2026-10-03T12:31:24+05:00.

The user's current state is as follows:
Active Document: d:\Desktop\My Apps\SportSphere\Docs\SRS.md (LANGUAGE_MARKDOWN)
Cursor is on line: 1
Other open documents:

- d:\Desktop\My Apps\SportSphere\Docs\SRS.md (LANGUAGE_MARKDOWN)
  </ADDITIONAL_METADATA>
