export type TournamentKickoffRow = {
  status?: string | null;
  date_time?: string | null;
};

export function hasTournamentStarted(match: TournamentKickoffRow | null | undefined) {
  if (!match) return false;

  if (match.status && match.status !== "scheduled") {
    return true;
  }

  if (!match.date_time) {
    return false;
  }

  const kickoff = new Date(match.date_time).getTime();
  return Number.isFinite(kickoff) ? kickoff <= Date.now() : false;
}
