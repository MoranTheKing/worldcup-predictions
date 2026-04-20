# UI Kit — תחזיות מונדיאל 2026 (World Cup Predictions App)

## Overview
High-fidelity interactive mobile prototype of the World Cup 2026 Predictions PWA.
Dark-mode-first, Hebrew RTL, mobile-first (390px phone frame).

## Screens
| Screen | How to access |
|---|---|
| Login | Launch page / Tweaks panel |
| Sign Up | "הרשמה" link on login |
| Dashboard — Matches | After login, default tab |
| Tournament — Groups | "טורניר" tab → "שלב הבתים" |
| Tournament — Knockout | "טורניר" tab → "נוקאאוט" |
| Leagues | "ליגות" tab |
| Profile | "פרופיל" tab |

## Font Strategy
- **FWC2026 Ultra Condensed** — Latin text & numbers only (scores, dates, Latin headings)
- **Rubik 900** — Hebrew display headings (titles, section headers, gamification)
- **Heebo** — All functional Hebrew UI (body, labels, inputs, buttons)

## Components in index.html
- `Flag` — team flag swatch from gradient palette
- `Avatar` — neon green gradient initial avatar
- `Pill` — status badge / label pill
- `LoginScreen` / `SignupScreen` — auth flows
- `MatchCard` — score input card with joker toggle (3 states)
- `MatchesTab` — matches grid with scoring info
- `GroupTable` — standing table with rank color-coding
- `TournamentTab` — groups + knockout bracket
- `LeaguesTab` — create/join league actions + empty state
- `ProfileTab` — nickname edit, joker cards, outright predictions
- `BottomNav` — frosted glass tab bar with neon active state
- `DashboardHeader` — mobile header with streak pill
- `TweaksPanel` — screen navigator (accessible via Tweaks toggle)
