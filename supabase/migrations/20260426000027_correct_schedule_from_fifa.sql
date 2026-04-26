-- Correct World Cup 2026 kickoff dates and match numbers with the official FIFA schedule.
-- Source: https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/match-schedule-fixtures-results-teams-stadiums
-- FIFA calendar API exposes UTC timestamps; these values are stored in Israel time (+03:00 during the tournament).
-- Only matches.match_number and matches.date_time are changed; prediction/bet match references are relinked to the same fixtures.

DROP TABLE IF EXISTS fifa_schedule_20260426;
CREATE TEMP TABLE fifa_schedule_20260426 (
  old_match_number INT PRIMARY KEY,
  match_number INT NOT NULL UNIQUE,
  date_time TIMESTAMPTZ NOT NULL
) ON COMMIT DROP;

INSERT INTO fifa_schedule_20260426 (old_match_number, match_number, date_time)
VALUES
  (  1,   1, '2026-06-11T22:00:00+03:00'::timestamptz), -- Mexico vs South Africa
  (  2,   2, '2026-06-12T05:00:00+03:00'::timestamptz), -- South Korea vs Czech Republic
  (  3,   3, '2026-06-12T22:00:00+03:00'::timestamptz), -- Canada vs Bosnia and Herzegovina
  (  4,   4, '2026-06-13T04:00:00+03:00'::timestamptz), -- United States vs Paraguay
  (  7,   5, '2026-06-14T04:00:00+03:00'::timestamptz), -- Haiti vs Scotland
  (  8,   6, '2026-06-14T07:00:00+03:00'::timestamptz), -- Australia vs Turkey
  (  6,   7, '2026-06-14T01:00:00+03:00'::timestamptz), -- Brazil vs Morocco
  (  5,   8, '2026-06-13T22:00:00+03:00'::timestamptz), -- Qatar vs Switzerland
  ( 11,   9, '2026-06-15T02:00:00+03:00'::timestamptz), -- Ivory Coast vs Ecuador
  (  9,  10, '2026-06-14T20:00:00+03:00'::timestamptz), -- Germany vs Curaçao
  ( 10,  11, '2026-06-14T23:00:00+03:00'::timestamptz), -- Netherlands vs Japan
  ( 12,  12, '2026-06-15T05:00:00+03:00'::timestamptz), -- Sweden vs Tunisia
  ( 15,  13, '2026-06-16T01:00:00+03:00'::timestamptz), -- Saudi Arabia vs Uruguay
  ( 13,  14, '2026-06-15T19:00:00+03:00'::timestamptz), -- Spain vs Cape Verde
  ( 16,  15, '2026-06-16T04:00:00+03:00'::timestamptz), -- Iran vs New Zealand
  ( 14,  16, '2026-06-15T22:00:00+03:00'::timestamptz), -- Belgium vs Egypt
  ( 17,  17, '2026-06-16T22:00:00+03:00'::timestamptz), -- France vs Senegal
  ( 18,  18, '2026-06-17T01:00:00+03:00'::timestamptz), -- Iraq vs Norway
  ( 19,  19, '2026-06-17T04:00:00+03:00'::timestamptz), -- Argentina vs Algeria
  ( 20,  20, '2026-06-17T07:00:00+03:00'::timestamptz), -- Austria vs Jordan
  ( 23,  21, '2026-06-18T02:00:00+03:00'::timestamptz), -- Ghana vs Panama
  ( 22,  22, '2026-06-17T23:00:00+03:00'::timestamptz), -- England vs Croatia
  ( 21,  23, '2026-06-17T20:00:00+03:00'::timestamptz), -- Portugal vs DR Congo
  ( 24,  24, '2026-06-18T05:00:00+03:00'::timestamptz), -- Uzbekistan vs Colombia
  ( 25,  25, '2026-06-18T19:00:00+03:00'::timestamptz), -- Czech Republic vs South Africa
  ( 26,  26, '2026-06-18T22:00:00+03:00'::timestamptz), -- Switzerland vs Bosnia and Herzegovina
  ( 28,  27, '2026-06-19T01:00:00+03:00'::timestamptz), -- Canada vs Qatar
  ( 27,  28, '2026-06-19T04:00:00+03:00'::timestamptz), -- Mexico vs South Korea
  ( 29,  29, '2026-06-20T03:30:00+03:00'::timestamptz), -- Brazil vs Haiti
  ( 30,  30, '2026-06-20T01:00:00+03:00'::timestamptz), -- Scotland vs Morocco
  ( 32,  31, '2026-06-20T06:00:00+03:00'::timestamptz), -- Turkey vs Paraguay
  ( 31,  32, '2026-06-19T22:00:00+03:00'::timestamptz), -- United States vs Australia
  ( 33,  33, '2026-06-20T23:00:00+03:00'::timestamptz), -- Germany vs Ivory Coast
  ( 34,  34, '2026-06-21T03:00:00+03:00'::timestamptz), -- Ecuador vs Curaçao
  ( 35,  35, '2026-06-20T20:00:00+03:00'::timestamptz), -- Netherlands vs Sweden
  ( 36,  36, '2026-06-21T07:00:00+03:00'::timestamptz), -- Tunisia vs Japan
  ( 40,  37, '2026-06-22T01:00:00+03:00'::timestamptz), -- Uruguay vs Cape Verde
  ( 39,  38, '2026-06-21T19:00:00+03:00'::timestamptz), -- Spain vs Saudi Arabia
  ( 37,  39, '2026-06-21T22:00:00+03:00'::timestamptz), -- Belgium vs Iran
  ( 38,  40, '2026-06-22T04:00:00+03:00'::timestamptz), -- New Zealand vs Egypt
  ( 42,  41, '2026-06-23T03:00:00+03:00'::timestamptz), -- Norway vs Senegal
  ( 41,  42, '2026-06-23T00:00:00+03:00'::timestamptz), -- France vs Iraq
  ( 43,  43, '2026-06-22T20:00:00+03:00'::timestamptz), -- Argentina vs Austria
  ( 44,  44, '2026-06-23T06:00:00+03:00'::timestamptz), -- Jordan vs Algeria
  ( 47,  45, '2026-06-23T23:00:00+03:00'::timestamptz), -- England vs Ghana
  ( 48,  46, '2026-06-24T02:00:00+03:00'::timestamptz), -- Panama vs Croatia
  ( 45,  47, '2026-06-23T20:00:00+03:00'::timestamptz), -- Portugal vs Uzbekistan
  ( 46,  48, '2026-06-24T05:00:00+03:00'::timestamptz), -- Colombia vs DR Congo
  ( 53,  49, '2026-06-25T01:00:00+03:00'::timestamptz), -- Scotland vs Brazil
  ( 54,  50, '2026-06-25T01:00:00+03:00'::timestamptz), -- Morocco vs Haiti
  ( 51,  51, '2026-06-24T22:00:00+03:00'::timestamptz), -- Switzerland vs Canada
  ( 52,  52, '2026-06-24T22:00:00+03:00'::timestamptz), -- Bosnia and Herzegovina vs Qatar
  ( 49,  53, '2026-06-25T04:00:00+03:00'::timestamptz), -- Czech Republic vs Mexico
  ( 50,  54, '2026-06-25T04:00:00+03:00'::timestamptz), -- South Africa vs South Korea
  ( 58,  55, '2026-06-25T23:00:00+03:00'::timestamptz), -- Curaçao vs Ivory Coast
  ( 57,  56, '2026-06-25T23:00:00+03:00'::timestamptz), -- Ecuador vs Germany
  ( 60,  57, '2026-06-26T02:00:00+03:00'::timestamptz), -- Japan vs Sweden
  ( 59,  58, '2026-06-26T02:00:00+03:00'::timestamptz), -- Tunisia vs Netherlands
  ( 55,  59, '2026-06-26T05:00:00+03:00'::timestamptz), -- Turkey vs United States
  ( 56,  60, '2026-06-26T05:00:00+03:00'::timestamptz), -- Paraguay vs Australia
  ( 65,  61, '2026-06-26T22:00:00+03:00'::timestamptz), -- Norway vs France
  ( 66,  62, '2026-06-26T22:00:00+03:00'::timestamptz), -- Senegal vs Iraq
  ( 62,  63, '2026-06-27T06:00:00+03:00'::timestamptz), -- Egypt vs Iran
  ( 61,  64, '2026-06-27T06:00:00+03:00'::timestamptz), -- New Zealand vs Belgium
  ( 64,  65, '2026-06-27T03:00:00+03:00'::timestamptz), -- Cape Verde vs Saudi Arabia
  ( 63,  66, '2026-06-27T03:00:00+03:00'::timestamptz), -- Uruguay vs Spain
  ( 71,  67, '2026-06-28T00:00:00+03:00'::timestamptz), -- Panama vs England
  ( 72,  68, '2026-06-28T00:00:00+03:00'::timestamptz), -- Croatia vs Ghana
  ( 68,  69, '2026-06-28T05:00:00+03:00'::timestamptz), -- Algeria vs Austria
  ( 67,  70, '2026-06-28T05:00:00+03:00'::timestamptz), -- Jordan vs Argentina
  ( 69,  71, '2026-06-28T02:30:00+03:00'::timestamptz), -- Colombia vs Portugal
  ( 70,  72, '2026-06-28T02:30:00+03:00'::timestamptz), -- DR Congo vs Uzbekistan
  ( 73,  73, '2026-06-28T22:00:00+03:00'::timestamptz), -- 2A vs 2B
  ( 74,  74, '2026-06-29T23:30:00+03:00'::timestamptz), -- 1E vs 3A/B/C/D/F
  ( 75,  75, '2026-06-30T04:00:00+03:00'::timestamptz), -- 1F vs 2C
  ( 76,  76, '2026-06-29T20:00:00+03:00'::timestamptz), -- 1C vs 2F
  ( 77,  77, '2026-07-01T00:00:00+03:00'::timestamptz), -- 1I vs 3C/D/F/G/H
  ( 78,  78, '2026-06-30T20:00:00+03:00'::timestamptz), -- 2E vs 2I
  ( 79,  79, '2026-07-01T04:00:00+03:00'::timestamptz), -- 1A vs 3C/E/F/H/I
  ( 80,  80, '2026-07-01T19:00:00+03:00'::timestamptz), -- 1L vs 3E/H/I/J/K
  ( 81,  81, '2026-07-02T03:00:00+03:00'::timestamptz), -- 1D vs 3B/E/F/I/J
  ( 82,  82, '2026-07-01T23:00:00+03:00'::timestamptz), -- 1G vs 3A/E/H/I/J
  ( 83,  83, '2026-07-03T02:00:00+03:00'::timestamptz), -- 2K vs 2L
  ( 84,  84, '2026-07-02T22:00:00+03:00'::timestamptz), -- 1H vs 2J
  ( 85,  85, '2026-07-03T06:00:00+03:00'::timestamptz), -- 1B vs 3E/F/G/I/J
  ( 86,  86, '2026-07-04T01:00:00+03:00'::timestamptz), -- 1J vs 2H
  ( 87,  87, '2026-07-04T04:30:00+03:00'::timestamptz), -- 1K vs 3D/E/I/J/L
  ( 88,  88, '2026-07-03T21:00:00+03:00'::timestamptz), -- 2D vs 2G
  ( 89,  89, '2026-07-05T00:00:00+03:00'::timestamptz), -- Winner Match 74 vs Winner Match 77
  ( 90,  90, '2026-07-04T20:00:00+03:00'::timestamptz), -- Winner Match 73 vs Winner Match 75
  ( 91,  91, '2026-07-05T23:00:00+03:00'::timestamptz), -- Winner Match 76 vs Winner Match 78
  ( 92,  92, '2026-07-06T03:00:00+03:00'::timestamptz), -- Winner Match 79 vs Winner Match 80
  ( 93,  93, '2026-07-06T22:00:00+03:00'::timestamptz), -- Winner Match 83 vs Winner Match 84
  ( 94,  94, '2026-07-07T03:00:00+03:00'::timestamptz), -- Winner Match 81 vs Winner Match 82
  ( 95,  95, '2026-07-07T19:00:00+03:00'::timestamptz), -- Winner Match 86 vs Winner Match 88
  ( 96,  96, '2026-07-07T23:00:00+03:00'::timestamptz), -- Winner Match 85 vs Winner Match 87
  ( 97,  97, '2026-07-09T23:00:00+03:00'::timestamptz), -- Winner Match 89 vs Winner Match 90
  ( 98,  98, '2026-07-10T22:00:00+03:00'::timestamptz), -- Winner Match 93 vs Winner Match 94
  ( 99,  99, '2026-07-12T00:00:00+03:00'::timestamptz), -- Winner Match 91 vs Winner Match 92
  (100, 100, '2026-07-12T04:00:00+03:00'::timestamptz), -- Winner Match 95 vs Winner Match 96
  (101, 101, '2026-07-14T22:00:00+03:00'::timestamptz), -- Winner Match 97 vs Winner Match 98
  (102, 102, '2026-07-15T22:00:00+03:00'::timestamptz), -- Winner Match 99 vs Winner Match 100
  (103, 103, '2026-07-19T00:00:00+03:00'::timestamptz), -- Loser Match 101 vs Loser Match 102
  (104, 104, '2026-07-19T22:00:00+03:00'::timestamptz) -- Winner Match 101 vs Winner Match 102
