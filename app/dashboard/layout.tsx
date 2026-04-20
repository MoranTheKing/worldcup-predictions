import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: profile }, { data: outright }] = await Promise.all([
    supabase.from("users").select("username").eq("id", user.id).single(),
    supabase
      .from("outright_bets")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (!profile?.username || !outright) {
    redirect("/onboarding");
  }

  return <>{children}</>;
}
