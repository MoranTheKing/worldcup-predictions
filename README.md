# מונדיאל 2026 — Design System

## Product Context

**תחזיות מונדיאל 2026** is a Hebrew-first, RTL, mobile-first Progressive Web App for predicting FIFA World Cup 2026 match results. Users log in, submit match-by-match score predictions, use Joker boosts for score multipliers, compete in private leagues with friends, and track their standing on leaderboards.

- **Stack:** Next.js 15 (App Router) + Supabase (auth + DB) + Tailwind CSS v4
- **Language:** Hebrew (RTL), direction=`rtl`, logical CSS properties throughout
- **Auth:** Email/password + Google OAuth
- **Data:** api-football.com for live match sync; Supabase for user predictions, leagues, standings

### Sources Provided
- **Codebase:** `worldcup-predictions/` (mounted local folder — Next.js source)
- **Logo:** `assets/wc2026-logo.jpg` — Official FIFA World Cup 2026 logo (trophy graphic + USA | CANADA | MÉXICO wordmark)
- **GitHub:** `MoranTheKing/worldcup-predictions@master` (same codebase, accessible via GitHub API)

---

## Screens / Surfaces

| Screen | Route | Notes |
|---|---|---|
| Login | `/login` | Email + Google OAuth |
| Signup | `/signup` | Email flow + Google |
| Onboarding | `/onboarding` | Post-signup setup (nickname, outright bets) |
| Dashboard / Matches | `/dashboard` | Main tab — match cards grid with prediction inputs |
| Tournament — Groups | `/dashboard/tournament` | 12-group table with standings |
| Tournament — Knockout | `/dashboard/tournament` | Bracket tree (32→Final) |
| Leagues | `/dashboard/leagues` | Create/join private leagues |
| Profile | `/dashboard/profile` | Nickname edit, jokers display, outright bet pickers |

---

## CONTENT FUNDAMENTALS

### Language & Tone
- **Language:** Hebrew (עברית) — all UI copy is in Hebrew; only brand terms like "Predictions" and team names may appear in Latin
- **Voice:** Energetic, gamified, sport-fan enthusiasm. Short punchy phrases. Uses football slang naturally.
- **Casing:** Title case is NOT used in Hebrew (language-inherent). Sentence starts with capital first letter of first word only.
- **Emoji:** Used selectively for gamification signals only — `🔥` (hot streak ≥3), `🐢` (cold streak ≤-5), `🏆` (winner/trophy), `⚽` (branding), `➕`/`🔑` (action buttons in Leagues). Not used decoratively in forms or body text.
- **Numbers:** Arabic numerals throughout (standard in Hebrew UI)
- **Tone examples:**
  - "לוח המשחקים של מונדיאל 2026" (neutral, factual)
  - "ג׳וקר = ×3 על תוצאה מדויקת" (gamified, punchy)
  - "התחרה מול חברים בליגות פרטיות" (social, competitive)
  - "בדוק את האימייל שלך" (friendly, direct)
- **I/You:** Second person "אתה/את" implied; UI uses direct imperative ("בחר", "הזן", "שמור") without pronoun
- **Error messages:** Short, specific, non-technical: "אימייל או סיסמה שגויים", "הכינוי הזה תפוס, בחר אחר"

### Key Terms Glossary
| Hebrew | English | Context |
|---|---|---|
| ניחוש / ניחושים | Prediction/s | Core mechanic |
| ג׳וקר | Joker | Score multiplier boost (×3) |
| רצף | Streak | Consecutive correct/wrong predictions |
| מלך השערים | Top Scorer | Golden Boot |
| בית | Group | Tournament group (Beit = house) |
| נוקאאוט | Knockout | Bracket stage |
| שלב הבתים | Group Stage | |
| ליגה / ליגות | League/s | Private friend leagues |

---

## VISUAL FOUNDATIONS

### Color System
Palette extracted from the official FIFA World Cup 2026 logo:

#### Base Palette (Dark Mode — Default)
| Token | Value | Usage |
|---|---|---|
| `--wc-bg` | `#060D1A` | Page background (ultra-dark navy) |
| `--wc-surface` | `#0D1B2E` | Card / panel background |
| `--wc-surface-raised` | `#142338` | Elevated surfaces, dropdowns |
| `--wc-border` | `#1E2F4A` | Subtle borders |
| `--wc-border-accent` | `#2A4060` | Active/focus borders |

