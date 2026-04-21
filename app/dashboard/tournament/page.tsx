import { createClient } from "@/lib/supabase/server";
import TournamentClient from "./TournamentClient";

type Team = {
  id:           number;
  name:         string;
  name_he:      string | null;
  logo_url:     string | null;
  group_letter: string;
};

export default async function TournamentPage() {
  const supabase = await createClient();

  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, name_he, logo_url, group_letter")
    .order("group_letter")
    .order("name_he", { ascending: true });

  // Group teams by letter
  const groups: Record<string, Team[]> = {};
  for (const team of (teams ?? []) as Team[]) {
    groups[team.group_letter] = [...(groups[team.group_letter] ?? []), team];
  }

  const groupLetters = Object.keys(groups).sort();

  return <TournamentClient groups={groups} groupLetters={groupLetters} />;
}
