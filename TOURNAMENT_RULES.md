# Official FIFA World Cup 2026 Tie-Breaker Rules
**CRITICAL:** The sorting algorithm for Group Standings MUST strictly follow this exact hierarchy when two or more teams are tied on points. 

## The Hierarchy
1. **Head-to-Head Points:** Most points obtained in the group matches played strictly *between the teams concerned* (the tied teams).
2. **Head-to-Head Goal Difference:** Superior goal difference in the group matches played *between the teams concerned*.
3. **Head-to-Head Goals Scored:** Most goals scored in the group matches played *between the teams concerned*.
4. **Re-application:** If after steps 1-3, a subset of teams are STILL tied, steps 1-3 are reapplied *exclusively* to that remaining subset.
5. **Overall Goal Difference:** Superior goal difference in ALL group matches.
6. **Overall Goals Scored:** Most goals scored in ALL group matches.
7. **Fair Play Score:** - Yellow card: -1 pt
   - Indirect red (2nd yellow): -3 pts
   - Direct red: -4 pts
   - Yellow & Direct red: -5 pts
8. **FIFA World Ranking:** Better position in the official FIFA ranking.

## Group Position Locking Rule

Three locking conditions are evaluated per team (first match wins):

1. **Terminal lock** — the group is `isFinalized` (no scheduled/live matches) and the team has `played === 3`: rank is locked at its current position.
2. **Scenario lock** — point-scenario analysis shows `bestPossibleRank === worstPossibleRank` for a team with `played === 3`: locked early while other group matches are still pending.
3. **All-played lock** — every team in the group has `played === 3` (all match scores known, even if some are still `live`): the current tie-breaker order is final and all ranks are locked.

## UI Styling Rules
- **Group Standings (3rd Place):** DO NOT display "הדחה ודאית" or "העפלה מובטחת" text next to the position. Only use colors: Green text for guaranteed qualification, Red text for guaranteed elimination.
- **Best 3rd Place Table:** Here, explicitly write the status text ("העפלה" / "הדחה").

---

## Best 3rd Place — Terminal State Rule

**CRITICAL:** The standard scenario analysis (comparing min/max points across groups) may leave teams at the 8th/9th cutoff as `"pending"` even after all matches are played. This is wrong. The following bypass takes priority:

**Condition:** The group stage is in a terminal state when either:
- All 12 groups are `isFinalized` (no group match has `status === "scheduled"` or `"live"`), **OR**
- Every team in every one of the 12 groups has `played === 3` (all 72 group match scores are decided, even if some are still `"live"`)

**Action when terminal:** Skip scenario analysis entirely. Assign status directly from rank:
- Ranks 1–8 → `status = "qualified"`, `isLocked = true` (green badge)
- Ranks 9–12 → `status = "eliminated"`, `isLocked = true` (red badge)

No tie-breaker ambiguity can override this. The table is already sorted by the full tie-breaker chain (Points → GD → GF → Fair Play → FIFA Rank), so the rank is authoritative.

---

## Annex C: 3rd-Place Slot Allocation

### Background
12 groups produce 12 third-placed teams. The **best 8** advance to the Round of 32. Because different group combinations can provide those 8, FIFA pre-defines the exact R32 slot assignment for all **C(12,8) = 495** subsets in an "Annex C" table.

### Trigger Condition
Annex C only fires when **all 8 top best-3rd-place teams are `isLocked && status === "qualified"`** — which, after the terminal-state bypass, means all group matches are done.

### Lookup Flow
1. Take the group letters of the 8 qualified 3rd-place teams (e.g. `A, B, D, E, G, I, K, L`).
2. Sort alphabetically and join → **subset key** (e.g. `"ABDEGIKL"`).
3. Look up the key in `fifa_2026_matchups.json`.
4. The result is a mapping where:
   - **Key = the group letter of the 1st-place team** in that R32 match
   - **Value = the group letter of the 3rd-place team** that plays against them
   - Example: `"A": "H"` → 3rd place from Group H plays against 1st place from Group A (match with home_placeholder `"1A"`)
5. For each R32 match whose `away_placeholder` starts with `3`, parse `home_placeholder` (e.g. `"1A"` → slot `"A"`), look up the mapped 3rd-place group, and inject that group's rank-3 team ID.

### Fixed Slot Keys
The 8 R32 matches that always receive a 3rd-place team involve group winners **A, B, D, E, G, I, K, L**. Every JSON entry has exactly these 8 keys.

### Fallback
If fewer than 8 are confirmed or the subset key is absent from the JSON (should not happen with the complete 494-entry table), the existing placeholder-candidate matching is used.

### Code
- `lib/utils/thirdPlaceAllocations.ts` → `lookupAnnexC()`, `calculateThirdPlaceMatchups()`
- `lib/tournament/knockout-progression.ts` → `syncTournamentState()`
- `fifa_2026_matchups.json` (494 entries, repo root)