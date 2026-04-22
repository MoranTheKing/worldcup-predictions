# Official FIFA World Cup 2026 Tournament Rules

This repo calculates standings and knockout progression from the `matches` table. The rules below describe the current implemented behavior as of April 21, 2026.

## Group Tie-Break Hierarchy

When two or more teams are level on points, standings must be ordered in this exact sequence:

1. Head-to-head points among the tied teams only
2. Head-to-head goal difference among the tied teams only
3. Head-to-head goals scored among the tied teams only
4. Reapply steps 1-3 to any remaining tied subset
5. Overall goal difference in all group matches
6. Overall goals scored in all group matches
7. Fair play score
8. FIFA world ranking

Implementation:

- `lib/utils/standings.ts`
- Recursive head-to-head resolution happens in `resolveTieByHeadToHead()`

## Group Position Locking

Locking is now deterministic and is evaluated per team in `buildTournamentStandings()` inside `lib/utils/standings.ts`.

The code uses three lock paths:

1. Terminal lock
   Condition: the group is finalized and the team has `played === 3`
   Source: `groupContext.isFinalized`
   Result: `lockedRank = current rank`

2. Scenario lock
   Condition: the team has `played === 3` and scenario analysis converges to `bestPossibleRank === worstPossibleRank`
   Source: `buildScenarioSummary()`
   Result: `lockedRank = converged rank`

3. All-played lock
   Condition: every team in the group has `played === 3`, even if some matches are still marked `live`
   Result: `lockedRank = current rank`

Important detail:

- `played` comes from live match scores, not stale cached values on `teams`
- This is why the table can lock correctly even before all `status` flags have flipped to `finished`

## Best 3rd-Place Terminal State

The Best 3rd Place table has a hard terminal-state bypass in `lib/utils/standings.ts`.

The group stage is terminal when either condition is true:

1. All 12 groups are finalized
   Meaning: no group match has `status === "scheduled"` or `status === "live"`

2. Every team in all 12 groups has `played === 3`
   Meaning: every group score is already known, even if a match status is still `live`

When terminal:

- Scenario analysis is skipped for Best 3rd Place qualification
- Ranks `1-8` are set to `status = "qualified"` and `isLocked = true`
- Ranks `9-12` are set to `status = "eliminated"` and `isLocked = true`

This is the deterministic locking behavior that prevents the 8th/9th cutoff from staying stuck in `pending`.

## Annex C Slot Allocation

Annex C logic lives in:

- `lib/utils/thirdPlaceAllocations.ts`
- `lib/tournament/knockout-progression.ts`
- `fifa_2026_matchups.json`

Structure:

1. The top 8 locked and qualified 3rd-place teams are collected from `bestThirdStandings`
2. Their group letters are alphabetically sorted into a subset key such as `ABDEGIKL`
3. `lookupAnnexC()` reads that key from `fifa_2026_matchups.json`
4. The JSON entry returns `{ winnerGroup -> thirdPlaceGroup }`
5. `calculateThirdPlaceMatchups()` converts that mapping into side-aware Round of 32 assignments

Current implementation detail:

- `calculateThirdPlaceMatchups()` no longer assumes the 3rd-place team always belongs on the away side
- For each Annex C mapping like `"A": "H"`, it scans matches `73-88`
- It finds the match containing placeholder `1A` on either side
- If `home_placeholder === "1A"`, it assigns the 3rd-place team from Group H to `away_team_id`
- If `away_placeholder === "1A"`, it assigns that team to `home_team_id`

Database trigger path:

- `syncTournamentState()` runs after dev match saves, bulk saves, clear, and randomize flows
- Once the Best 3rd Place table reaches a terminal locked state, `syncTournamentState()` computes Annex C assignments and persists them back into `matches`

Official Round of 32 winners that receive Annex C 3rd-place crossings in the live bracket seed are:

- `1A`, `1D`, `1E`, `1G`, `1I`, `1L`, `1B`, `1K`

JSON status:

- The model expects `C(12,8) = 495` subsets
- The current repo file contains `494` JSON entries
- Missing-key behavior is still a safe fallback to the candidate placeholder solver

## Knockout Progression Cascade

Knockout progression is driven by:

- `lib/tournament/knockout-progression.ts`
- `lib/tournament/knockout-utils.ts`
- `lib/bracket/knockout.ts`

