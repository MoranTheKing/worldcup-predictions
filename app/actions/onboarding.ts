"use server";

import { revalidatePath } from "next/cache";
import { normalizeAvatarUrl } from "@/lib/profile/avatar-options";
import { isPrivateAvatarUrl, isPrivateAvatarUrlForUser } from "@/lib/profile/avatar-policy";
import { removePrivateAvatar, uploadPrivateAvatar } from "@/lib/profile/avatar-storage";
import {
  getNicknameFormatError,
  getNicknameTakenError,
  normalizeNicknameInput,
} from "@/lib/profile/nickname";
import { fetchOnboardingStatus } from "@/lib/supabase/onboarding";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type OnboardingActionState = {
  error?: string;
  success?: boolean;
} | null;

export type NicknameAvailabilityResult = {
  available: boolean;
  message?: string;
  normalized: string | null;
};

type ServerClient = Awaited<ReturnType<typeof createClient>>;
type AdminClient = ReturnType<typeof createAdminClient>;

export async function checkNicknameAvailability(
  rawNickname: string,
): Promise<NicknameAvailabilityResult> {
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.error("[checkNicknameAvailability] auth error:", authError.message);
    return {
      available: false,
      message: "לא הצלחנו לבדוק את הכינוי כרגע. נסה שוב.",
      normalized: null,
    };
  }

  if (!user) {
    return {
      available: false,
      message: "צריך להתחבר כדי לבחור כינוי.",
      normalized: null,
    };
  }

  const nickname = normalizeNicknameInput(rawNickname);
  if (!nickname) {
    return {
      available: false,
      message: getNicknameFormatError(),
      normalized: null,
    };
  }

  const duplicateNickname = await findDuplicateNickname(admin, nickname, user.id);
  if (duplicateNickname) {
    return {
      available: false,
      message: getNicknameTakenError(),
      normalized: nickname,
    };
  }

  return {
    available: true,
    message: "הכינוי הזה פנוי.",
    normalized: nickname,
  };
}

export async function completeOnboarding(
  _prev: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.error("[completeOnboarding] auth error:", authError.message);
    return { error: "לא הצלחנו לאמת את המשתמש. נסה שוב." };
  }

  if (!user) {
    return { error: "צריך להתחבר כדי להשלים את ההרשמה." };
  }

  const onboardingStatus = await fetchOnboardingStatus(admin, user.id);
  const tournamentIsOpen = !onboardingStatus.tournamentStarted;
  const identityResult = await persistProfileIdentity({
    admin,
    supabase,
    userId: user.id,
    formData,
  });

  if (!identityResult.success) {
    return { error: identityResult.error };
  }

  if (tournamentIsOpen) {
    const winnerTeamId = normalizeUuid(formData.get("winner_team_id"));
    const topScorerName = normalizeTopScorerName(formData.get("top_scorer"));
    const topScorerPlayerId = normalizePlayerId(formData.get("top_scorer_player_id"));

    if (!winnerTeamId) {
      return { error: "צריך לבחור נבחרת זוכה." };
    }

    if (!topScorerName) {
      return { error: "צריך לבחור מלך שערים." };
    }

    const tournamentPayload = {
      user_id: user.id,
      predicted_winner_team_id: winnerTeamId,
      predicted_top_scorer_name: topScorerName,
    };

    const outrightPayload = {
      ...tournamentPayload,
      predicted_top_scorer_player_id: topScorerPlayerId,
    };

    const [{ error: tournamentError }, { error: outrightError }] = await Promise.all([
      supabase.from("tournament_predictions").upsert(tournamentPayload, { onConflict: "user_id" }),
      supabase.from("outright_bets").upsert(outrightPayload, { onConflict: "user_id" }),
    ]);

    if (tournamentError || outrightError) {
      console.error("[completeOnboarding] tournament save error:", tournamentError, outrightError);
      return { error: "לא הצלחנו לשמור את ניחושי הטורניר." };
    }
  }

  revalidateProfileViews();
  return { success: true };
}

export async function updateProfileSettings(
  _prev: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.error("[updateProfileSettings] auth error:", authError.message);
    return { error: "לא הצלחנו לאמת את המשתמש. נסה שוב." };
  }

  if (!user) {
    return { error: "צריך להתחבר כדי לעדכן את הפרופיל." };
  }

  const identityResult = await persistProfileIdentity({
    admin,
    supabase,
    userId: user.id,
    formData,
  });

  if (!identityResult.success) {
    return { error: identityResult.error };
  }

  revalidateProfileViews();
  return { success: true };
}