#### Brand Colors (from Logo)
| Token | Value | Source |
|---|---|---|
| `--wc-navy` | `#003087` | Trophy blue (FIFA blue) |
| `--wc-red` | `#C8102E` | USA section of logo, danger |
| `--wc-green` | `#009A3D` | Canada section of logo, success/qualify |
| `--wc-white` | `#F0F4FF` | High-contrast text/icons |

#### Accent / Gamification Colors
| Token | Value | Usage |
|---|---|---|
| `--wc-neon-green` | `#00E65A` | Active nav, CTAs, confirmed predictions |
| `--wc-neon-green-glow` | `rgba(0,230,90,0.15)` | Glow shadow on neon elements |
| `--wc-purple` | `#7C3AED` | Joker boost, premium gamification elements |
| `--wc-gold` | `#F5C518` | Trophy, winner highlights, final match |
| `--wc-fire` | `#FF4D1C` | Fire streak badge (🔥), hot states |

#### Text
| Token | Value | Usage |
|---|---|---|
| `--wc-fg1` | `#EEF2FF` | Primary text |
| `--wc-fg2` | `#8899BB` | Secondary/muted text |
| `--wc-fg3` | `#4A6080` | Placeholder, disabled |

### Typography
- **Display font:** `Secular One` (Google Fonts) — Bold, geometric, excellent Hebrew RTL support. Used for major headings, score displays, group labels, gamification titles. Conveys the energetic World Cup feel.
- **Functional font:** `Heebo` (Google Fonts) — Clean, highly readable Hebrew font. Used for ALL functional UI: forms, inputs, body text, nav labels, descriptions, error messages.
- **Font stacks:**
  - Display: `'Secular One', 'Heebo', sans-serif`
  - Body: `'Heebo', Arial, sans-serif`
- **Scale:** 11px (micro labels) → 13px (body small) → 15px (body) → 20px (section heads) → 28px (page titles) → 40px+ (hero/score display)
- **Weight:** Heebo 400 (body), 600 (semibold), 700 (bold); Secular One is inherently 400 (display-weight)

