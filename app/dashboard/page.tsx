import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-4">⚽</div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
          ברוך הבא!
        </h1>
        <p className="text-sm text-zinc-500 mb-1">מחובר כ:</p>
        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{user.email}</p>
        <p className="text-zinc-400 text-xs mt-6">לוח הבקרה — בקרוב</p>
      </div>
    </div>
  );
}
