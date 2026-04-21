-- ============================================================
-- Migration 7: Live match sync, status normalization, match numbering
-- ============================================================

-- 1. Add match_number + minute columns (nullable for backfill).
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS match_number INT,
  ADD COLUMN IF NOT EXISTS minute INT;

-- 2. Normalize legacy status values before tightening the constraint.
UPDATE public.matches
SET status = CASE
  WHEN status ILIKE 'finished' OR status ILIKE 'ft' OR status ILIKE 'finalized' THEN 'finished'
  WHEN status ILIKE 'live' OR status ILIKE '1h' OR status ILIKE '2h' OR status ILIKE 'ht' THEN 'live'
  ELSE 'scheduled'
END
WHERE status IS DISTINCT FROM 'scheduled'
   OR status IS NULL;

ALTER TABLE public.matches ALTER COLUMN status SET DEFAULT 'scheduled';

-- 3. Replace status check with the canonical 3-value enum.
DO $$
DECLARE cname TEXT;
BEGIN
  FOR cname IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.matches'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.matches DROP CONSTRAINT %I', cname);
  END LOOP;
END $$;

ALTER TABLE public.matches
  ADD CONSTRAINT matches_status_check
  CHECK (status IN ('scheduled','live','finished'));

-- 4. Expand stage to include round_of_32.
DO $$
DECLARE cname TEXT;
BEGIN
  FOR cname IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.matches'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%stage%'
  LOOP
    EXECUTE format('ALTER TABLE public.matches DROP CONSTRAINT %I', cname);
  END LOOP;
END $$;

ALTER TABLE public.matches
  ADD CONSTRAINT matches_stage_check
  CHECK (stage IN (
    'group','round_of_32','round_of_16','quarter_final','semi_final','third_place','final'
  ));

-- 5. Match numbers are 1-104 (72 group + 32 knockout) and unique when set.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.matches'::regclass AND conname = 'matches_match_number_range'
  ) THEN
    ALTER TABLE public.matches
      ADD CONSTRAINT matches_match_number_range
      CHECK (match_number IS NULL OR (match_number BETWEEN 1 AND 104));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS matches_match_number_unique
  ON public.matches(match_number)
  WHERE match_number IS NOT NULL;

-- 6. Minute is only meaningful for live matches; clamp to 0..130.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.matches'::regclass AND conname = 'matches_minute_range'
  ) THEN
    ALTER TABLE public.matches
      ADD CONSTRAINT matches_minute_range
      CHECK (minute IS NULL OR (minute BETWEEN 0 AND 130));
  END IF;
END $$;

-- 7. Helpful index for the matches list grouped by status + kickoff.
CREATE INDEX IF NOT EXISTS matches_status_date_idx
  ON public.matches(status, date_time);
