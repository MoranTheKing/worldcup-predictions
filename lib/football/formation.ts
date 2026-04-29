export type FootballLineupCandidate = {
  id: number | string;
  name: string;
  position?: string | null;
  shirt_number?: number | string | null;
  top_scorer_odds?: number | string | null;
  goals?: number | null;
  assists?: number | null;
  appearances?: number | null;
  minutes_played?: number | null;
};

export type FootballFormationLine<T extends FootballLineupCandidate> = {
  key: string;
  label: string;
  role: FootballPositionKey;
  players: T[];
};

export type FootballPositionKey = "goalkeeper" | "defender" | "midfielder" | "forward" | "other";

type LineRequest = {
  key: string;
  label: string;
  role: FootballPositionKey;
  count: number;
};

export function buildFootballFormation<T extends FootballLineupCandidate>(
  players: T[],
  formationName: string | null | undefined,
  selectedStarters: T[] = [],
): FootballFormationLine<T>[] {
  const structure = parseFormation(formationName);
  const candidatePool = selectedStarters.length > 0 ? selectedStarters : players;
  const grouped = {
    goalkeeper: sortLineupCandidates(candidatePool.filter((player) => getFootballPositionKey(player.position) === "goalkeeper"), "goalkeeper"),
    defender: sortLineupCandidates(candidatePool.filter((player) => getFootballPositionKey(player.position) === "defender"), "defender"),
    midfielder: sortLineupCandidates(candidatePool.filter((player) => getFootballPositionKey(player.position) === "midfielder"), "midfielder"),
    forward: sortLineupCandidates(candidatePool.filter((player) => getFootballPositionKey(player.position) === "forward"), "forward"),
    other: sortLineupCandidates(candidatePool.filter((player) => getFootballPositionKey(player.position) === "other"), "other"),
  };
  const orderedPlayers = sortLineupCandidates(players, "other");
  const used = new Set<T["id"]>();

  const pick = (list: T[], amount: number) => {
    const selected = list.filter((player) => !used.has(player.id)).slice(0, amount);
    selected.forEach((player) => used.add(player.id));
    return selected;
  };
  const fill = (line: T[], role: FootballPositionKey, amount: number) => {
    if (line.length >= amount) return line;
    const fallbackOrder = role === "goalkeeper"
      ? [...grouped.other, ...orderedPlayers]
      : [...grouped.other, ...grouped.midfielder, ...grouped.defender, ...grouped.forward, ...orderedPlayers];
    return [...line, ...pick(fallbackOrder, amount - line.length)];
  };

  return buildLineRequests(structure).map((request) => {
    const rolePlayers = pick(grouped[request.role], request.count);
    return {
      key: request.key,
      label: request.label,
      role: request.role,
      players: fill(rolePlayers, request.role, request.count),
    };
  }).filter((line) => line.players.length > 0);
}

export function getFootballPositionKey(position: string | null | undefined): FootballPositionKey {
  if (!position) return "other";
  const normalized = position.trim().toLowerCase();
  if (normalized === "g" || normalized === "gk") return "goalkeeper";
  if (normalized === "d") return "defender";
  if (normalized === "m") return "midfielder";
  if (normalized === "f") return "forward";
  if (normalized.includes("goal") || normalized.includes("keeper")) return "goalkeeper";
  if (normalized.includes("def") || normalized.includes("back")) return "defender";
  if (normalized.includes("mid")) return "midfielder";
  if (normalized.includes("att") || normalized.includes("for") || normalized.includes("striker") || normalized.includes("wing")) {
    return "forward";
  }
  return "other";
}

export function normalizeFootballPosition(position: string | null | undefined) {
  const normalized = String(position ?? "").trim().toUpperCase();
  if (normalized === "G" || normalized === "GK") return "Goalkeeper";
  if (normalized === "D") return "Defender";
  if (normalized === "M") return "Midfielder";
  if (normalized === "F") return "Forward";
  return position ?? null;
}

export function formatFormation(value: string | null | undefined) {
  const parts = String(value ?? "")
    .split("-")
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.length >= 3 ? parts.join("-") : "4-3-3";
}

function parseFormation(formationName: string | null | undefined) {
  const parts = formatFormation(formationName)
    .split("-")
    .map((part) => Number(part.trim()))
    .filter((part) => Number.isInteger(part) && part > 0);

  if (parts.length < 3 || parts.reduce((sum, part) => sum + part, 0) !== 10) {
    return { defenders: 4, midfield: [3], forwards: 3 };
  }

  return {
    defenders: parts[0] ?? 4,
    midfield: parts.slice(1, -1),
    forwards: parts.at(-1) ?? 3,
  };
}

function buildLineRequests(structure: { defenders: number; midfield: number[]; forwards: number }) {
  const midfield = structure.midfield.slice().reverse();
  const requests: LineRequest[] = [
    {
      key: "forward",
      label: structure.forwards === 1 ? "חלוץ" : "התקפה",
      role: "forward",
      count: structure.forwards,
    },
    ...midfield.map((count, index) => ({
      key: `midfield-${index}`,
      label: getMidfieldLineLabel(index, midfield.length),
      role: "midfielder" as const,
      count,
    })),
    {
      key: "defender",
      label: "הגנה",
      role: "defender",
      count: structure.defenders,
    },
    {
      key: "goalkeeper",
      label: "שער",
      role: "goalkeeper",
      count: 1,
    },
  ];

  return requests.filter((request) => request.count > 0);
}

function getMidfieldLineLabel(indexFromAttack: number, totalLines: number) {
  if (totalLines <= 1) return "קישור";
  if (totalLines === 2) return indexFromAttack === 0 ? "קישור קדמי" : "קישור אחורי";
  if (indexFromAttack === 0) return "קישור קדמי";
  if (indexFromAttack === totalLines - 1) return "קישור אחורי";
  return "קישור מרכזי";
}

function sortLineupCandidates<T extends FootballLineupCandidate>(players: T[], role: FootballPositionKey) {
  return players.slice().sort((left, right) => {
    return getLineupScore(right, role) - getLineupScore(left, role) || left.name.localeCompare(right.name, "he");
  });
}

function getLineupScore(player: FootballLineupCandidate, role: FootballPositionKey) {
  const shirtNumber = Number(player.shirt_number);
  const odds = Number(player.top_scorer_odds);
  let score = 0;

  score += (player.appearances ?? 0) * 8;
  score += Math.min(player.minutes_played ?? 0, 900) / 30;
  score += (player.goals ?? 0) * 6;
  score += (player.assists ?? 0) * 4;

  if (Number.isFinite(odds)) {
    score += Math.max(0, 420 - odds) / (role === "forward" ? 3 : 7);
  }

  if (Number.isFinite(shirtNumber)) {
    if (role === "goalkeeper" && shirtNumber === 1) score += 80;
    if (shirtNumber >= 1 && shirtNumber <= 11) score += 30;
    if (shirtNumber >= 12 && shirtNumber <= 23) score += 8;
  }

  return score;
}
