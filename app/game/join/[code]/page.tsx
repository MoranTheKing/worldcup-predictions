import { notFound, redirect } from "next/navigation";
import {
  hasActiveJoinRateLimit,
  recordFailedJoinAttempt,
} from "@/lib/game/league-join-rate-limit";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import JoinLeagueLandingClient from "./JoinLeagueLandingClient";

export const dynamic = "force-dynamic";

export default async function JoinLeagueByCodePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const normalizedCode = code.trim().toUpperCase();

  if (!/^[A-Z0-9]{4}$/.test(normalizedCode)) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/game/join/${normalizedCode}`);
  }

  const admin = createAdminClient();
  const isRateLimited = await hasActiveJoinRateLimit(admin, user.id);

  if (isRateLimited) {
    notFound();
  }

  const { data: league, error } = await admin
    .from("leagues")
    .select("id, name, invite_code")
    .eq("invite_code", normalizedCode)
    .maybeSingle();

  if (error) {
    console.error("[JoinLeagueByCodePage] league lookup error:", error);
  }

  if (!league?.id) {
    await recordFailedJoinAttempt(admin, user.id);
    notFound();
  }

  const { data: membership } = await admin
    .from("league_members")
    .select("user_id")
    .eq("league_id", league.id)
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <JoinLeagueLandingClient
      inviteCode={normalizedCode}
      leagueId={String(league.id)}
      leagueName={String(league.name ?? "League")}
      alreadyMember={Boolean(membership)}
    />
  );
}
