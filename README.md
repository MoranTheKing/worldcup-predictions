# ׳׳•׳ ׳“׳™׳׳ 2026 ג€” Design System

## Product Context

**׳×׳—׳–׳™׳•׳× ׳׳•׳ ׳“׳™׳׳ 2026** is a Hebrew-first, RTL, mobile-first Progressive Web App for predicting FIFA World Cup 2026 match results. Users log in, submit match-by-match score predictions, use Joker boosts for score multipliers, compete in private leagues with friends, and track their standing on leaderboards.

- **Stack:** Next.js 15 (App Router) + Supabase (auth + DB) + Tailwind CSS v4
- **Language:** Hebrew (RTL), direction=`rtl`, logical CSS properties throughout
- **Auth:** Email/password + Google OAuth
- **Data:** api-football.com for live match sync; Supabase for user predictions, leagues, standings

### Sources Provided
- **Codebase:** `worldcup-predictions/` (mounted local folder ג€” Next.js source)
- **Logo:** `assets/wc2026-logo.jpg` ג€” Official FIFA World Cup 2026 logo (trophy graphic + USA | CANADA | Mֳ‰XICO wordmark)
- **GitHub:** `MoranTheKing/worldcup-predictions@master` (same codebase, accessible via GitHub API)

---

## Screens / Surfaces

| Screen | Route | Notes |
|---|---|---|
| Login | `/login` | Email + Google OAuth |
| Signup | `/signup` | Email flow + Google |
| Onboarding | `/onboarding` | Post-signup setup (nickname, outright bets) |
| Dashboard / Matches | `/dashboard` | Main tab ג€” match cards grid with prediction inputs |
| Tournament ג€” Groups | `/dashboard/tournament` | 12-group table with standings |
| Tournament ג€” Knockout | `/dashboard/tournament` | Bracket tree (32ג†’Final) |
| Leagues | `/dashboard/leagues` | Create/join private leagues |
| Profile | `/dashboard/profile` | Nickname edit, jokers display, outright bet pickers |

---

## CONTENT FUNDAMENTALS

### Language & Tone
- **Language:** Hebrew (׳¢׳‘׳¨׳™׳×) ג€” all UI copy is in Hebrew; only brand terms like "Predictions" and team names may appear in Latin
- **Voice:** Energetic, gamified, sport-fan enthusiasm. Short punchy phrases. Uses football slang naturally.
- **Casing:** Title case is NOT used in Hebrew (language-inherent). Sentence starts with capital first letter of first word only.
- **Emoji:** Used selectively for gamification signals only ג€” `נ”¥` (hot streak ג‰¥3), `נ¢` (cold streak ג‰₪-5), `נ†` (winner/trophy), `ג½` (branding), `ג•`/`נ”‘` (action buttons in Leagues). Not used decoratively in forms or body text.
- **Numbers:** Arabic numerals throughout (standard in Hebrew UI)
- **Tone examples:**
  - "׳׳•׳— ׳”׳׳©׳—׳§׳™׳ ׳©׳ ׳׳•׳ ׳“׳™׳׳ 2026" (neutral, factual)
  - "׳’׳³׳•׳§׳¨ = ֳ—3 ׳¢׳ ׳×׳•׳¦׳׳” ׳׳“׳•׳™׳§׳×" (gamified, punchy)
  - "׳”׳×׳—׳¨׳” ׳׳•׳ ׳—׳‘׳¨׳™׳ ׳‘׳׳™׳’׳•׳× ׳₪׳¨׳˜׳™׳•׳×" (social, competitive)
  - "׳‘׳“׳•׳§ ׳׳× ׳”׳׳™׳׳™׳™׳ ׳©׳׳" (friendly, direct)
- **I/You:** Second person "׳׳×׳”/׳׳×" implied; UI uses direct imperative ("׳‘׳—׳¨", "׳”׳–׳", "׳©׳׳•׳¨") without pronoun
- **Error messages:** Short, specific, non-technical: "׳׳™׳׳™׳™׳ ׳׳• ׳¡׳™׳¡׳׳” ׳©׳’׳•׳™׳™׳", "׳”׳›׳™׳ ׳•׳™ ׳”׳–׳” ׳×׳₪׳•׳¡, ׳‘׳—׳¨ ׳׳—׳¨"

