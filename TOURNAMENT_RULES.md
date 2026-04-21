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

1. Persisted `home_team_id` / `away_team_id` from the DB
2. Seeded Round of 32 assignment from `buildRoundOf32Assignments()`
3. Placeholder references like `Winner Match 73` or `Loser Match 101`

Winner and loser propagation:

- `parseReferencePlaceholder()` parses `Winner Match N` and `Loser Match N`
- `resolveParticipantId()` recursively resolves upstream participants
- `determineKnockoutWinnerId()` and `determineKnockoutLoserId()` advance teams into later rounds

Bracket UI:

- `app/dashboard/tournament/TournamentClient.tsx` renders the knockout bracket
- `lib/bracket/knockout.ts` builds the display model used by the page

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

## Current Seed Caveat

The current Round of 32 seed data in `matches` and `matches_data.json.txt` still mixes official Annex C winner-group slots with older placeholder-based slots.

What this means today:

- Official Annex C-mapped winner placeholders are now injected into the DB correctly
- Remaining non-official 3rd-place placeholder slots still depend on `buildRoundOf32Assignments()` fallback logic
- If the product later wants a fully official World Cup 2026 Round of 32 layout, the placeholder seed data will need to be aligned with the Annex C winner-group keys in addition to the current injection fix
