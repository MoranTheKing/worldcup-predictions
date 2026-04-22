"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const INVITE_CODE_REGEX = /^[A-Z0-9]{4}$/;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_BLOCK_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 5;

export type LeagueActionState = {
  error?: string;
  field?: "name" | "invite_code";
  success?: boolean;
} | null;

type JoinAttemptRow = {
  user_id: string;
  attempt_count: number;
  window_started_at: string;
  blocked_until: string | null;
};

type LeagueOwnershipRow = {
  id: string;
  owner_id: string | null;
  invite_code?: string | null;
  name?: string | null;
};

type SupabaseLikeError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

export async function createLeague(
  _prev: LeagueActionState,
  formData: FormData,
): Promise<LeagueActionState> {
  const user = await requireAuthenticatedUser();

  if (!user) {
    return { error: "צריך להתחבר כדי ליצור ליגה." };
  }

  const name = formData.get("name")?.toString().trim();

  if (!name) {
    return { error: "שם הליגה הוא שדה חובה.", field: "name" };
  }

  const admin = createAdminClient();
  const { data: league, error: insertError } = await admin
    .from("leagues")
    .insert({ name, owner_id: user.id })
    .select("id")
    .single();

  if (insertError || !league?.id) {
    console.error("[createLeague] insert error:", formatSupabaseError(insertError));
    return { error: "לא הצלחנו ליצור את הליגה כרגע. נסה שוב בעוד רגע." };
  }

  const { error: memberError } = await admin
    .from("league_members")
    .upsert(
      {
        user_id: user.id,
        league_id: league.id,
      },
      { onConflict: "user_id,league_id" },
    );

  if (memberError) {
    console.error("[createLeague] owner membership upsert error:", formatSupabaseError(memberError));
  }

  revalidateLeaguePaths(league.id);
  redirect(`/game/leagues/${league.id}`);
}

export async function joinLeague(
  _prev: LeagueActionState,
  formData: FormData,
): Promise<LeagueActionState> {
  const inviteCode = normalizeInviteCode(formData.get("invite_code"));

  if (!inviteCode) {
    return {
      error: "יש להזין קוד הזמנה בן 4 תווים באנגלית או ספרות.",
      field: "invite_code",
    };
  }

  return joinLeagueByNormalizedCode(inviteCode);
}

export async function joinLeagueByCode(inviteCode: string): Promise<LeagueActionState> {
  const normalizedCode = normalizeInviteCode(inviteCode);

  if (!normalizedCode) {
    return { error: "קוד הזמנה לא תקין.", field: "invite_code" };
  }

  return joinLeagueByNormalizedCode(normalizedCode);
}

export async function joinLeagueByCodeAction(
  inviteCode: string,
  _prev: LeagueActionState,
  _formData: FormData,
): Promise<LeagueActionState> {
  void _prev;
  void _formData;
  return joinLeagueByCode(inviteCode);
}

export async function leaveLeague(
  _prev: LeagueActionState,
  formData: FormData,
): Promise<LeagueActionState> {
  const user = await requireAuthenticatedUser();

  if (!user) {
    return { error: "צריך להתחבר כדי לעזוב ליגה." };
  }

  const leagueId = normalizeUuid(formData.get("league_id"));
  const targetUserId = normalizeUuid(formData.get("target_user_id"));

  if (!leagueId || !targetUserId || user.id !== targetUserId) {
    return { error: "בקשה לא תקינה לעזיבת ליגה." };
  }

  const admin = createAdminClient();
  const league = await getLeagueOwnership(admin, leagueId);

  if (!league) {
    return { error: "הליגה לא נמצאה." };
  }

  if (league.owner_id === user.id) {
    return { error: "מנהל הליגה לא יכול לעזוב. אפשר למחוק את הליגה במקום זאת." };
  }

  const { error } = await admin
    .from("league_members")
    .delete()
    .eq("league_id", leagueId)
    .eq("user_id", targetUserId);

  if (error) {
    console.error("[leaveLeague] delete error:", formatSupabaseError(error));
    return { error: "לא הצלחנו להסיר אותך מהליגה." };
  }

  revalidateLeaguePaths(leagueId);
  redirect("/game/leagues");
}

export async function removeMember(
  _prev: LeagueActionState,
  formData: FormData,
): Promise<LeagueActionState> {
  const user = await requireAuthenticatedUser();

  if (!user) {
    return { error: "צריך להתחבר כדי לנהל את הליגה." };
  }

  const leagueId = normalizeUuid(formData.get("league_id"));
  const targetUserId = normalizeUuid(formData.get("target_user_id"));

  if (!leagueId || !targetUserId) {
    return { error: "בקשת ההסרה לא תקינה." };
  }

  const admin = createAdminClient();
  const league = await getLeagueOwnership(admin, leagueId);

  if (!league) {
    return { error: "הליגה לא נמצאה." };
  }

  if (league.owner_id !== user.id) {
    return { error: "רק מנהל הליגה יכול להסיר חברים." };
  }

  if (targetUserId === user.id) {
    return { error: "מנהל הליגה לא יכול להסיר את עצמו." };
  }

  const { error } = await admin
    .from("league_members")
    .delete()
    .eq("league_id", leagueId)
    .eq("user_id", targetUserId);

  if (error) {
    console.error("[removeMember] delete error:", formatSupabaseError(error));
    return { error: "לא הצלחנו להסיר את החבר מהליגה." };
  }

  revalidateLeaguePaths(leagueId);
  return { success: true };
}

