"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeAvatarUrl } from "@/lib/profile/avatar-options";
import {
  getNicknameFormatError,
  getNicknameTakenError,
  normalizeNicknameInput,
} from "@/lib/profile/nickname";
import { fetchOnboardingStatus } from "@/lib/supabase/onboarding";
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

  const nickname = normalizeNicknameInput(formData.get("nickname"));
  if (!nickname) {
    return { error: getNicknameFormatError() };
  }

  const avatarUrl = normalizeAvatarUrl(formData.get("avatar_url")?.toString() ?? null);
  const onboardingStatus = await fetchOnboardingStatus(admin, user.id);
  const tournamentIsOpen = !onboardingStatus.tournamentStarted;

  const duplicateNickname = await findDuplicateNickname(admin, nickname, user.id);
  if (duplicateNickname) {
    return { error: getNicknameTakenError() };
  }

  const { error: userUpsertError } = await supabase
    .from("users")
    .upsert(
      {
        id: user.id,
        username: nickname,
        avatar_url: avatarUrl,
      },
      { onConflict: "id" },
    );

  if (userUpsertError) {
    console.error("[completeOnboarding] users upsert error:", userUpsertError);
    return mapNicknameError(userUpsertError.code, "לא הצלחנו לשמור את הכינוי.");
  }

  const { error: profileUpsertError } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        display_name: nickname,
        avatar_url: avatarUrl,
      },
      { onConflict: "id" },
    );

  if (profileUpsertError) {
    console.error("[completeOnboarding] profiles upsert error:", profileUpsertError);
    return mapNicknameError(profileUpsertError.code, "לא הצלחנו לשמור את הפרופיל.");
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
      supabase
        .from("tournament_predictions")
        .upsert(tournamentPayload, { onConflict: "user_id" }),
      supabase.from("outright_bets").upsert(outrightPayload, { onConflict: "user_id" }),
    ]);

    if (tournamentError || outrightError) {
      console.error("[completeOnboarding] tournament save error:", tournamentError, outrightError);
      return { error: "לא הצלחנו לשמור את ניחושי הטורניר." };
    }
  }

  revalidatePath("/", "layout");
  revalidatePath("/dashboard", "layout");
  revalidatePath("/game", "layout");
  revalidatePath("/onboarding");

  return { success: true };
}

async function findDuplicateNickname(
  admin: ReturnType<typeof createAdminClient>,
  nickname: string,
  userId: string,
) {
  const [{ data: usersMatch }, { data: profilesMatch }] = await Promise.all([
    admin
      .from("users")
      .select("id")
      .ilike("username", nickname)
      .neq("id", userId)
      .limit(1),
    admin
      .from("profiles")
      .select("id")
      .ilike("display_name", nickname)
      .neq("id", userId)
      .limit(1),
  ]);

  return Boolean((usersMatch ?? []).length || (profilesMatch ?? []).length);
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

function mapNicknameError(code: string | undefined, fallbackMessage: string): OnboardingActionState {
  if (code === "23505") {
    return { error: getNicknameTakenError() };
  }

  return { error: fallbackMessage };
}