Resolution order for a knockout side:

1. Seeded Round of 32 assignment from `buildRoundOf32Assignments()`
2. Placeholder references like `Winner Match 74` or `Loser Match 101`
3. Persisted `home_team_id` / `away_team_id` only when the side has no resolvable placeholder

Winner and loser propagation:

- `parseReferencePlaceholder()` parses `Winner Match N` and `Loser Match N`
- `resolveParticipantId()` recursively resolves upstream participants
- `determineKnockoutWinnerId()` and `determineKnockoutLoserId()` advance teams into later rounds

Official non-sequential crossings:

- The 2026 FIFA bracket is not a simple `Winner 73 vs Winner 74`, `Winner 75 vs Winner 76` ladder
- Round of 16, quarter-final, semi-final, third-place, and final crossings must be read from the explicit placeholder graph stored in `matches.home_placeholder` and `matches.away_placeholder`
- The app must always follow those placeholders dynamically instead of assuming downstream pairing by match-number adjacency

Bracket UI:

- `app/dashboard/tournament/TournamentClient.tsx` renders the knockout bracket
- `lib/bracket/knockout.ts` builds the display model used by the page

Responsive bracket implementation:

- The winner tree is precomputed in `lib/tournament/knockout-tree.ts`
- `TournamentClient.tsx` now renders a split vertical bracket instead of a horizontal canvas
- The top bracket flows downward:
  Round of 32 `73-80` -> Round of 16 `89-92` -> quarter-finals `97-98` -> semi-final `101`
- The bottom bracket flows upward:
  Round of 32 `81-88` -> Round of 16 `93-96` -> quarter-finals `99-100` -> semi-final `102`
- The center block holds the climax matches:
  final `104` and 3rd-place match `103`
- The visual render order is intentionally non-sequential so the branches stay untangled:
  top row `[74, 77, 73, 75, 83, 84, 81, 82]`
  then `[89, 90, 93, 94]`
  then `[97, 98]`
  then `[101]`
  then center `[104, 103]`
  then `[102]`
  then `[99, 100]`
  then `[91, 92, 95, 96]`
  then `[76, 78, 79, 80, 86, 88, 85, 87]`
- The bracket no longer uses helper copy like `To Match X` to explain progression
- The bracket now uses a nested flexbox tree instead of flat wrapped rows, so every parent match stays centered over or under its exact child branch
- Connectors are drawn inside each branch container with simple CSS line segments, which keeps them locked to the correct child pair
- The outer bracket shell uses `overflow-x-auto`, `overflow-y-hidden`, `min-w-max`, and `flex-nowrap` so the tree never wraps
- The UI no longer shows labels such as `׳”׳׳¡׳׳•׳ ׳”׳¢׳׳™׳•׳` or `׳”׳׳¡׳׳•׳ ׳”׳×׳—׳×׳•׳`
- Early-round cards are intentionally compact (`max-w-[220px]`) so the bracket stays readable on mobile without horizontal scrolling
- The Final card keeps the gold treatment and explicit label `׳”׳’׳׳¨`
- The 3rd Place card uses a bronze accent and the explicit label `׳׳§׳•׳ 3`
- The bracket now relies on vertical scrolling, compact cards, and centered grids instead of shrinking the whole tree to fit the viewport

## Global Elimination Sync

Global elimination persistence now runs inside `syncTournamentState()` and writes directly into `teams.is_eliminated`.

Main files:

- `lib/tournament/elimination.ts`
- `lib/tournament/knockout-progression.ts`
- `lib/utils/standings.ts`

Rules persisted to the database:

1. Group-stage elimination
   All mathematically eliminated 4th-place teams are marked `is_eliminated = true`

2. Best 3rd Place elimination
   Once the Best 3rd Place table reaches a locked state, ranks `9-12` are marked eliminated in `teams`

3. Knockout elimination
   Any team that loses a finished knockout match is marked eliminated

4. Semi-final exception
   Semi-final losers are not eliminated on the semi-final result itself
   They stay alive until the 3rd-place match is completed
   The loser of the 3rd-place match is then eliminated, while the winner remains non-eliminated

Operational behavior:

