import type { User } from "@supabase/supabase-js";

export type AuthProfile = {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  totalScore: number;
  username: string | null;
  currentStreak: number;
};

export async function fetchAuthProfile(
  supabase: any,
  userId: string,
): Promise<AuthProfile | null> {
  const [{ data: profileRow }, { data: legacyRow }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, avatar_url, total_score")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("users")
      .select("id, username, avatar_url, current_streak")
      .eq("id", userId)
      .maybeSingle(),
  ]);

  if (!profileRow && !legacyRow) {
    return null;
  }

  return {
    id: userId,
    displayName:
      asNullableString(profileRow?.display_name) ??
      asNullableString(legacyRow?.username),
    avatarUrl:
      asNullableString(profileRow?.avatar_url) ??
      asNullableString(legacyRow?.avatar_url),
    totalScore: asNumber(profileRow?.total_score),
    username: asNullableString(legacyRow?.username),
    currentStreak: asNumber(legacyRow?.current_streak),
  };
}

export function resolveDisplayName(
  profile: AuthProfile | null,
  user: User | null,
): string {
  if (profile?.displayName?.trim()) {
    return profile.displayName.trim();
  }

  if (profile?.username?.trim()) {
    return profile.username.trim();
  }

  if (user?.user_metadata?.display_name) {
    return String(user.user_metadata.display_name);
  }

  if (user?.user_metadata?.full_name) {
    return String(user.user_metadata.full_name);
  }

  if (user?.email) {
    return user.email.split("@")[0] ?? "Player";
  }

  return "Guest";
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function asNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
