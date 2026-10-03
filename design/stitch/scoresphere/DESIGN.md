---
name: ScoreSphere
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#404942'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#707971'
  outline-variant: '#bfc9c0'
  surface-tint: '#226b47'
  primary: '#004328'
  on-primary: '#ffffff'
  primary-container: '#0d5c3a'
  on-primary-container: '#8ad2a7'
  inverse-primary: '#8ed6aa'
  secondary: '#855300'
  on-secondary: '#ffffff'
  secondary-container: '#fea619'
  on-secondary-container: '#684000'
  tertiary: '#4a00a4'
  on-tertiary: '#ffffff'
  tertiary-container: '#6519d1'
  on-tertiary-container: '#d0b7ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#a9f3c5'
  primary-fixed-dim: '#8ed6aa'
  on-primary-fixed: '#002111'
  on-primary-fixed-variant: '#005232'
  secondary-fixed: '#ffddb8'
  secondary-fixed-dim: '#ffb95f'
  on-secondary-fixed: '#2a1700'
  on-secondary-fixed-variant: '#653e00'
  tertiary-fixed: '#ebddff'
  tertiary-fixed-dim: '#d3bbff'
  on-tertiary-fixed: '#250059'
  on-tertiary-fixed-variant: '#5b00c5'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-score:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 52px
    letterSpacing: -0.03em
  headline-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.01em
  title-sm:
    fontFamily: Inter
    fontSize: 17px
    fontWeight: '600'
    lineHeight: 22px
  body-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  micro-label:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.5px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system establishes a high-precision, broadcast-grade mobile sports experience tailored for live cricket match centers, comprehensive scorekeeping, and career statistics. The aesthetic blends authoritative editorial journalism with modern tactical utility—delivering instantaneous legibility under intense direct sunlight at the pitch while maintaining the executive polish of an international broadcast production.

The visual direction follows **Corporate / Modern** precision infused with tactile broadcast motifs: crisp white surfaces, structured metadata lines, high-contrast numeric scaling, and deliberate event color coding. Every interaction reflects confidence, structural integrity, and immediate comprehension, ensuring scorers, analysts, and supporters digest ball-by-ball momentum swings effortlessly.

## Colors

The palette is anchored by a pure, clean light environment. The primary surface relies on #FFFFFF punctuated by a subtle structural canvas tier of #F6F7F9 to demarcate contextual regions.

### Key Roles
- **Primary Turf Green (`#0D5C3A`)**: Used for brand authority, key calls to action, primary headers, team tallies, and standard boundary-4 indicators. Pairs with **Vibrant Pitch Green (`#1E8E5A`)** exclusively in linear gradients (`135deg, #0D5C3A 0%, #1E8E5A 100%`) for prominent hero scorecards, match headers, and championship banners.
- **Live Amber (`#F59E0B`)**: Reserved strictly for high-urgency states—pulsing "LIVE" broadcast badges, DRS reviews, inning breaks, and extras.
- **Maximum Purple (`#6D28D9`)**: Distinctive chromatic role dedicated strictly to 6-run boundaries, celebrating batting apex events with premium visual weight.
- **Dismissal Red (`#DC2626`)**: Critical state color strictly reserved for wickets, run-outs, penalty reviews, and match retirements.
- **Neutral Baseline (`#64748B`)**: Structural slate for secondary copy, over timelines, dot-ball metrics, and divider borders (`#E8EBEF`).

Do not dilute the semantic weight of event tokens: red never appears as an aesthetic accent; purple is barred from navigational states.

## Typography

Typography relies uniformly on **Inter** to ensure maximum typographic discipline and complete layout predictability during fast-updating numeric intervals.

All cricket metrics, score rates, over tallies, economy rates, and strike rates require tabular numerals enabled globally across components via:
`font-variant-numeric: tabular-nums; font-feature-settings: 'tnum' 1;`

### Hierarchy Guidelines
- **Score Scale (`display-score`)**: Dedicated strictly to current team aggregate scores (e.g., `284/4`). Must maintain zero layout shift when incrementing.
- **Headlines (`headline-lg`, `headline-md`)**: Reserved for match status headlines, tournament stages, and player profile headers.
- **Body (`body-md`, `body-sm`)**: Commentary feed text, delivery breakdown narratives, and match notes.
- **Micro-labels (`micro-label`)**: Applied strictly in uppercase with 0.5px tracking for table column heads (R, B, 4s, 6s, SR, ECON), player position indicators, and overs counter subtext.

## Layout & Spacing

The layout is built upon an uncompromising **8pt vertical and horizontal rhythm grid** (multiples of 4px and 8px: 4, 8, 12, 16, 24, 32, 48px).

### Grid & Margins
- **Screen Padding**: Fixed at `16px` (`margin`) along the canvas edges on mobile displays, ensuring compact information density without bleeding into bezel safety limits.
- **Card Margins**: Cards sit flush against the 16px screen margin or nest inside segmented vertical stacks separated by `12px` or `16px` (`space-md`).
- **Data Densities**: Cricket tables scale to a compressed 8px vertical row padding to house standard 11-player batting orders within single vertical screen viewports without aggressive pagination.
- **Ergonomics & Touch Targets**: General interactive controls adhere to an ergonomic minimum height of `48px`. On scoring entry views, numeric keypad tap targets expand to `60px` to `64px` in height with full edge-to-edge touch areas to eliminate input error during rapid live scoring.

