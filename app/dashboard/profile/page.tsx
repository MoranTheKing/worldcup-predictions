import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ProfileClient from "./ProfileClient";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("username, current_streak, jokers_groups_remaining, jokers_knockouts_remaining")
    .eq("id", user.id)
    .single();

  return (
    <ProfileClient
      userId={user.id}
      username={profile?.username ?? ""}
      streak={profile?.current_streak ?? 0}
      jokersGroups={profile?.jokers_groups_remaining ?? 1}
      jokersKnockouts={profile?.jokers_knockouts_remaining ?? 1}
    />
  );
}
