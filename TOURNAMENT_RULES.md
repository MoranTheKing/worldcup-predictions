# Tournament Rules And Runtime Logic

This document describes the rules the app currently enforces in code.

## Group standings

When teams are level on points, ordering is resolved with:

1. head-to-head points
2. head-to-head goal difference
3. head-to-head goals scored
4. restart the comparison on the remaining tied subset
5. overall goal difference
6. overall goals scored
7. fair play
8. FIFA ranking

Primary implementation:

- `lib/utils/standings.ts`

## Deterministic locking

Group positions and best-third-place positions are locked only when they are mathematically settled, not just because the UI wants to show a stable state.
Qualification and elimination status can be settled before the exact group position is settled. In that case the UI should show a qualified/eliminated pill without a locked-place label.
Scenario analysis for pending group matches runs through the same head-to-head and overall tie-break pipeline as the live table, so a team can be marked qualified when every remaining result path keeps it in the top two even if its exact rank can still move.
Late-group scenarios include scoreline variants, not only win/draw/loss directions, because goal difference and goals scored can change qualification certainty.

## Annex C and knockout progression

Knockout slots are resolved from official placeholders and the Annex C mapping, then written back into `matches`.

Primary implementation:

- `lib/tournament/knockout-progression.ts`
- `fifa_2026_matchups.json`

## Overtime and penalties

Knockout winners are resolved from normal time first, then penalty data when required.

Relevant fields:

- `is_extra_time`
- `home_penalty_score`
- `away_penalty_score`

## Social viewing privacy rules

Opponent view and league view follow anti-cheat rules:

- scheduled matches are hidden from opponents
- live match predictions can be shown inside a shared league leaderboard because the match has already locked
- unresolved placeholder matches are hidden from opponents
- outright picks are hidden from other users until tournament kickoff
- the viewing user can still see their own outright picks before kickoff

## Live projected scoring

Persisted totals stay final-only: `profiles.total_score` changes only when a match is finished and scoring sync writes `predictions.points_earned`.
If a match is moved back from `finished` to `live` or `scheduled`, the match's final scoring is reset by writing `points_earned = 0` for that match and recalculating affected profile totals.

During live matches, UI surfaces may show temporary projections as `+N`:

- leaderboard rows show per-live-prediction and per-user live deltas
- leaderboard rank uses the projected score during live matches: `total_score + live +N`
- equal projected scores are currently ordered by `profiles.created_at`, earliest registration first
- the global league header's "my rank" card uses the same projected leaderboard order
- the game hero shows a `LIVE +N` badge next to `Total Score`
- projections use `calculatePredictionPoints` against the current live score and never write to the database
- at most two live matches are considered for compact UI surfaces

## Prediction lock rules

The current intended behavior is:

- match predictions lock at match kickoff
- tournament winner/top-scorer predictions lock at tournament kickoff
- these locks must exist in both app logic and database policy

## Joker availability

Users have two total Jokers and both are group-stage-only. A group Joker is available only while at least one group-stage match is still scheduled and no knockout match has started. After that, unused Joker cards are shown as expired rather than available.

Required DB remediations:

- `20260423000018_restore_social_prediction_privacy.sql`
- `20260423000019_enforce_prediction_lock_windows.sql`

For the full security narrative, see:

- `SECURITY_AUDIT_2026-04-23.md`

## Public tournament projection

`/dashboard/tournament` is a public dashboard view, not a social-prediction view.
After the RLS privacy hardening, it uses a server-side admin client to read only public tournament fields needed for groups, bracket slots, flags, records, and elimination state.

This keeps the public tournament page usable while leaving user predictions, league membership, and hidden outright picks under the social privacy rules above.

## Team detail navigation

Each resolved team has a canonical public detail route at `/dashboard/teams/[id]`.
Team references in match cards, prediction cards, tournament tables, knockout bracket seeds, league live chips, and tournament-winner badges should navigate to that route.
The detail page is intentionally read-only and summarizes the team's fixture path, next known match, current group standing, tournament status, expanded stats, and five-match form.
It also links to `/dashboard/teams/[id]/squad`, which shows the current local player data, grouped by position, plus a coach placeholder until the external API sync supplies coach data.

## Team hub, odds, and player statistics

The team hub now has three public routes:

- `/dashboard/teams` lists every team by group, using the same live standings calculation as `/dashboard/tournament`, and shows `teams.outright_odds` as the API-fed tournament-winning odds.
- `/dashboard/teams/[id]` is the primary team profile. It avoids duplicating points and goal difference in the hero; those live values are shown in the group table instead.
- `/dashboard/teams/[id]/stats` separates team statistics from individual player statistics, including goals, assists, appearances, minutes, yellow cards, and red cards.

The `team_recent_matches` table is reserved for the five pre-tournament form matches. Tournament matches and pre-tournament form share the same RTL score rendering rule: from the viewed team's perspective, the team's goals are rendered on the visual right side and the opponent's goals on the visual left side.

The visible statistics surface is split intentionally:

