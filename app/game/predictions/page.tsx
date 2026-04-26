import { requireServerMfa } from "@/lib/auth/mfa-server";
import { createClient } from "@/lib/supabase/server";
import { loadPredictionsHubData } from "@/lib/game/predictions-hub";
import PredictionsClient from "./PredictionsClient";

export const dynamic = "force-dynamic";

export default async function PredictionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await requireServerMfa(supabase, "/game/predictions");
  }

  const data = await loadPredictionsHubData(user?.id ?? null);

  return (
    <PredictionsClient
      currentUserId={user?.id ?? null}
      matches={data.matches}
      teams={data.teams}
      players={data.players}
      existingPredictions={data.existingPredictions}
      tournamentPrediction={data.tournamentPrediction}
      isAuthenticated={Boolean(user)}
      groupJokerUsedCount={data.groupJokerUsedCount}
      groupJokerLimit={data.groupJokerLimit}
      tournamentStarted={data.tournamentStarted}
    />
  );
}
