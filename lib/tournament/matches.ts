export type MatchStatus = "scheduled" | "live" | "finished";

export type MatchPhase =
  | "first_half"
  | "halftime"
  | "second_half"
  | "extra_time"
  | "penalties";

export type MatchStageKind =
  | "group"
  | "round_of_32"
  | "round_of_16"
  | "quarter_final"
  | "semi_final"
  | "third_place"
  | "final"
  | "unknown";

export type TournamentTeamRecord = {
  id: string;
  name: string;
  name_he: string | null;
  logo_url: string | null;
  group_letter: string | null;
  points?: number | null;
  goals_for?: number | null;
  goals_against?: number | null;
  fair_play_score?: number | null;
  fifa_ranking?: number | null;
  played_count?: number | null;
  is_eliminated?: boolean | null;
  outright_odds?: number | string | null;
  outright_odds_updated_at?: string | null;
  coach_name?: string | null;
  coach_bzzoiro_id?: number | string | null;
  coach_photo_url?: string | null;
  coach_updated_at?: string | null;
  bzzoiro_team_id?: number | string | null;
};

export type TournamentMatchRecord = {
  match_number: number;
  stage: string;
  status: MatchStatus | string;
  match_phase: MatchPhase | null;
  date_time: string;
  minute: number | null;
  home_team_id: string | null;
  away_team_id: string | null;
  home_placeholder: string | null;
  away_placeholder: string | null;
  home_score: number | null;
  away_score: number | null;
  home_odds?: number | string | null;
  draw_odds?: number | string | null;
  away_odds?: number | string | null;
  is_extra_time: boolean | null;
  home_penalty_score: number | null;
  away_penalty_score: number | null;
};

export type MatchWithTeams = TournamentMatchRecord & {
  homeTeam: TournamentTeamRecord | null;
  awayTeam: TournamentTeamRecord | null;
};

export type MatchScoreSummary = {
  regularScore: string;
  displayScore: string;
  homeScore: number;
  awayScore: number;
  homePenaltyScore: number | null;
  awayPenaltyScore: number | null;
  hasPenalties: boolean;
  isExtraTime: boolean;
  statusSuffix: "PEN" | "ET" | null;
};

export function formatScorePair(homeScore: number, awayScore: number) {
  return `${homeScore} - ${awayScore}`;
}

export function formatRtlVisualScoreSummary(summary: MatchScoreSummary) {
  const regularScore = formatScorePair(summary.awayScore, summary.homeScore);

  if (summary.hasPenalties && summary.homePenaltyScore !== null && summary.awayPenaltyScore !== null) {
    return `${regularScore} (${formatScorePair(summary.awayPenaltyScore, summary.homePenaltyScore)} PEN)`;
  }

  return summary.statusSuffix ? `${regularScore} ${summary.statusSuffix}` : regularScore;
}

const STAGE_LABELS_HE: Record<MatchStageKind, string> = {
  group: "שלב בתים",
  round_of_32: "32 האחרונות",
  round_of_16: "16 האחרונות",
  quarter_final: "רבע גמר",
  semi_final: "חצי גמר",
  third_place: "מקום שלישי",
  final: "גמר",
  unknown: "שלב לא ידוע",
};

const TEAM_NAME_ALIASES: Record<string, string> = {
  turkey: "turkiye",
  turkiye: "turkiye",
  curacao: "curacao",
  curacaoo: "curacao",
  usa: "unitedstates",
  unitedstatesofamerica: "unitedstates",
  cote_divoire: "ivorycoast",
  cotedivoire: "ivorycoast",
  ivorycoast: "ivorycoast",
  drcongo: "drcongo",
  drc: "drcongo",
  republicofkorea: "southkorea",
  korea: "southkorea",
  czechrepublic: "czechia",
  czechia: "czechia",
  bosniaherzegovina: "bosniaandherzegovina",
  bosniaandherzegovina: "bosniaandherzegovina",
};

function compactAlphaNumeric(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "")
    .toLowerCase();
}

export function normalizeTournamentTeamName(value: string) {
  const normalized = compactAlphaNumeric(value);
  return TEAM_NAME_ALIASES[normalized] ?? normalized;
}

export function getMatchStageKind(stage: string): MatchStageKind {
  const value = stage.trim().toLowerCase();

  if (value.startsWith("group ")) return "group";
  if (value === "round of 32") return "round_of_32";
  if (value === "round of 16") return "round_of_16";
  if (value === "quarter-final" || value === "quarter final") return "quarter_final";
  if (value === "semi-final" || value === "semi final") return "semi_final";
  if (value === "third place" || value === "third-place") return "third_place";
  if (value === "final") return "final";

  return "unknown";
}

export function isKnockoutStage(stage: string) {
  const kind = getMatchStageKind(stage);
  return kind !== "group" && kind !== "unknown";
}

export function getStageLabelHe(stage: string) {
  const kind = getMatchStageKind(stage);
  return kind === "group" ? stage : STAGE_LABELS_HE[kind];
}