- `/dashboard/stats` is the prominent global tables page, available from the main dashboard navigation as `טבלאות`. It owns tournament-wide leaders: goals, assists, yellow cards, red cards, top-scorer odds, team attack/defense, points, and outright odds.
- `/dashboard/teams/[id]/team-stats` owns team-level metrics for one team.
- `/dashboard/teams/[id]/stats` owns individual player metrics for one team.

## RTL numeric and team stats display

All signed numeric values in tables should use `SignedNumber` from `components/StatNumbers.tsx`. This is required for goal difference and live/projected deltas so negative numbers render as `-4`, not `4-`.

Team goal totals should not be displayed as `GF:GA` in Hebrew UI. Use `GoalsForAgainst` or explicit labels for `שערי זכות` and `שערי חובה`, because `10:5` is ambiguous in RTL.

## Squad and API-ready roster fields

The squad route `/dashboard/teams/[id]/squad` is the visual roster surface: coach card, formation, player avatars, shirt numbers, and grouped squad cards. Player photos and shirt numbers are stored in `players.photo_url` and `players.shirt_number` from migration `20260427000032_add_player_roster_visual_fields.sql`.

External API sync should write into Supabase first. UI pages should read from Supabase and reuse existing realtime/refresh paths rather than calling the external football API directly from client components.

## Dev odds controls

Dev Tools has two separate odds flows:

- match 1/X/2 odds: `matches.home_odds`, `matches.draw_odds`, `matches.away_odds`
- tournament outright odds: `teams.outright_odds`

Manual team outright editing and reset are handled by localhost-only `/api/dev/outright-odds/teams`. Top-scorer odds remain random/API-fed and should not be manually maintained per player in the current UI.

When a group is final, team-hub group tables must show exact locked positions only (`מקום 1` through `מקום 4`) and should match `/dashboard/tournament`. Negative goal differences must render in LTR numeric isolation so `-4` never flips to `4-`.

## Dev odds write safety

- Team outright odds saves must update existing `teams` rows only. Do not use `upsert` for manual Dev Tools odds writes, because an incomplete client payload can otherwise try to insert a team without required fields such as `name`.
- The team-only random odds action should update every existing team with a plausible `outright_odds` value and must leave top-scorer odds untouched.
- The combined team/player random odds action should also be update-only for both tables.
- Applying BSD sync migrations only prepares the schema. The actual pull is a server-side dev action through `POST /api/dev/bzzoiro/sync-teams`; client components and public visitors must continue to read Supabase and must not call BSD directly.
- BSD roster sync must replace the old 49 mock players with API-backed records. Prefer in-place updates when an exact BSD player exists so existing prediction references remain valid; remove stale mock duplicates only after migrating any legacy outright FK to the matching BSD row or null.

## Stats table display rule

- Statistics tables should stay compact: player tables show player, national team, and one metric; team tables show national team and one metric.
- Show only Top 3 by default. If more rows exist, expose Top 10 through an explicit `עוד - Top 10` control.
- Player rows should use `players.photo_url` when available and keep team links RTL-safe through the shared compact leader table component.

## Team directory and player profile rule

- `/dashboard/teams` is the single all-teams directory and should not duplicate full group standings. Group tables remain owned by `/dashboard/tournament` and team-specific pages.
- Eliminated teams should remain visible and clickable, but render visually muted/grayscale so active teams and current odds/form are easier to scan.
- `team_recent_matches` is fed by server-side BSD `/api/events/` sync and should contain only exact national-team matches. Do not save broad search results unless the event home/away side matches the team aliases.
- Every visible player name in leaderboards, squad cards, and team stat tables should link to `/dashboard/players/[id]`.
- `/dashboard/players/[id]` is protected with the dashboard auth flow and reads the authenticated user's Supabase session like the other protected dashboard surfaces.

## BSD team sync foundation

- External BSD/Bzzoiro identifiers live in Supabase, not in client state: `teams.bzzoiro_team_id`, `teams.coach_bzzoiro_id`, `players.bzzoiro_player_id`, and sync timestamps are introduced by `20260427000033_add_bzzoiro_sync_fields.sql`.
- Dev-only sync entrypoint: `POST /api/dev/bzzoiro/sync-teams`, exposed in Dev Tools as `סנכרון נבחרות BSD`. It must remain localhost-only and disabled in production until a dedicated production sync worker is built.
- The browser must never call BSD directly. The route fetches BSD data server-side with `Authorization: Token`, writes flags/coach/roster/photo URLs into Supabase, and then revalidates dashboard/team/stat paths.
- Team-name matching must keep aliases for real-world naming drift, including `Czech Republic/Czechia`, `Bosnia and Herzegovina/Bosnia & Herzegovina`, `Turkey/Turkiye`, `USA/United States`, `Republic of Korea/South Korea`, and `Côte d'Ivoire/Ivory Coast`.
- In Hebrew UI, goal chips are number-first (`8 חובה`, `10 זכות`) and full match cards should be clickable to the match detail page while nested team links keep their own destination.
