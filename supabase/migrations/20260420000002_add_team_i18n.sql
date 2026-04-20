-- Add Hebrew name and flag emoji columns to teams
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS name_he TEXT;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS flag    TEXT;