- Dev Tools single-match save calls `syncTournamentState()`
- Dev Tools bulk save calls `syncTournamentState()`
- Dev Tools clear calls `syncTournamentState()`
- Dev Tools randomize calls `syncTournamentState()`
- Dev Tools `Finish All Matches` now auto-saves through the bulk endpoint immediately
- Dev Tools per-match `RESET` now auto-saves immediately, and explicitly resets the score to `0:0`
- The Tournament page counter `teamsRemaining` now reads from the persisted `teams.is_eliminated` flags instead of inferring elimination only from local group-table status

## Group Table 3rd-Place UI

The local group standings table keeps the 3rd-place pill text compact:

- The pill text is always `׳׳§׳•׳ 3`
- Green means the team is globally inside the top 8 third-place qualifiers
- Red means the team is globally outside the top 8 and mathematically out
- The Tournament parent computes the global Best 3rd Place ranking first and passes those team IDs down to each group table
- The group table now waits for locked Best 3rd Place status before coloring a locked 3rd-place team green or red

## Extra Time And Penalties

Knockout match persistence uses these DB columns on `matches`:

- `is_extra_time BOOLEAN`
- `home_penalty_score INT`
- `away_penalty_score INT`

Schema source:

- `supabase/migrations/20260421000009_add_extra_time_and_penalties.sql`

Current rules:

- Group matches never require penalties
- A finished knockout draw must include non-level penalty scores
- `is_extra_time` stays `true` for knockout matches decided after extra time or penalties
- Winner resolution uses regular score first, then penalties when regular score is tied

Relevant code:

- `lib/tournament/dev-match-updates.ts`
- `lib/tournament/matches.ts`
- `lib/tournament/knockout-utils.ts`

## Official Knockout Seed Source

The official knockout placeholder graph now lives in:

- `matches_data.json`
- `matches_data.json.txt`
- `matches` rows `73-104`

These sources must stay identical.

Important rule:

- future bracket seeding must preserve the official non-sequential FIFA crossings exactly as encoded in the placeholder graph

## Best 3rd Place Table UI

The `׳”׳׳§׳•׳ ׳”׳©׳׳™׳©׳™` table on the Tournament page is now intentionally neutral until status is sealed.

Current UI behavior:

- the table itself is live and reactive:
  it always extracts the team currently sitting 3rd in each group table and re-sorts the 12 rows immediately from live scores
- live ordering uses the global tiebreak stack for this table:
  points -> goal difference -> goals scored -> fair play -> FIFA ranking
- `׳”׳¢׳₪׳׳”` and `׳”׳“׳—׳”` badges only render when `entry.isLocked === true`
- green and red row highlights only render when the locked status is final
- pending rows stay neutral even if they are currently inside the top 8 or bottom 4 by array order
- the `׳‘׳™׳×` column has been removed from this table to keep it focused on ranking metrics only

## Phase 1 Auth And Social Foundation

As of April 22, 2026, authentication is now global for the full app instead of being isolated inside the dashboard.

Current architecture:

- `app/layout.tsx` now hydrates the Supabase user plus the app profile snapshot before rendering the rest of the tree
- `components/auth/AuthProvider.tsx` owns the shared client auth context for the whole application
- `components/AppNavbar.tsx` reads that global auth state and switches between `Login` and `display_name + Logout`
- `components/DashboardShell.tsx` now consumes the same shared auth context instead of relying on dashboard-only props

Protected routing:

- `proxy.ts` is now the single route-protection entrypoint (Next.js 16 replaces middleware with proxy for this project)
- protected surfaces currently include:
  `/dashboard`, `/dashboard/matches`, `/dashboard/profile`, `/dashboard/leagues`, `/leagues`, `/predictions`, `/onboarding`, `/dev-tools`
- `/dashboard/tournament` remains intentionally public so the live tournament view stays accessible without login
- `/login` and `/signup` redirect authenticated users back to `/dashboard`
- protected-route redirects preserve the original requested path through the `next` query param

Supabase schema work:

- Safe migration file:
  `supabase/migrations/20260422000010_phase1_social_auth.sql`
- The migration uses `create table if not exists` plus `alter table ... add column if not exists`
- It creates or extends:
  `profiles`, `leagues.invite_code`, `league_members`, `predictions`, `tournament_predictions`
- It also backfills from the legacy tables already used by the app:
  `users`, `league_participants`, `bets`, `outright_bets`

Still intentionally out of scope for this phase:

- prediction scoring rules
- league ranking logic based on the new `predictions` tables
- full invite/join UX on top of the new `invite_code` schema

