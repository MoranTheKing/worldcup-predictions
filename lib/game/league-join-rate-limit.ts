import { createAdminClient } from "@/lib/supabase/admin";

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_BLOCK_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 5;

type JoinAttemptRow = {
  attempt_count: number;
  window_started_at: string;
  blocked_until: string | null;
};

type SupabaseLikeError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

type AdminClient = ReturnType<typeof createAdminClient>;

export async function hasActiveJoinRateLimit(admin: AdminClient, userId: string) {
  const row = await getJoinAttemptRow(admin, userId);

  if (!row?.blocked_until) {
    return false;
  }

  const blockedUntil = new Date(row.blocked_until).getTime();
  return !Number.isNaN(blockedUntil) && blockedUntil > Date.now();
}

export async function getJoinRateLimitError(admin: AdminClient, userId: string) {
  const row = await getJoinAttemptRow(admin, userId);

  if (!row?.blocked_until) {
    return null;
  }

  const blockedUntil = new Date(row.blocked_until).getTime();
  if (Number.isNaN(blockedUntil) || blockedUntil <= Date.now()) {
    return null;
  }

  const minutes = Math.max(1, Math.ceil((blockedUntil - Date.now()) / 60000));
  return `נחסמת זמנית מהצטרפות לליגות. נסה שוב בעוד כ-${minutes} דקות.`;
}

export async function recordFailedJoinAttempt(admin: AdminClient, userId: string) {
  const current = await getJoinAttemptRow(admin, userId);
  const now = Date.now();
  const windowStartedAt = current?.window_started_at
    ? new Date(current.window_started_at).getTime()
    : now;
  const isExpired = Number.isNaN(windowStartedAt) || now - windowStartedAt > RATE_LIMIT_WINDOW_MS;
  const nextAttemptCount = isExpired ? 1 : (current?.attempt_count ?? 0) + 1;
  const blockedUntil =
    nextAttemptCount >= RATE_LIMIT_MAX_ATTEMPTS
      ? new Date(now + RATE_LIMIT_BLOCK_MS).toISOString()
      : null;

  const { error } = await admin.from("league_join_attempts").upsert(
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

  if (error) {
    console.error("[league join rate limit] upsert error:", formatSupabaseError(error));
  }
}

export async function clearJoinAttempts(admin: AdminClient, userId: string) {
  const { error } = await admin.from("league_join_attempts").delete().eq("user_id", userId);

  if (error) {
    console.error("[league join rate limit] delete error:", formatSupabaseError(error));
  }
}

async function getJoinAttemptRow(admin: AdminClient, userId: string) {
  const { data, error } = await admin
    .from("league_join_attempts")
    .select("attempt_count, window_started_at, blocked_until")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[league join rate limit] lookup error:", formatSupabaseError(error));
    return null;
  }

  return data as JoinAttemptRow | null;
}

function formatSupabaseError(error: SupabaseLikeError | null | undefined) {
  if (!error) {
    return "unknown error";
  }

  return error.message ?? error.details ?? error.hint ?? error.code ?? "unknown error";
}