## Elevation & Depth

Visual hierarchy on white viewports is achieved through a three-layer model combining precise structural outlines and diffuse ambient shadows.

### Elevation Hierarchy
1. **Level 0 (Canvas Base)**: `#F6F7F9` neutral foundation. Background elements, inactive tab tracks, and empty states rest directly here with no shadow.
2. **Level 1 (Default Surface / Cards)**: Pure `#FFFFFF` surface accompanied by a hairline border: `1px solid #E8EBEF`. Elevation is reinforced through an ambient drop shadow: `box-shadow: 0 2px 8px rgba(16, 24, 40, 0.06);`.
3. **Level 2 (Active Cards & Dropdowns)**: Elevated interactive score components, contextual bowler change sheets, and filters: `1px solid #D0D5DD` paired with `box-shadow: 0 8px 16px -4px rgba(16, 24, 40, 0.08), 0 2px 4px -2px rgba(16, 24, 40, 0.04);`.
4. **Level 3 (Sticky Scoring Console & Modals)**: Bottom floating action controls, live scoring bars, and dialogs: `0 20px 24px -4px rgba(16, 24, 40, 0.12), 0 8px 8px -4px rgba(16, 24, 40, 0.04)`.

Flat, heavy outlines without shadows are forbidden on content cards; soft depth separation preserves an elite broadcast tone.

## Shapes

The system enforces a multi-tier corner geometry model calibrated to structural scale:

- **Primary Cards & Modals**: Fixed at `16px` border radius (`rounded-lg` / `rounded-xl` context), creating a soft, polished framing for dense technical data.
- **Buttons & Control Inputs**: Standardized at `12px` border radius to produce tactile, comfortable physical buttons.
- **Over-Summary Ball Bubbles & Team Crests**: `50%` perfect circular radius (`32px` to `40px` diameter).
- **Badges, Chips, Live Indicators & Sync Pills**: Completely rounded full capsules using a `999px` radius.

## Components

### 1. Broadcast Score Banner
- **Container**: White or Green hero gradient background (`135deg, #0D5C3A 0%, #1E8E5A 100%`) with high-contrast text. Incorporates faint cricket pitch crease lines (`rgba(255,255,255,0.08)`) as subtle background texture.
- **Layout**: Dual team display with 40px circular team crests, bold abbreviated initials (e.g., `ENG`, `AUS`), main score in `display-score` (48px Bold), current run rate (CRR) and required run rate (RRR) formatted via `caption` in micro pill badges.

### 2. Over Summary Delivery Bubbles
- **Metrics**: 32x32px circular nodes arranged horizontally with 6px spacing.
- **Dot Ball**: `#F1F5F9` background, `#64748B` label (`•`).
- **One to Three Runs**: `#FFFFFF` background, `1px solid #E2E8F0`, `#0F172A` label.
- **Four (Boundary)**: `#0D5C3A` background, white label (`4`), bold weight.
- **Six (Maximum)**: `#6D28D9` background, white label (`6`), bold weight.
- **Wicket**: `#DC2626` background, white label (`W`), bold weight.
- **Extras (Wd, Nb, B, Lb)**: `#FEF3C7` background, `#B45309` border, `#92400E` label.

### 3. Batting & Bowling Scorecard Tables
- **Grid Specs**: Compact row height (`44px`), borderless interior rows separated solely by `#F1F5F9` horizontal hairlines.
- **Typography Alignment**: Player names and role tags left-aligned. Match stats (`R`, `B`, `4s`, `6s`, `SR`) right-aligned with fixed tabular spacing to avoid jagged columns during live data ingestion.
- **Active Batters**: Indicated with a 3px vertical `#0D5C3A` accent bar anchored to the left card edge and a mini bat glyph alongside the name.

### 4. Player Avatars & Role Badges
- **Avatar**: 40px rounded avatar accompanied by an overlapping bottom-right pill tag.
- **Role Badges**: 16px height, uppercase `micro-label` (BAT, BOWL, AR, WK) styled in `#0F172A` background with white typography or tinted brand green.

### 5. Live Match Badges & Sync Status Pills
- **LIVE Badge**: Full pill (`999px`), `#FEF3C7` background with `#B45309` text, featuring an animated 6px green/amber ping dot.
- **Sync Pill**: Compact status badge in `#F8FAFC` border with a subtle icon indicating socket status (`Live`, `Syncing`, `Offline Cache`).

### 6. Scoring Keypad Matrix
- **Layout**: 3x4 touch matrix positioned at screen bottom.
- **Key Dimensions**: 60px to 64px height, `#FFFFFF` surface with `1px solid #E2E8F0` border and Level 1 elevation.
- **Typography**: Numbers styled in 24px semi-bold tabular figures; secondary modifier keys (Out, Extra, Undo) highlighted in tinted tone surfaces (`#FEF2F2` for Wicket, `#F8FAFC` for Undo).