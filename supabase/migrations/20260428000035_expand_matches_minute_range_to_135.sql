-- Align DB minute constraint with app validation (supports stoppage time through 135).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.matches'::regclass
      AND conname = 'matches_minute_range'
  ) THEN
    ALTER TABLE public.matches DROP CONSTRAINT matches_minute_range;
  END IF;

  ALTER TABLE public.matches
    ADD CONSTRAINT matches_minute_range
    CHECK (minute IS NULL OR (minute BETWEEN 0 AND 135));
END $$;