export async function deleteLeague(
  _prev: LeagueActionState,
  formData: FormData,
): Promise<LeagueActionState> {
  const user = await requireAuthenticatedUser();

  if (!user) {
    return { error: "צריך להתחבר כדי למחוק ליגה." };
  }

  const leagueId = normalizeUuid(formData.get("league_id"));

  if (!leagueId) {
    return { error: "בקשת המחיקה לא תקינה." };
  }

  const admin = createAdminClient();
  const league = await getLeagueOwnership(admin, leagueId);

  if (!league) {
    return { error: "הליגה לא נמצאה." };
  }

  if (league.owner_id !== user.id) {
    return { error: "רק מנהל הליגה יכול למחוק את הליגה." };
  }

  const { error } = await admin.from("leagues").delete().eq("id", leagueId);

  if (error) {
    console.error("[deleteLeague] delete error:", formatSupabaseError(error));
    return { error: "לא הצלחנו למחוק את הליגה." };
  }

  revalidateLeaguePaths(leagueId);
  redirect("/game/leagues");
}

async function joinLeagueByNormalizedCode(inviteCode: string): Promise<LeagueActionState> {
  const user = await requireAuthenticatedUser();

  if (!user) {
    return { error: "צריך להתחבר כדי להצטרף לליגה." };
  }

  const admin = createAdminClient();
  const rateLimitError = await getJoinRateLimitError(admin, user.id);

  if (rateLimitError) {
    return { error: rateLimitError, field: "invite_code" };
  }

  const { data: league, error: lookupError } = await admin
    .from("leagues")
    .select("id, name")
    .eq("invite_code", inviteCode)
    .maybeSingle();

  if (lookupError || !league?.id) {
    console.error("[joinLeague] invite lookup error:", formatSupabaseError(lookupError));
    await recordFailedJoinAttempt(admin, user.id);
    return { error: "קוד ההזמנה לא תקין.", field: "invite_code" };
  }

  const { error: insertError } = await admin.from("league_members").upsert(
    {
      user_id: user.id,
      league_id: league.id,
    },
    { onConflict: "user_id,league_id" },
  );

  if (insertError && insertError.code !== "23505") {
    console.error("[joinLeague] membership insert error:", formatSupabaseError(insertError));
    return { error: "לא הצלחנו לצרף אותך לליגה כרגע." };
  }

  await clearJoinAttempts(admin, user.id);
  revalidateLeaguePaths(league.id);
  redirect(`/game/leagues/${league.id}`);
}

async function requireAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error("[league actions] auth error:", formatSupabaseError(error));
    return null;
  }

  return user;
}

async function getLeagueOwnership(admin: ReturnType<typeof createAdminClient>, leagueId: string) {
  const { data, error } = await admin
    .from("leagues")
    .select("id, owner_id, invite_code, name")
    .eq("id", leagueId)
    .maybeSingle();

  if (error) {
    console.error("[getLeagueOwnership] error:", formatSupabaseError(error));
    return null;
  }

  return data as LeagueOwnershipRow | null;
}

async function getJoinRateLimitError(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
) {
  const { data, error } = await admin
    .from("league_join_attempts")
    .select("user_id, attempt_count, window_started_at, blocked_until")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[getJoinRateLimitError] error:", formatSupabaseError(error));
    return null;
  }

  const row = data as JoinAttemptRow | null;

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

async function recordFailedJoinAttempt(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
) {
  const { data, error } = await admin
    .from("league_join_attempts")
    .select("user_id, attempt_count, window_started_at, blocked_until")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[recordFailedJoinAttempt] read error:", formatSupabaseError(error));
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
    console.error("[recordFailedJoinAttempt] upsert error:", formatSupabaseError(upsertError));
  }
}

async function clearJoinAttempts(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
) {
  const { error } = await admin.from("league_join_attempts").delete().eq("user_id", userId);

  if (error) {
    console.error("[clearJoinAttempts] delete error:", formatSupabaseError(error));
  }
}

function revalidateLeaguePaths(leagueId: string) {
  revalidatePath("/game", "layout");
  revalidatePath("/game/leagues");
  revalidatePath(`/game/leagues/${leagueId}`);
}

function normalizeInviteCode(value: FormDataEntryValue | string | null) {
  const normalized = (typeof value === "string" ? value : value?.toString() ?? "")
    .trim()
    .toUpperCase();
  return INVITE_CODE_REGEX.test(normalized) ? normalized : null;
}

function normalizeUuid(value: FormDataEntryValue | null) {
  const normalized = value?.toString().trim() ?? "";
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    normalized,
  )
    ? normalized
    : null;
}

function formatSupabaseError(error: SupabaseLikeError | null | undefined) {
  if (!error) {
    return "unknown error";
  }

  return error.message ?? error.details ?? error.hint ?? error.code ?? "unknown error";
}