;

ALTER TABLE public.predictions DROP CONSTRAINT IF EXISTS predictions_match_id_fkey;
ALTER TABLE public.bets DROP CONSTRAINT IF EXISTS bets_match_id_fkey;
ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS matches_number_range;
ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS matches_match_number_range;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgrelid = 'public.matches'::regclass
      AND tgname = 'matches_set_updated_at'
  ) THEN
    EXECUTE 'ALTER TABLE public.matches DISABLE TRIGGER matches_set_updated_at';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgrelid = 'public.predictions'::regclass
      AND tgname = 'predictions_set_updated_at'
  ) THEN
    EXECUTE 'ALTER TABLE public.predictions DISABLE TRIGGER predictions_set_updated_at';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgrelid = 'public.bets'::regclass
      AND tgname = 'bets_set_updated_at'
  ) THEN
    EXECUTE 'ALTER TABLE public.bets DISABLE TRIGGER bets_set_updated_at';
  END IF;
END $$;

UPDATE public.predictions AS prediction
SET match_id = -schedule.old_match_number
FROM fifa_schedule_20260426 AS schedule
WHERE prediction.match_id = schedule.old_match_number;

UPDATE public.bets AS bet
SET match_id = -schedule.old_match_number
FROM fifa_schedule_20260426 AS schedule
WHERE bet.match_id = schedule.old_match_number;

