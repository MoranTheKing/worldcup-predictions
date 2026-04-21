import { config } from "dotenv";
config({ path: ".env.local" });

import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  getMatchStageKind,
  normalizeTournamentTeamName,
} from "../lib/tournament/matches";

type RawMatch = {
  match_number: number;
  stage: string;
  home: string;
  away: string;
  date_time: string;
};

type TeamRow = {
  id: string;
  name: string;
};

const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

if (!serviceKey || !supabaseUrl) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function resolveDatasetPath() {
  const explicit = process.argv[2];
  const candidates = [
    explicit,
    path.join(process.cwd(), "matches_data.json"),
    path.join(process.cwd(), "matches_data.json.txt"),
    path.join(process.cwd(), ".claude", "worktrees", "vigilant-heisenberg-440d8c", "matches_data.json.txt"),
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    try {
      await readFile(candidate, "utf8");
      return candidate;
    } catch {
      // Try the next path.
    }
  }

  throw new Error("Could not find matches_data.json(.txt). Pass the file path as an argument.");
}

async function loadMatches() {
  const datasetPath = await resolveDatasetPath();
  const raw = await readFile(datasetPath, "utf8");
  const parsed = JSON.parse(raw) as RawMatch[];

  if (!Array.isArray(parsed) || parsed.length !== 104) {
    throw new Error(`Expected 104 matches in ${datasetPath}, received ${Array.isArray(parsed) ? parsed.length : "invalid data"}.`);
  }

  return { datasetPath, matches: parsed };
}

function buildTeamMap(teams: TeamRow[]) {
  return new Map(
    teams.map((team) => [normalizeTournamentTeamName(team.name), team]),
  );
}

async function main() {
  const [{ datasetPath, matches }, { data: teams, error: teamsError }] = await Promise.all([
    loadMatches(),
    supabase.from("teams").select("id, name").order("name"),
  ]);

  if (teamsError) {
    throw new Error(`Failed reading teams: ${teamsError.message}`);
  }

  if (!teams || teams.length < 48) {
    throw new Error(`Expected 48 teams in the teams table before seeding matches, found ${teams?.length ?? 0}.`);
  }

  const teamsByName = buildTeamMap(teams);

  const rows = matches.map((match) => {
    const stageKind = getMatchStageKind(match.stage);

    if (match.match_number <= 72 || stageKind === "group") {
      const homeTeam = teamsByName.get(normalizeTournamentTeamName(match.home));
      const awayTeam = teamsByName.get(normalizeTournamentTeamName(match.away));

      if (!homeTeam || !awayTeam) {
        throw new Error(
          `Could not resolve teams for match ${match.match_number}: ${match.home} vs ${match.away}`,
        );
      }

      return {
        match_number: match.match_number,
        stage: match.stage,
        home_team_id: homeTeam.id,
        away_team_id: awayTeam.id,
        home_placeholder: null,
        away_placeholder: null,
        date_time: match.date_time,
        status: "scheduled" as const,
        home_score: 0,
        away_score: 0,
        minute: null,
      };
    }

    return {
      match_number: match.match_number,
      stage: match.stage,
      home_team_id: null,
      away_team_id: null,
      home_placeholder: match.home,
      away_placeholder: match.away,
      date_time: match.date_time,
      status: "scheduled" as const,
      home_score: 0,
      away_score: 0,
      minute: null,
    };
  });

  const { error: deleteError } = await supabase
    .from("matches")
    .delete()
    .gte("match_number", 1);

  if (deleteError) {
    throw new Error(`Failed clearing matches: ${deleteError.message}`);
  }

  const { error: insertError } = await supabase
    .from("matches")
    .insert(rows);

  if (insertError) {
    throw new Error(`Failed inserting matches: ${insertError.message}`);
  }

  console.log(`Seeded ${rows.length} matches from ${datasetPath}.`);
  console.log(`Group stage matches with team IDs: ${rows.filter((row) => row.match_number <= 72).length}`);
  console.log(`Knockout matches with placeholders: ${rows.filter((row) => row.match_number >= 73).length}`);
}

main().catch((error) => {
  console.error("Match seeding failed:", error);
  process.exit(1);
});
