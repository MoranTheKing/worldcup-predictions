-- Restrict BSD prediction metadata so authenticated clients cannot query it directly.
-- Service role updates are unaffected.

REVOKE SELECT (
  bsd_prediction_id,
  bsd_prediction_created_at,
  bsd_prob_home_win,
  bsd_prob_draw,
  bsd_prob_away_win,
  bsd_predicted_result,
  bsd_expected_home_goals,
  bsd_expected_away_goals,
  bsd_prediction_confidence,
  bsd_most_likely_score,
  bsd_prediction_model_version,
  bsd_prediction_raw,
  bsd_prediction_synced_at
) ON public.matches FROM anon, authenticated;