### Key Terms Glossary
| Hebrew | English | Context |
|---|---|---|
| ׳ ׳™׳—׳•׳© / ׳ ׳™׳—׳•׳©׳™׳ | Prediction/s | Core mechanic |
| ׳’׳³׳•׳§׳¨ | Joker | Score multiplier boost (ֳ—3) |
| ׳¨׳¦׳£ | Streak | Consecutive correct/wrong predictions |
| ׳׳׳ ׳”׳©׳¢׳¨׳™׳ | Top Scorer | Golden Boot |
| ׳‘׳™׳× | Group | Tournament group (Beit = house) |
| ׳ ׳•׳§׳׳׳•׳˜ | Knockout | Bracket stage |
| ׳©׳׳‘ ׳”׳‘׳×׳™׳ | Group Stage | |
| ׳׳™׳’׳” / ׳׳™׳’׳•׳× | League/s | Private friend leagues |

---

## VISUAL FOUNDATIONS

### Color System
Palette extracted from the official FIFA World Cup 2026 logo:

#### Base Palette (Dark Mode ג€” Default)
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
| `--wc-fire` | `#FF4D1C` | Fire streak badge (נ”¥), hot states |

#### Text
| Token | Value | Usage |
|---|---|---|
| `--wc-fg1` | `#EEF2FF` | Primary text |
| `--wc-fg2` | `#8899BB` | Secondary/muted text |
| `--wc-fg3` | `#4A6080` | Placeholder, disabled |

### Typography
- **Display font:** `Secular One` (Google Fonts) ג€” Bold, geometric, excellent Hebrew RTL support. Used for major headings, score displays, group labels, gamification titles. Conveys the energetic World Cup feel.
- **Functional font:** `Heebo` (Google Fonts) ג€” Clean, highly readable Hebrew font. Used for ALL functional UI: forms, inputs, body text, nav labels, descriptions, error messages.
- **Font stacks:**
  - Display: `'Secular One', 'Heebo', sans-serif`
  - Body: `'Heebo', Arial, sans-serif`
- **Scale:** 11px (micro labels) ג†’ 13px (body small) ג†’ 15px (body) ג†’ 20px (section heads) ג†’ 28px (page titles) ג†’ 40px+ (hero/score display)
- **Weight:** Heebo 400 (body), 600 (semibold), 700 (bold); Secular One is inherently 400 (display-weight)

