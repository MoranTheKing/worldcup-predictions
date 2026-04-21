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

## Locking Rule
If all teams in a tied subset have played exactly 3 matches, and all tie-breakers are exhausted, their relative positions are locked.

Three locking conditions are evaluated (first match wins):
1. **Terminal lock** — all group matches are `finished`: every team's rank is locked at its current position.
2. **Scenario lock** — point-scenario analysis shows `bestPossibleRank === worstPossibleRank` for a team that has already played 3 matches: locked early even while other group matches are pending.
3. **All-played lock** — every team in the group has `played === 3` (all match scores are known, even if some are still `live`): the current tie-breaker order is the final order and all ranks are locked.

## UI Styling Rules
- **Group Standings (3rd Place):** DO NOT display "הדחה ודאית" or "העפלה מובטחת" text next to the position. Only use colors: Green text for guaranteed qualification, Red text for guaranteed elimination.
- **Best 3rd Place Table:** Here, explicitly write the status text ("העפלה" / "הדחה").

---

## Annex C: 3rd-Place Slot Allocation

### Background
12 groups produce 12 third-placed teams. The **best 8** of those teams advance to the Round of 32 (R32). Because different combinations of groups can provide the 8 qualifiers, FIFA pre-defines the exact R32 slot assignment for all **C(12,8) = 495** possible subsets via an "Annex C" table.

### How the Lookup Works
1. After all group matches are complete, identify the 8 qualifying third-placed groups (e.g. A, B, D, E, G, I, K, L).
2. Sort those 8 letters alphabetically to form the **subset key** (e.g. `"ABDEGIКL"`).
3. Look up that key in `fifa_2026_matchups.json`.
4. The result is a mapping `{ winner_group → third_place_group }`.
   - Example entry `"G": "A"` means: **the R32 match where Group G's winner plays receives the 3rd-place team from Group A**.
5. For each R32 match whose away placeholder starts with `3` (e.g. `3C/E/F/H/I`), the system checks the home placeholder (e.g. `1G`) to determine the slot key (`G`), then reads the mapped third-place group, and injects that group's rank-3 team ID as the away participant.

### Fixed Slot Keys
The 8 R32 matches that always receive a 3rd-place team correspond to group winners **A, B, D, E, G, I, K, L**. The JSON allocation table always provides exactly these 8 keys per subset entry.

### Fallback Behaviour
- If fewer than 8 best-3rd-place teams are mathematically confirmed (`isLocked && status === "qualified"`), the Annex C lookup is skipped and the existing placeholder-candidate matching is used.
- If a subset key is missing from `fifa_2026_matchups.json` (which should not occur with the complete 494-entry table), the system falls back to the generic placeholder resolution.

### Code Location
- Lookup and calculation: `lib/utils/thirdPlaceAllocations.ts` → `lookupAnnexC()`, `calculateThirdPlaceMatchups()`
- Integration into tournament sync: `lib/tournament/knockout-progression.ts` → `syncTournamentState()`
- Data file: `fifa_2026_matchups.json` (494 entries at root of repo)