export function getGroupLetterFromStage(stage: string) {
  if (getMatchStageKind(stage) !== "group") return null;
  return stage.trim().replace(/^Group\s+/i, "") || null;
}

export function formatMatchDateLabel(iso: string, timeZone = "Asia/Jerusalem") {
  try {
    return new Date(iso).toLocaleDateString("he-IL", {
      timeZone,
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  } catch {
    return iso;
  }
}

export function formatMatchTimeLabel(iso: string, timeZone = "Asia/Jerusalem") {
  try {
    return new Date(iso).toLocaleTimeString("he-IL", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function getFlagEmojiFromLogoUrl(logoUrl: string | null) {
  if (!logoUrl) return null;

  const match = logoUrl.match(/\/([a-z]{2})\.(?:png|svg|webp|jpg|jpeg)(?:\?.*)?$/i);
  const countryCode = match?.[1]?.toUpperCase();
  if (!countryCode || countryCode.length !== 2) return null;

  return countryCode
    .split("")
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join("");
}

export function attachTeamsToMatches(
  matches: TournamentMatchRecord[],
  teams: TournamentTeamRecord[],
): MatchWithTeams[] {
  const teamsById = new Map(teams.map((team) => [team.id, team]));

  return matches.map((match) => ({
    ...match,
    homeTeam: match.home_team_id ? teamsById.get(match.home_team_id) ?? null : null,
    awayTeam: match.away_team_id ? teamsById.get(match.away_team_id) ?? null : null,
  }));
}

export function getTeamDisplayName(team: TournamentTeamRecord | null, placeholder: string | null) {
  if (team) return team.name_he ?? team.name;
  return placeholder ?? "ייקבע בהמשך";
}

export function getTeamDisplayLogo(team: TournamentTeamRecord | null) {
  return team?.logo_url ?? null;
}

export function isMatchScoreVisible(match: Pick<TournamentMatchRecord, "status">) {
  return match.status === "live" || match.status === "finished";
}

const FIRST_HALF_END_MINUTE = 45;
const SECOND_HALF_END_MINUTE = 90;
const EXTRA_TIME_END_MINUTE = 120;

export function getLiveMatchStatusLabel(minute: number | null, phase?: MatchPhase | null) {
  if (phase === "halftime") return "מחצית";
  if (phase === "penalties") return "פנדלים";
  if (phase === "extra_time") {
    if (minute === null) return "הארכה";
    if (minute > EXTRA_TIME_END_MINUTE) return `${EXTRA_TIME_END_MINUTE}+${minute - EXTRA_TIME_END_MINUTE}' הארכה`;
    return `${minute}' הארכה`;
  }

  if (minute === null) return "LIVE";

  if (phase === "first_half" && minute > FIRST_HALF_END_MINUTE) {
    return `${FIRST_HALF_END_MINUTE}+${minute - FIRST_HALF_END_MINUTE}' LIVE`;
  }

  if (phase === "second_half" && minute > SECOND_HALF_END_MINUTE) {
    return `${SECOND_HALF_END_MINUTE}+${minute - SECOND_HALF_END_MINUTE}' LIVE`;
  }

  return `${minute}' LIVE`;
}

export function getMatchScoreSummary(match: {
  home_score: number | null;
  away_score: number | null;
  home_penalty_score?: number | null;
  away_penalty_score?: number | null;
  is_extra_time?: boolean | null;
}): MatchScoreSummary | null {
  if (match.home_score === null || match.away_score === null) return null;

  const regularScore = formatScorePair(match.home_score, match.away_score);
  const hasPenalties =
    match.home_score === match.away_score &&
    match.home_penalty_score !== null &&
    match.home_penalty_score !== undefined &&
    match.away_penalty_score !== null &&
    match.away_penalty_score !== undefined;

  if (hasPenalties) {
    const homePenaltyScore = match.home_penalty_score as number;
    const awayPenaltyScore = match.away_penalty_score as number;

    return {
      regularScore,
      displayScore: `${regularScore} (${formatScorePair(homePenaltyScore, awayPenaltyScore)} PEN)`,
      homeScore: match.home_score,
      awayScore: match.away_score,
      homePenaltyScore,
      awayPenaltyScore,
      hasPenalties: true,
      isExtraTime: Boolean(match.is_extra_time),
      statusSuffix: "PEN",
    };
  }

  if (match.is_extra_time) {
    return {
      regularScore,
      displayScore: `${regularScore} ET`,
      homeScore: match.home_score,
      awayScore: match.away_score,
      homePenaltyScore: null,
      awayPenaltyScore: null,
      hasPenalties: false,
      isExtraTime: true,
      statusSuffix: "ET",
    };
  }

  return {
    regularScore,
    displayScore: regularScore,
    homeScore: match.home_score,
    awayScore: match.away_score,
    homePenaltyScore: null,
    awayPenaltyScore: null,
    hasPenalties: false,
    isExtraTime: false,
    statusSuffix: null,
  };
}
