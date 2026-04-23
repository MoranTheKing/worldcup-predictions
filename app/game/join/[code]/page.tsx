import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import JoinLeagueLandingClient from "./JoinLeagueLandingClient";

export const dynamic = "force-dynamic";

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_BLOCK_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 5;

type JoinAttemptRow = {
  attempt_count: number;
  window_started_at: string;
  blocked_until: string | null;
};

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

async function hasActiveJoinRateLimit(admin: ReturnType<typeof createAdminClient>, userId: string) {
  const { data, error } = await admin
    .from("league_join_attempts")
    .select("attempt_count, window_started_at, blocked_until")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[JoinLeagueByCodePage] rate limit lookup error:", error);
    return false;
  }

  const row = data as JoinAttemptRow | null;

  if (!row?.blocked_until) {
    return false;
  }

  const blockedUntil = new Date(row.blocked_until).getTime();
  return !Number.isNaN(blockedUntil) && blockedUntil > Date.now();
}

async function recordFailedJoinAttempt(admin: ReturnType<typeof createAdminClient>, userId: string) {
  const { data, error } = await admin
    .from("league_join_attempts")
    .select("attempt_count, window_started_at, blocked_until")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[JoinLeagueByCodePage] failed attempt read error:", error);
    return;
  }

  const now = Date.now();
  const current = data as JoinAttemptRow | null;
  const windowStartedAt = current?.window_started_at
    ? new Date(current.window_started_at).getTime()
    : now;
  const isExpired = Number.isNaN(windowStartedAt) || now - windowStartedAt > RATE_LIMIT_WINDOW_MS;
  const nextAttemptCount = isExpired ? 1 : (current?.attempt_count ?? 0) + 1;
  const blockedUntil =
    nextAttemptCount >= RATE_LIMIT_MAX_ATTEMPTS
      ? new Date(now + RATE_LIMIT_BLOCK_MS).toISOString()
      : null;

  const { error: upsertError } = await admin.from("league_join_attempts").upsert(
    {
      user_id: userId,
      attempt_count: nextAttemptCount,
      window_started_at: isExpired
        ? new Date(now).toISOString()
        : current?.window_started_at ?? new Date(now).toISOString(),
      last_attempt_at: new Date(now).toISOString(),
      blocked_until: blockedUntil,
    },
    { onConflict: "user_id" },
  );

  if (upsertError) {
    console.error("[JoinLeagueByCodePage] failed attempt upsert error:", upsertError);
  }
}