### Backgrounds & Surfaces
- **Default:** Ultra-dark navy `#060D1A` ג€” feels like night stadium lighting
- **Cards:** `#0D1B2E` with `1px solid #1E2F4A` border ג€” glassmorphism variant uses `backdrop-blur-md` + `rgba(13,27,46,0.7)`
- **Active card highlight:** subtle neon green left border (4px) or neon green glow box-shadow
- **NO pure black (#000)** ג€” always keep navy undertone for warmth

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
- No bouncy spring animations ג€” athletic confidence, not playful

### Hover & Press States
- Buttons: `opacity: 0.85` on hover, `scale(0.97)` on press
- Nav items: surface highlight + neon text/icon color
- Cards: lift effect (`translateY(-1px)` + slightly stronger shadow)
- Links: underline offset, neon green color

### Iconography (see ICONOGRAPHY below)
- Emoji for gamification signals only
- No custom SVG icon system currently ג€” app uses emoji
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
- `ג½` ג€” app branding, matches
- `נ†` ג€” tournament, winner
- `נ…` ג€” leagues
- `נ‘₪` ג€” profile
- `נ—“ן¸` ג€” matches/calendar
- `נ”¥` ג€” hot streak (ג‰¥3 consecutive correct)
- `נ¢` ג€” cold streak (ג‰₪-5)
- `ג•` ג€” create action
- `נ”‘` ג€” join action
- `נ“§` ג€” email confirmation
- `גן¸` ג€” edit action
- `נ”’` ג€” locked state

**No SVG icon library is used.** The only SVG is:
- `public/avatar-player.svg` ג€” generic player silhouette avatar
- `public/globe.svg`, `public/next.svg` etc. ג€” Next.js boilerplate (not used in UI)

**Recommendation:** Adopt [Phosphor Icons](https://phosphoricons.com/) ג€” excellent RTL-neutral stroke icons that work well in dark UIs. Or keep emoji for the gamified personality of the product.

---

## File Index

```

## Phase 1 Social Layer

As of April 22, 2026, Phase 1 of the social prediction architecture is now wired into the app.

What is live:

- Global Supabase auth is now initialized at the root layout, so one auth state wraps the whole application
- A shared auth provider hydrates `auth.users` plus the app profile snapshot from `profiles`, with a fallback to legacy `users`
- The public navbar outside the dashboard now switches between `Login` and `display_name + Logout`
- The dashboard shell now reads the same global auth state instead of owning a separate auth island
- `proxy.ts` now protects authenticated surfaces such as `/dashboard`, `/dashboard/matches`, `/dashboard/profile`, `/dashboard/leagues`, `/leagues`, `/predictions`, `/onboarding`, and `/dev-tools`
- Public viewing remains available for `/dashboard/tournament`
- `/login` and `/signup` now preserve the requested `next` route so protected-route redirects return users to the page they originally requested

Supabase schema work:

- Safe migration: `supabase/migrations/20260422000010_phase1_social_auth.sql`
- The migration creates or extends:
  `profiles`, `leagues.invite_code`, `league_members`, `predictions`, `tournament_predictions`
- It backfills legacy data where possible:
  `users -> profiles`, `league_participants -> league_members`, `bets -> predictions`, `outright_bets -> tournament_predictions`
- RLS policies are included for all new Phase 1 social tables

Still intentionally out of scope for this phase:

- match scoring logic for prediction points
- prediction entry UI on match cards
- league leaderboards powered by the new prediction tables
- social invite/join UX beyond the schema, auth, and protection groundwork

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
- A center finals block that highlights `׳”׳’׳׳¨` in gold and `׳׳§׳•׳ 3` in bronze
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
README.md                    ג€” This file
SKILL.md                     ג€” Agent skill definition
colors_and_type.css          ג€” CSS custom properties (colors + typography)
assets/
  wc2026-logo.jpg            ג€” Official FIFA World Cup 2026 logo
preview/
  colors-brand.html          ג€” Brand color swatches
  colors-semantic.html       ג€” Semantic / state colors
  colors-gamification.html   ג€” Gamification accent colors
  type-display.html          ג€” Display type specimens (Secular One)
  type-body.html             ג€” Body type specimens (Heebo)
  type-scale.html            ג€” Full type scale
  spacing-tokens.html        ג€” Spacing, radius, shadow tokens
  components-buttons.html    ג€” Button states
  components-cards.html      ג€” Match card, league card variants
  components-nav.html        ג€” Bottom nav + sidebar
  components-badges.html     ג€” Streak badges, joker pill, status tags
  components-inputs.html     ג€” Form inputs + dropdowns
  components-tables.html     ג€” Group standings table
ui_kits/
  app/
    README.md                ג€” UI kit documentation
    index.html               ג€” Interactive mobile prototype (main deliverable)
```


## Phase 2 Predictions Hub

As of April 22, 2026, `/game` is now the protected Predictions Hub for the social game layer.

What changed:

- `proxy.ts` now protects `/game` and all nested `/game/*` routes
- `/game` now defaults to `/game/predictions`
- the old standalone profile flow now redirects into `/game`
- `app/game/layout.tsx` now renders a premium Gamer Card with avatar, display name, total score, and live booster state
- the booster state is derived from real prediction history (`predictions.is_joker_applied` + `matches.stage`), not from legacy counters in `users`
- `/game/predictions` now combines match predictions, outright tournament picks, and joker controls in one flow
- `/game/leagues` now acts as the social tab for create/join plus the user's leagues list
- `/game/leagues/[id]` is present and part of the build output, so league redirects now land on a real dynamic route

Database fixups:

- `supabase/migrations/20260422000010_phase1_social_auth.sql` was corrected so `tournament_predictions.predicted_winner_team_id` uses `uuid`, matching `teams.id`
- `supabase/migrations/20260422000012_fix_rls_recursion.sql` now:
  flattens the recursive SELECT policies on `league_members`, `predictions`, and `tournament_predictions`
  adds `predictions.is_joker_applied`
  repairs `tournament_predictions.predicted_winner_team_id` for databases that were left in a partial/broken state
- if Supabase SQL Editor already failed with `42804` on `tournament_predictions_predicted_winner_team_id_fkey`, run `supabase/migrations/20260422000013_repair_phase2_social_schema.sql`
  this repair script converts legacy `bigint` winner IDs to `uuid` through `teams.legacy_id` and then reapplies the flat RLS policies

Current joker behavior:

- one booster for the group stage and one booster for all knockout rounds
- the server action validates joker uniqueness by scanning the user's existing predictions before allowing a new joker save
- disabled joker buttons now explain why they cannot be activated
- prediction score inputs default to `0`, so untouched fields still submit a legal score


## Phase 2 Security And Game UX Hardening

As of April 22, 2026, the `/game` hub also includes the security and league-management layer needed for real social play.

What changed:

- league join/create on `/game/leagues` now opens inline action panels instead of bouncing the user away on first click
- league invite links can now be shared as `/game/leagues?invite=AB12`, and the join panel pre-fills from that query param
- `/game/leagues/[id]` now supports owner-only `Remove Member` and `Delete League`, plus `Leave League` for regular members
- all league management actions now verify ownership or self-targeting server-side before mutating the DB
- scheduled prediction cards are now rendered only when both teams are actually known
- joker toggles now lock the rest of the stage immediately in local UI state before the save round-trip finishes

Database hardening:

- `supabase/migrations/20260422000014_harden_game_social_security.sql` adds:
  4-character alphanumeric invite codes
  row-by-row regeneration of legacy invite codes that do not match the new format
  `league_join_attempts` for basic brute-force throttling on join attempts
  flat `SELECT USING (true)` policies for `league_members`, `predictions`, and `tournament_predictions`

Operational note:

- `joinLeague` now rate-limits repeated invalid invite code attempts per authenticated user
- `upsertMatchPrediction` now refuses to save if the match is no longer `scheduled` or if one side is still an unresolved placeholder


## Predictions History UX Upgrade

As of April 22, 2026, `/game/predictions` behaves more like a live season console than a narrow entry form.

What changed:

- the page now shows `finished`, `live`, and `scheduled` matches in one chronological stream
- only unresolved future matches with missing team IDs are hidden from the list
- finished matches render as read-only history cards with:
  actual result
  the user prediction
  `points_earned`
- exact score hits now receive a premium highlight, and exact hits that also used a joker get an even stronger celebratory treatment
- on first load, the screen auto-scrolls to the first `live` or `scheduled` match so users do not land above dozens of completed fixtures

Independent joker rule:

- the group-stage joker and the knockout joker are now separated correctly
- the optimistic UI only disables joker toggles inside the current bucket instead of locking the entire match list
- bucket detection now normalizes the raw match stage value and falls back to legacy match-number ranges only when the stage is ambiguous

League routing hardening:

- `/game/leagues/[id]` now fetches the league and membership through the admin client and then verifies access explicitly
- this avoids false `404` responses caused by transient RLS or membership timing issues immediately after league creation


## Stability Fixes: Joker Query, Direct Join, And Outrights

As of April 22, 2026, the game hub received another stability pass focused on prediction persistence and league-entry flow.

What changed:

- `lib/game/boosters.ts` now wraps joker-usage lookups defensively, so missing columns or empty Supabase responses no longer crash `GameLayout`
- `upsertMatchPrediction` now falls back cleanly when `is_joker_applied` is not available yet, instead of failing during the existing-prediction lookup
- successful match saves now show a stronger in-card `✓ נשמר` indicator
- `/game/join/[code]` is now a real direct-join route for invite links
- league invite links now target the direct-join route instead of only pre-filling the join input
- `OutrightForm` now keeps winner and top-scorer state independent, so changing the predicted winner no longer wipes the saved/typed top-scorer value
- `app/game/loading.tsx` now provides a stable loading shell while switching between `/game` tabs


## Emergency RLS Recovery For Prediction Saves

As of April 22, 2026, another production issue was traced back to legacy recursive RLS policies that still existed in some Supabase environments.

What changed:

- `GameLayout` now reads the gamer card profile and joker inventory through the admin client after authenticating the user, so the `/game` shell no longer crashes if user-scoped RLS is temporarily broken
- `/game/predictions` now reads the user prediction history, tournament outrights, and joker usage through the admin client after auth verification
- prediction save actions now authenticate with the normal session client, then perform the actual DB lookup/upsert through the admin client to avoid recursive-policy failures during save
- new migration: `supabase/migrations/20260422000015_force_flat_prediction_rls.sql`
- that migration aggressively drops every existing policy on:
  `league_members`
  `predictions`
  `tournament_predictions`
  and recreates the flat authenticated rules from scratch

Important follow-up:

- the code now has a server-side fallback, but the new migration should still be run in Supabase SQL Editor so the database itself is fully repaired
