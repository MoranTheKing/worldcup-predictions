-- Align knockout kickoff times 74-90 with FIFA's official Scores & Fixtures API.
-- Source:
-- https://api.fifa.com/api/v3/calendar/matches?from=2026-06-11T00:00:00Z&to=2026-07-20T23:59:59Z&language=en&count=500&idCompetition=17&idSeason=285023
-- This is date/time-only and keeps match numbers, placeholders, teams, statuses, scores and odds unchanged.

WITH knockout_schedule(match_number, date_time) AS (
  VALUES
  (74, '2026-06-29T23:30:00+03:00'::timestamptz), -- 1E vs 3A/B/C/D/F
  (75, '2026-06-30T04:00:00+03:00'::timestamptz), -- 1F vs 2C
  (76, '2026-06-29T20:00:00+03:00'::timestamptz), -- 1C vs 2F
  (77, '2026-07-01T00:00:00+03:00'::timestamptz), -- 1I vs 3C/D/F/G/H
  (78, '2026-06-30T20:00:00+03:00'::timestamptz), -- 2E vs 2I
  (81, '2026-07-02T03:00:00+03:00'::timestamptz), -- 1D vs 3B/E/F/I/J
  (82, '2026-07-01T23:00:00+03:00'::timestamptz), -- 1G vs 3A/E/H/I/J
  (83, '2026-07-03T02:00:00+03:00'::timestamptz), -- 2K vs 2L
  (84, '2026-07-02T22:00:00+03:00'::timestamptz), -- 1H vs 2J
  (85, '2026-07-03T06:00:00+03:00'::timestamptz), -- 1B vs 3E/F/G/I/J
  (86, '2026-07-04T01:00:00+03:00'::timestamptz), -- 1J vs 2H
  (87, '2026-07-04T04:30:00+03:00'::timestamptz), -- 1K vs 3D/E/I/J/L
  (88, '2026-07-03T21:00:00+03:00'::timestamptz), -- 2D vs 2G
  (89, '2026-07-05T00:00:00+03:00'::timestamptz), -- Winner Match 74 vs Winner Match 77
  (90, '2026-07-04T20:00:00+03:00'::timestamptz) -- Winner Match 73 vs Winner Match 75
)
UPDATE public.matches AS match
SET date_time = knockout_schedule.date_time
FROM knockout_schedule
WHERE match.match_number = knockout_schedule.match_number;
