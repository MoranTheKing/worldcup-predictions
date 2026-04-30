-- Keep BSD provider/model prediction metadata server-only.
-- Column-level REVOKE is not enough while table-level SELECT exists, so rebuild
-- the client grants as column grants for every non-BSD match column.

DO $$
DECLARE
  allowed_columns text;
BEGIN
  SELECT string_agg(format('%I', column_name), ', ' ORDER BY ordinal_position)
  INTO allowed_columns
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'matches'
    AND column_name NOT LIKE 'bsd\_%' ESCAPE '\';

  REVOKE SELECT ON TABLE public.matches FROM anon, authenticated;

  IF allowed_columns IS NOT NULL THEN
    EXECUTE format(
      'GRANT SELECT (%s) ON TABLE public.matches TO anon, authenticated',
      allowed_columns
    );
  END IF;
END $$;

COMMENT ON TABLE public.matches IS
  'World Cup match schedule/results. BSD provider prediction columns are restricted from anon/authenticated direct SELECT and should be read only through server-side admin paths.';
