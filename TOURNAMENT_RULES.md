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
