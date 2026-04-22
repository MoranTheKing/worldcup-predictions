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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "עליך להתחבר כדי ליצור ליגה" };
  }

  const name = formData.get("name")?.toString().trim();
  if (!name) {
    return { error: "שם הליגה הוא שדה חובה", field: "name" };
  }

  const { data: league, error } = await supabase
    .from("leagues")
    .insert({ name, owner_id: user.id })
    .select("id")
    .single();

  if (error || !league) {
    return { error: "שגיאה ביצירת הליגה — נסה שוב" };
  }

  const { error: memberError } = await supabase
    .from("league_members")
    .insert({ user_id: user.id, league_id: league.id });

  if (memberError) {
    // League was created but member insert failed — still redirect to league page
    console.error("league_members insert failed:", memberError.message);
  }

  redirect(`/game/leagues/${league.id}`);
}

export async function joinLeague(
  _prev: LeagueActionState,
  formData: FormData
): Promise<LeagueActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "עליך להתחבר כדי להצטרף לליגה" };
  }

  const rawCode = formData.get("invite_code")?.toString().trim();
  if (!rawCode) {
    return { error: "קוד הזמנה הוא שדה חובה", field: "invite_code" };
  }
  const inviteCode = rawCode.toUpperCase();

  // Use admin client — RLS blocks unauthenticated lookup by invite_code for non-members
  const admin = createAdminClient();
  const { data: league } = await admin
    .from("leagues")
    .select("id")
    .eq("invite_code", inviteCode)
    .single();

  if (!league) {
    return { error: "קוד הזמנה לא תקין", field: "invite_code" };
  }

  const { error } = await supabase
    .from("league_members")
    .insert({ user_id: user.id, league_id: league.id });

  if (error) {
    if (error.code === "23505") {
      return { error: "אתה כבר חבר בליגה זו" };
    }
    return { error: "שגיאה בהצטרפות לליגה — נסה שוב" };
  }

  redirect(`/game/leagues/${league.id}`);
}
