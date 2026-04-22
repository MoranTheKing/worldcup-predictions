"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type LeagueActionState = {
  error?: string;
  field?: "name" | "invite_code";
} | null;

export async function createLeague(
  _prev: LeagueActionState,
  formData: FormData
): Promise<LeagueActionState> {
  const supabase = await createClient();

  let user;
  try {
    const { data, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    user = data.user;
  } catch (err) {
    console.error("[createLeague] auth.getUser failed:", err);
    return { error: "שגיאת אימות — נסה שוב" };
  }

  if (!user) {
    return { error: "עליך להתחבר כדי ליצור ליגה" };
  }

  const name = formData.get("name")?.toString().trim();
  if (!name) {
    return { error: "שם הליגה הוא שדה חובה", field: "name" };
  }

  let leagueId: string;

  try {
    // Use admin client to bypass potential RLS edge-cases on insert;
    // auth is already verified above via getUser().
    const admin = createAdminClient();

    const { data: league, error: insertError } = await admin
      .from("leagues")
      .insert({ name, owner_id: user.id })
      .select("id")
      .single();

    if (insertError) {
      console.error("[createLeague] leagues insert error:", insertError);
      return {
        error: `שגיאה ביצירת הליגה: ${insertError.message ?? "נסה שוב"}`,
      };
    }

    if (!league?.id) {
      console.error("[createLeague] no league id returned");
      return { error: "שגיאה ביצירת הליגה — לא התקבל מזהה" };
    }

    leagueId = league.id as string;

    const { error: memberError } = await admin
      .from("league_members")
      .insert({ user_id: user.id, league_id: leagueId });

    if (memberError) {
      // Non-fatal: league was created; owner will still be redirected there.
      console.error("[createLeague] league_members insert error:", memberError);
    }
  } catch (err) {
    console.error("[createLeague] unexpected error:", err);
    return { error: "שגיאה בלתי צפויה — נסה שוב מאוחר יותר" };
  }

  redirect(`/game/leagues/${leagueId}`);
}

export async function joinLeague(
  _prev: LeagueActionState,
  formData: FormData
): Promise<LeagueActionState> {
  const supabase = await createClient();

  let user;
  try {
    const { data, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    user = data.user;
  } catch (err) {
    console.error("[joinLeague] auth.getUser failed:", err);
    return { error: "שגיאת אימות — נסה שוב" };
  }

  if (!user) {
    return { error: "עליך להתחבר כדי להצטרף לליגה" };
  }

  const rawCode = formData.get("invite_code")?.toString().trim();
  if (!rawCode) {
    return { error: "קוד הזמנה הוא שדה חובה", field: "invite_code" };
  }
  const inviteCode = rawCode.toUpperCase();

  let leagueId: string;

  try {
    // Admin client bypasses RLS — non-members cannot see the leagues table.
    const admin = createAdminClient();

    const { data: league, error: lookupError } = await admin
      .from("leagues")
      .select("id")
      .eq("invite_code", inviteCode)
      .single();

    if (lookupError || !league) {
      console.error("[joinLeague] invite_code lookup:", lookupError);
      return { error: "קוד הזמנה לא תקין", field: "invite_code" };
    }

    leagueId = league.id as string;

    const { error: memberError } = await supabase
      .from("league_members")
      .insert({ user_id: user.id, league_id: leagueId });

    if (memberError) {
      if (memberError.code === "23505") {
        return { error: "אתה כבר חבר בליגה זו" };
      }
      console.error("[joinLeague] league_members insert error:", memberError);
      return { error: `שגיאה בהצטרפות: ${memberError.message ?? "נסה שוב"}` };
    }
  } catch (err) {
    console.error("[joinLeague] unexpected error:", err);
    return { error: "שגיאה בלתי צפויה — נסה שוב מאוחר יותר" };
  }

  redirect(`/game/leagues/${leagueId}`);
}
