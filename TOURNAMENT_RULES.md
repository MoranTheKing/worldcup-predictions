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

## UI Styling Rules
- **Group Standings (3rd Place):** DO NOT display "הדחה ודאית" or "העפלה מובטחת" text next to the position. Only use colors: Green text for guaranteed qualification, Red text for guaranteed elimination.
- **Best 3rd Place Table:** Here, explicitly write the status text ("העפלה" / "הדחה").