### Backgrounds & Surfaces
- **Default:** Ultra-dark navy `#060D1A` — feels like night stadium lighting
- **Cards:** `#0D1B2E` with `1px solid #1E2F4A` border — glassmorphism variant uses `backdrop-blur-md` + `rgba(13,27,46,0.7)`
- **Active card highlight:** subtle neon green left border (4px) or neon green glow box-shadow
- **NO pure black (#000)** — always keep navy undertone for warmth

### Spacing & Layout
- Mobile-first; design width: 390px (iPhone 14)
- Border radius: `1rem` (cards), `0.75rem` (inputs/buttons), `9999px` (pills/badges)
- Card padding: `1.25rem` (20px) on mobile
- Section spacing: `1.5rem` (24px) between major sections
- Bottom nav height: `64px` with `env(safe-area-inset-bottom)` padding

### Borders & Shadows
- Cards: `border: 1px solid var(--wc-border)` + optional `box-shadow: 0 1px 3px rgba(0,0,0,0.4)`
- Neon active state: `box-shadow: 0 0 12px var(--wc-neon-green-glow)` + `border-color: var(--wc-neon-green)`
- Purple joker glow: `box-shadow: 0 0 16px rgba(124,58,237,0.3)`
- Inner separator: `border-color: #1E2F4A`

### Glassmorphism (Bottom Nav, Modals)
- `background: rgba(6,13,26,0.85)`
- `backdrop-filter: blur(16px) saturate(180%)`
- `border-top: 1px solid rgba(255,255,255,0.06)`

### Animation & Motion
- Transitions: `150ms ease` for color/opacity changes, `200ms ease-out` for transforms
- Hover states: slightly lighter surface (`--wc-surface-raised`), no dramatic color changes for functional elements
- Active/press: `scale(0.97)` for tappable cards
- Neon glow pulse: `animation: glow-pulse 2s ease-in-out infinite` for active joker
- No bouncy spring animations — athletic confidence, not playful

### Hover & Press States
- Buttons: `opacity: 0.85` on hover, `scale(0.97)` on press
- Nav items: surface highlight + neon text/icon color
- Cards: lift effect (`translateY(-1px)` + slightly stronger shadow)
- Links: underline offset, neon green color

### Iconography (see ICONOGRAPHY below)
- Emoji for gamification signals only
- No custom SVG icon system currently — app uses emoji
- Google Material or Phosphor icons recommended for future expansion

### Corner Radii
- Cards: `16px` (`rounded-2xl`)
- Inputs/Buttons: `12px` (`rounded-xl`)
- Badges/Pills: `9999px` (`rounded-full`)
- Group table header: `0` (flush with card top)

### Group Table Color Coding
- Rank 1: Neon green left border + subtle green tint bg
- Rank 2: Lighter green left border + very subtle tint
- Rank 3: Amber/orange left border + amber tint (potential qualifier)
- Rank 4: Transparent border (eliminated)

---

## ICONOGRAPHY

The app currently uses **emoji as icons** exclusively:
- `⚽` — app branding, matches
- `🏆` — tournament, winner
- `🏅` — leagues
- `👤` — profile
- `🗓️` — matches/calendar
- `🔥` — hot streak (≥3 consecutive correct)
- `🐢` — cold streak (≤-5)
- `➕` — create action
- `🔑` — join action
- `📧` — email confirmation
- `✏️` — edit action
- `🔒` — locked state

**No SVG icon library is used.** The only SVG is:
- `public/avatar-player.svg` — generic player silhouette avatar
- `public/globe.svg`, `public/next.svg` etc. — Next.js boilerplate (not used in UI)

**Recommendation:** Adopt [Phosphor Icons](https://phosphoricons.com/) — excellent RTL-neutral stroke icons that work well in dark UIs. Or keep emoji for the gamified personality of the product.

---

## File Index

```

## Tournament Engine Snapshot

As of April 21, 2026, the live tournament implementation also includes:

- Deterministic group-position locking and a terminal Best 3rd Place lock in `lib/utils/standings.ts`
- Official FIFA 2026 Annex C best-3rd-place injection into Round of 32 slots through `syncTournamentState()`
- A placeholder-driven knockout tree in `lib/tournament/knockout-tree.ts`, used by the Tournament page and the Matches board
- A split vertical bracket layout that keeps knockout cards readable on mobile by letting the top half flow down, the bottom half flow up, and both meet at a centered finals block
- Visual connector branches between paired matches and their next-round card, so progression is readable without helper text
- An intentionally non-sequential render order for knockout rows, matching the official FIFA crossing graph so the branches stay untangled
- Compact knockout cards (`max-w-[220px]`) and centered grids for the early rounds
- A nested `flex-nowrap` tree shell with horizontal scrolling, so responsive wrapping never breaks connector alignment
- A center finals block that highlights `הגמר` in gold and `מקום 3` in bronze
- Global elimination persistence in `teams.is_eliminated`, covering eliminated 4th-place teams, locked bottom-4 third-place teams, and knockout losers with the semi-final / 3rd-place exception
- Dev Tools flows where `Finish All Matches` and per-match `RESET` save immediately and trigger tournament sync without needing an extra manual save step
- Neutral Best 3rd Place table rendering until qualification/elimination is locked, with the Group column removed from that table
- Live-reactive Best 3rd Place ordering driven by the current 3rd-place team in each group, while badges/colors remain locked-state only

Operational source files:

- `lib/tournament/knockout-progression.ts`
- `lib/tournament/elimination.ts`
- `app/dashboard/tournament/TournamentClient.tsx`
- `app/dashboard/matches/MatchesClient.tsx`
- `TOURNAMENT_RULES.md`
- `HANDOFF_2026-04-21.md`
README.md                    — This file
SKILL.md                     — Agent skill definition
colors_and_type.css          — CSS custom properties (colors + typography)
assets/
  wc2026-logo.jpg            — Official FIFA World Cup 2026 logo
preview/
  colors-brand.html          — Brand color swatches
  colors-semantic.html       — Semantic / state colors
  colors-gamification.html   — Gamification accent colors
  type-display.html          — Display type specimens (Secular One)
  type-body.html             — Body type specimens (Heebo)
  type-scale.html            — Full type scale
  spacing-tokens.html        — Spacing, radius, shadow tokens
  components-buttons.html    — Button states
  components-cards.html      — Match card, league card variants
  components-nav.html        — Bottom nav + sidebar
  components-badges.html     — Streak badges, joker pill, status tags
  components-inputs.html     — Form inputs + dropdowns
  components-tables.html     — Group standings table
ui_kits/
  app/
    README.md                — UI kit documentation
    index.html               — Interactive mobile prototype (main deliverable)
```
