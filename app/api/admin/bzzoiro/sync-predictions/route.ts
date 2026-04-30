import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { bzzoiroGetPaginated } from "@/lib/bzzoiro/client";
import { normalizeTeamNameKey } from "@/lib/i18n/team-names";
import { isAuthorizedAdminRequest } from "@/lib/security/admin-api";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type LocalMatchRow = {
  match_number: number;
  date_time: string | null;
  home_team_id: string | null;
  away_team_id: string | null;
  home_placeholder: string | null;
  away_placeholder: string | null;
};

type LocalTeamRow = {
  id: string;
  name: string | null;
  name_he: string | null;
  bzzoiro_team_id: string | null;
};

type BzzoiroPrediction = {
  id?: number | string | null;
  created_at?: string | null;
  prob_home_win?: number | string | null;
  prob_draw?: number | string | null;
  prob_away_win?: number | string | null;
  predicted_result?: string | null;
  expected_home_goals?: number | string | null;
  expected_away_goals?: number | string | null;
  confidence?: number | string | null;
  model_version?: string | null;
  most_likely_score?: string | null;
  favorite?: string | null;
  favorite_prob?: number | string | null;
  winner_recommend?: boolean | null;
  event?: BzzoiroPredictionEvent | null;
};

type BzzoiroPredictionEvent = {
  id?: number | string | null;
  event_date?: string | null;
  date?: string | null;
  home_team?: string | null;
  away_team?: string | null;
  home_team_obj?: { id?: number | string | null; name?: string | null; short_name?: string | null } | null;
  away_team_obj?: { id?: number | string | null; name?: string | null; short_name?: string | null } | null;
  league?: { id?: number | string | null; name?: string | null } | null;
};

type PredictionUpdate = {
  bsd_prediction_id: string | null;
  bsd_prediction_created_at: string | null;
  bsd_prob_home_win: number | null;
  bsd_prob_draw: number | null;
  bsd_prob_away_win: number | null;
  bsd_predicted_result: string | null;
  bsd_expected_home_goals: number | null;
  bsd_expected_away_goals: number | null;
  bsd_prediction_confidence: number | null;
  bsd_most_likely_score: string | null;
  bsd_prediction_model_version: string | null;
  bsd_prediction_raw: BzzoiroPrediction;
  bsd_prediction_synced_at: string;
};