UPDATE public.matches AS match
SET match_number = -schedule.old_match_number
FROM fifa_schedule_20260426 AS schedule
WHERE match.match_number = schedule.old_match_number;

UPDATE public.matches AS match
SET
  match_number = schedule.match_number,
  date_time = schedule.date_time
FROM fifa_schedule_20260426 AS schedule
WHERE match.match_number = -schedule.old_match_number;

UPDATE public.predictions AS prediction
SET match_id = schedule.match_number
FROM fifa_schedule_20260426 AS schedule
WHERE prediction.match_id = -schedule.old_match_number;

UPDATE public.bets AS bet
SET match_id = schedule.match_number
FROM fifa_schedule_20260426 AS schedule
WHERE bet.match_id = -schedule.old_match_number;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgrelid = 'public.matches'::regclass
      AND tgname = 'matches_set_updated_at'
  ) THEN
    EXECUTE 'ALTER TABLE public.matches ENABLE TRIGGER matches_set_updated_at';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgrelid = 'public.predictions'::regclass
      AND tgname = 'predictions_set_updated_at'
  ) THEN
    EXECUTE 'ALTER TABLE public.predictions ENABLE TRIGGER predictions_set_updated_at';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgrelid = 'public.bets'::regclass
      AND tgname = 'bets_set_updated_at'
  ) THEN
    EXECUTE 'ALTER TABLE public.bets ENABLE TRIGGER bets_set_updated_at';
  END IF;
END $$;

ALTER TABLE public.matches
  ADD CONSTRAINT matches_number_range
  CHECK (match_number BETWEEN 1 AND 104);

ALTER TABLE public.predictions
  ADD CONSTRAINT predictions_match_id_fkey
  FOREIGN KEY (match_id)
  REFERENCES public.matches(match_number)
  ON DELETE CASCADE;

ALTER TABLE public.bets
  ADD CONSTRAINT bets_match_id_fkey
  FOREIGN KEY (match_id)
  REFERENCES public.matches(match_number)
  ON DELETE CASCADE
  NOT VALID;
