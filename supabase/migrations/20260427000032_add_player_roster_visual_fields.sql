-- API-ready roster visuals for national team squad pages.
-- The UI can show player photos and shirt numbers as soon as the sync fills them.

ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS shirt_number INTEGER;