export async function POST(request: Request) {
  if (!isAuthorizedAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const leagueId = process.env.BSD_WORLD_CUP_LEAGUE_ID;
  if (!leagueId) {
    return NextResponse.json({ error: "Missing BSD_WORLD_CUP_LEAGUE_ID" }, { status: 500 });
  }

  const supabase = createAdminClient();
  const [{ data: matchesData, error: matchesError }, { data: teamsData, error: teamsError }] =
    await Promise.all([
      supabase
        .from("matches")
        .select("match_number, date_time, home_team_id, away_team_id, home_placeholder, away_placeholder")
        .order("date_time", { ascending: true }),
      supabase.from("teams").select("id, name, name_he, bzzoiro_team_id"),
    ]);

  if (matchesError) {
    return NextResponse.json({ error: matchesError.message }, { status: 500 });
  }

  if (teamsError) {
    return NextResponse.json({ error: teamsError.message }, { status: 500 });
  }

  const matches = ((matchesData ?? []) as LocalMatchRow[]).filter((match) => match.date_time);
  const teamsById = new Map(((teamsData ?? []) as LocalTeamRow[]).map((team) => [team.id, team]));
  const predictions = await fetchBzzoiroPredictions(leagueId);
  const now = new Date().toISOString();
  let updated = 0;
  let skippedNoMatch = 0;
  const matchedMatchNumbers = new Set<number>();

  for (const prediction of predictions) {
    const event = prediction.event;
    if (!event || !sameId(event.league?.id, leagueId)) continue;

    const match = findMatchingMatch(matches, teamsById, event, matchedMatchNumbers);
    if (!match) {
      skippedNoMatch += 1;
      continue;
    }

    const payload = buildPredictionUpdate(prediction, now);
    const { error } = await supabase
      .from("matches")
      .update(payload)
      .eq("match_number", match.match_number);

    if (error) {
      return NextResponse.json(
        { error: error.message, match: match.match_number, prediction: prediction.id ?? null },
        { status: 500 },
      );
    }

    matchedMatchNumbers.add(match.match_number);
    updated += 1;
  }

  revalidatePath("/dashboard", "layout");
  revalidatePath("/game", "layout");
  revalidatePath("/game/predictions");
  revalidatePath("/dev-tools");

  return NextResponse.json({
    checked: predictions.length,
    updated,
    skippedNoMatch,
  });
}

async function fetchBzzoiroPredictions(leagueId: string) {
  const byLeague = await bzzoiroGetPaginated<BzzoiroPrediction>(
    "/predictions/",
    { league: leagueId },
    8,
  );

  if (byLeague.length > 0) {
    return byLeague;
  }

  // BSD currently returns an empty page for future World Cup predictions.
  // Keep a bounded fallback so this route starts working if league filtering lags behind the feed.
  const allRecent = await bzzoiroGetPaginated<BzzoiroPrediction>("/predictions/", {}, 4);
  return allRecent.filter((prediction) => sameId(prediction.event?.league?.id, leagueId));
}

function buildPredictionUpdate(prediction: BzzoiroPrediction, now: string): PredictionUpdate {
  return {
    bsd_prediction_id: prediction.id === null || prediction.id === undefined ? null : String(prediction.id),
    bsd_prediction_created_at: normalizeIsoDate(prediction.created_at),
    bsd_prob_home_win: normalizeNumber(prediction.prob_home_win),
    bsd_prob_draw: normalizeNumber(prediction.prob_draw),
    bsd_prob_away_win: normalizeNumber(prediction.prob_away_win),
    bsd_predicted_result: normalizeText(prediction.predicted_result),
    bsd_expected_home_goals: normalizeNumber(prediction.expected_home_goals),
    bsd_expected_away_goals: normalizeNumber(prediction.expected_away_goals),
    bsd_prediction_confidence: normalizeNumber(prediction.confidence ?? prediction.favorite_prob),
    bsd_most_likely_score: normalizeText(prediction.most_likely_score),
    bsd_prediction_model_version: normalizeText(prediction.model_version),
    bsd_prediction_raw: prediction,
    bsd_prediction_synced_at: now,
  };
}

function findMatchingMatch(
  matches: LocalMatchRow[],
  teamsById: Map<string, LocalTeamRow>,
  event: BzzoiroPredictionEvent,
  alreadyMatched: Set<number>,
) {
  const eventTime = getEventTime(event);
  if (!Number.isFinite(eventTime)) return null;

  return matches
    .map((match) => {
      if (alreadyMatched.has(match.match_number)) return null;

      const matchTime = match.date_time ? new Date(match.date_time).getTime() : Number.NaN;
      const timeDistance = Number.isFinite(matchTime) ? Math.abs(eventTime - matchTime) : Infinity;
      if (timeDistance > 36 * 60 * 60 * 1000) return null;

      const homeTeam = match.home_team_id ? teamsById.get(match.home_team_id) ?? null : null;
      const awayTeam = match.away_team_id ? teamsById.get(match.away_team_id) ?? null : null;
      const idsMatch =
        homeTeam !== null &&
        awayTeam !== null &&
        sameId(event.home_team_obj?.id, homeTeam.bzzoiro_team_id) &&
        sameId(event.away_team_obj?.id, awayTeam.bzzoiro_team_id);
      const namesMatch =
        homeTeam !== null &&
        awayTeam !== null &&
        buildTeamKeys(homeTeam).has(normalizeTeamNameKey(event.home_team_obj?.name ?? event.home_team)) &&
        buildTeamKeys(awayTeam).has(normalizeTeamNameKey(event.away_team_obj?.name ?? event.away_team));
      const placeholdersMatch =
        Boolean(match.home_placeholder && match.away_placeholder) &&
        normalizePlaceholder(match.home_placeholder) === normalizePlaceholder(event.home_team_obj?.name ?? event.home_team) &&
        normalizePlaceholder(match.away_placeholder) === normalizePlaceholder(event.away_team_obj?.name ?? event.away_team);

      if (!idsMatch && !namesMatch && !placeholdersMatch) return null;

      return {
        match,
        score:
          (idsMatch ? 30_000 : 0) +
          (namesMatch ? 20_000 : 0) +
          (placeholdersMatch ? 12_000 : 0) -
          timeDistance / 60_000,
        timeDistance,
      };
    })
    .filter((candidate): candidate is { match: LocalMatchRow; score: number; timeDistance: number } => candidate !== null)
    .sort((left, right) => right.score - left.score || left.timeDistance - right.timeDistance)[0]?.match ?? null;
}

function buildTeamKeys(team: LocalTeamRow) {
  return new Set(
    [team.name, team.name_he]
      .map((value) => normalizeTeamNameKey(value))
      .filter(Boolean),
  );
}

function normalizePlaceholder(value: string | null | undefined) {
  return String(value ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9/]/g, "");
}

function getEventTime(event: BzzoiroPredictionEvent) {
  return new Date(event.event_date ?? event.date ?? "").getTime();
}

function sameId(left: number | string | null | undefined, right: number | string | null | undefined) {
  return Boolean(left !== null && left !== undefined && right !== null && right !== undefined && String(left) === String(right));
}

function normalizeNumber(value: number | string | null | undefined) {
  const parsed = typeof value === "string" ? Number.parseFloat(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) ? Math.round(parsed * 10_000) / 10_000 : null;
}

function normalizeText(value: string | null | undefined) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeIsoDate(value: string | null | undefined) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}
