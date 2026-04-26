---
name: worldcup2026-design
description: Use this skill to generate well-branded interfaces and assets for the FIFA World Cup 2026 Predictions PWA (תחזיות מונדיאל 2026). Contains essential design guidelines, colors, typography, brand fonts, and UI kit components for the Hebrew RTL dark-mode mobile app.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

Key rules to remember:
- Dark mode default background: #060D1A (ultra-dark navy)
- Font strategy: FWC2026 (Latin/numbers) + Rubik 900 (Hebrew display) + Heebo (functional UI)
- Neon green #00E65A = primary CTA / active state
- Purple #7C3AED = Joker boost (gamification)
- Gold #F5C518 = trophy / winner
- Fire #FF4D1C = hot streak 🔥
- Always RTL (dir="rtl"), logical CSS, Hebrew-first copy
- Live prediction chips in leaderboards keep the surrounding UI RTL. Remember that RTL flex visually reverses child order, so either make the whole chip `dir="ltr"` or render the numeric score in the visual flag order; the league live chips intentionally render away-home with `dir="ltr"` for the score.
- Cards use glassmorphism: backdrop-blur + rgba surface + subtle border
- Bottom nav: frosted glass with neon green active glow
- Production live prediction screens and leaderboards should use scoped Supabase Realtime subscriptions instead of interval polling. Debounce `router.refresh()` and defer refreshes while the browser tab is hidden.
- Scoring lives in `lib/game/scoring.ts`: odds-tier base points + stage direction bonus; exact hits add the separate stage exact-score bonus, then x2 Joker. Persist scores through `scoreFinishedMatchPredictions` so `predictions.points_earned` and `profiles.total_score` stay aligned.
- Prediction cards should show available odds-based rewards before save; live cards and league rows should show projected `+N` without mutating persisted totals until the match is finished.
- Dev Tools owns local odds editing, random odds seeding, and current-user-only random prediction filling. Keep these routes localhost-only and never use them for bulk production user prediction generation.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.