async function persistProfileIdentity({
  admin,
  formData,
  supabase,
  userId,
}: {
  admin: AdminClient;
  formData: FormData;
  supabase: ServerClient;
  userId: string;
}) {
  const nickname = normalizeNicknameInput(formData.get("nickname"));
  if (!nickname) {
    return { success: false as const, error: getNicknameFormatError() };
  }

  const duplicateNickname = await findDuplicateNickname(admin, nickname, userId);
  if (duplicateNickname) {
    return { success: false as const, error: getNicknameTakenError() };
  }

  const submittedAvatar = parseSubmittedAvatarSelection(formData.get("avatar_url"), userId);
  if (submittedAvatar.invalid) {
    return { success: false as const, error: "בחירת התמונה לא תקינה. נסה לבחור אותה מחדש." };
  }

  const avatarUploadRequested = formData.get("avatar_upload_requested")?.toString() === "1";
  const avatarFile = getSubmittedAvatarFile(formData.get("avatar_file"));
  if (avatarUploadRequested && !avatarFile) {
    return {
      success: false as const,
      error: "לא הצלחנו לקבל את קובץ התמונה. נסה לבחור אותו מחדש ולשמור שוב.",
    };
  }

  const currentAvatarUrl = await fetchCurrentAvatarUrl(admin, userId);
  const shouldDeletePreviousCustomAvatar =
    isPrivateAvatarUrlForUser(currentAvatarUrl, userId) &&
    !avatarFile &&
    !isPrivateAvatarUrlForUser(submittedAvatar.avatarUrl, userId);

  let avatarUrl = submittedAvatar.avatarUrl;

  if (avatarFile) {
    const uploadResult = await uploadPrivateAvatar(admin, userId, avatarFile);
    if (!uploadResult.ok) {
      return { success: false as const, error: uploadResult.message };
    }

    avatarUrl = uploadResult.avatarUrl;
  }

  const { error: userUpsertError } = await supabase
    .from("users")
    .upsert(
      {
        id: userId,
        username: nickname,
        avatar_url: avatarUrl,
      },
      { onConflict: "id" },
    );

  if (userUpsertError) {
    console.error("[persistProfileIdentity] users upsert error:", userUpsertError);
    return {
      success: false as const,
      error: mapNicknameError(userUpsertError.code, "לא הצלחנו לשמור את הכינוי."),
    };
  }

  const { error: profileUpsertError } = await supabase
    .from("profiles")
    .upsert(
      {
        id: userId,
        display_name: nickname,
        avatar_url: avatarUrl,
      },
      { onConflict: "id" },
    );

  if (profileUpsertError) {
    console.error("[persistProfileIdentity] profiles upsert error:", profileUpsertError);
    return {
      success: false as const,
      error: mapNicknameError(profileUpsertError.code, "לא הצלחנו לשמור את הפרופיל."),
    };
  }

  if (shouldDeletePreviousCustomAvatar) {
    await removePrivateAvatar(admin, userId);
  }

  return { success: true as const, avatarUrl, nickname };
}

async function findDuplicateNickname(admin: AdminClient, nickname: string, userId: string) {
  const [{ data: usersMatch }, { data: profilesMatch }] = await Promise.all([
    admin.from("users").select("id").ilike("username", nickname).neq("id", userId).limit(1),
    admin
      .from("profiles")
      .select("id")
      .ilike("display_name", nickname)
      .neq("id", userId)
      .limit(1),
  ]);

  return Boolean((usersMatch ?? []).length || (profilesMatch ?? []).length);
}

async function fetchCurrentAvatarUrl(admin: AdminClient, userId: string) {
  const [{ data: profileRow }, { data: legacyRow }] = await Promise.all([
    admin.from("profiles").select("avatar_url").eq("id", userId).maybeSingle(),
    admin.from("users").select("avatar_url").eq("id", userId).maybeSingle(),
  ]);

  return asNullableString(profileRow?.avatar_url) ?? asNullableString(legacyRow?.avatar_url);
}

function parseSubmittedAvatarSelection(value: FormDataEntryValue | null, userId: string) {
  const rawValue = value?.toString() ?? "";
  if (!rawValue.trim()) {
    return { avatarUrl: null as string | null, invalid: false };
  }

  const avatarUrl = normalizeAvatarUrl(rawValue);
  if (!avatarUrl) {
    return { avatarUrl: null as string | null, invalid: true };
  }

  if (isPrivateAvatarUrl(avatarUrl) && !isPrivateAvatarUrlForUser(avatarUrl, userId)) {
    return { avatarUrl: null as string | null, invalid: true };
  }

  return { avatarUrl, invalid: false };
}

function getSubmittedAvatarFile(value: FormDataEntryValue | null) {
  if (!(value instanceof File) || value.size <= 0) {
    return null;
  }

  return value;
}

function normalizeTopScorerName(value: FormDataEntryValue | null) {
  const normalized = value?.toString().trim().replace(/\s+/g, " ") ?? "";
  return normalized.length > 0 ? normalized : null;
}

function normalizeUuid(value: FormDataEntryValue | null) {
  const normalized = value?.toString().trim() ?? "";
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    normalized,
  )
    ? normalized
    : null;
}

function normalizePlayerId(value: FormDataEntryValue | null) {
  const normalized = value?.toString().trim() ?? "";
  if (!normalized) {
    return null;
  }

  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function revalidateProfileViews() {
  revalidatePath("/", "layout");
  revalidatePath("/dashboard", "layout");
  revalidatePath("/game", "layout");
  revalidatePath("/onboarding");
}

function asNullableString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function mapNicknameError(code: string | undefined, fallbackMessage: string) {
  if (code === "23505") {
    return getNicknameTakenError();
  }

  return fallbackMessage;
}
