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
- Game header score cards should keep `Total Score` as the persisted finished-match score and show temporary live projections as a separate `LIVE +N` badge sourced from `/api/game/live-score-projection`.
- Scoring lives in `lib/game/scoring.ts`: odds-tier base points + stage direction bonus; exact hits add the separate stage exact-score bonus, then x2 Joker. Persist scores through `scoreFinishedMatchPredictions` so `predictions.points_earned` and `profiles.total_score` stay aligned.
- When a match moves from `finished` back to `live` or `scheduled`, call `clearUnfinishedMatchScoring` so stale final points return to `0` and affected profile totals are recalculated.
- Joker rules are exactly two total Jokers and both are group-stage-only. Do not surface or score Joker multipliers for knockout matches, even if legacy rows still have `is_joker_applied = true`.
- Unused group-stage Joker cards must show an expired state, not `זמין`, after the group stage closes or knockout starts.
- Prediction cards should show available odds-based rewards before save; live cards and league rows should show projected `+N` without mutating persisted totals until the match is finished.
- Leaderboards sort by projected live score while matches are live: `total_score + live +N`; ties currently break by `profiles.created_at` registration date.
- The global league header should show participant count and the current user's rank in that same projected leaderboard order, not a live-match count card.
- In group live standings, the inline live score is row-team-perspective: the row team's goal count should appear on the visual right side.
- Tournament group tables must distinguish locked position from qualification status. If a team has mathematically guaranteed qualification or elimination but its exact group rank is still open, show the qualified/eliminated status pill without claiming `מקום N`.
- Group qualification scenario analysis must use the same tie-break sorting pipeline as the table itself, not points-only ranges. Late-group checks must include scoreline variants, so draws with goals and goal-difference swings can keep a team from being marked guaranteed top two.
- `/game/leaderboard` is the global league and should share the private league leaderboard surface: live prediction chips, winner/top-scorer columns, projected live deltas, and profile-total realtime refreshes.
- Team references across match cards, prediction cards, tournament tables, brackets, live league chips, and winner badges should link through `components/TeamLink` to `/dashboard/teams/[id]`. Team detail pages show the team's fixture path, next match, group mini-table, and current tournament status.
- Dev Tools match-clock ranges are phase-aware: first half allows 0-60 and displays 45+, second half allows 46-105 and displays 90+, and knockout extra time allows 91-135 with 120+ display for stoppage.
- Match schedule syncs must follow FIFA's official match order. Only update `match_number` and `date_time`, and relink existing prediction/bet references when a fixture's number changes. Do not swap home/away sides, statuses, scores, odds, or placeholders.
- For kickoff audits, prefer FIFA's official Scores & Fixtures API (`https://api.fifa.com/api/v3/calendar/matches`, World Cup `idCompetition=17`, `idSeason=285023`) over prose articles. Convert the API UTC `Date` to Israel time (`+03:00` during the tournament).
- Dev Tools owns local odds editing, random odds seeding, and current-user-only random prediction filling. Keep these routes localhost-only and never use them for bulk production user prediction generation.
- Dev Tools `Clear All Match Data` is intentionally destructive in local dev: it resets matches, odds, all prediction tables, legacy bets, and profile totals so league leaderboards return to zero while memberships remain.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.
