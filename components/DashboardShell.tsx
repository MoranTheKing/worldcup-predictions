"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard",             icon: "🗓️", label: "משחקים" },
  { href: "/dashboard/tournament",  icon: "🏆", label: "טורניר"  },
  { href: "/dashboard/leagues",     icon: "🏅", label: "ליגות"   },
  { href: "/dashboard/profile",     icon: "👤", label: "פרופיל"  },
];

interface Props {
  username: string;
  streak:   number;
  children: React.ReactNode;
}

export default function DashboardShell({ username, streak, children }: Props) {
  const pathname = usePathname();
  const router   = useRouter();

  function isActive(href: string) {
    // exact match for root dashboard, prefix match for sub-routes
    return href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const streakBadge = streak >= 3 ? "🔥" : streak <= -5 ? "🐢" : null;
  const initial     = username.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex">

      {/* ══ Desktop Sidebar (RTL → fixed right) ══════════════════════════════ */}
      <aside className="hidden md:flex flex-col fixed top-0 right-0 bottom-0 w-56 lg:w-64 bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 z-20">

        {/* Branding */}
        <div className="px-5 py-5 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">⚽</span>
            <div>
              <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50 leading-tight">מונדיאל 2026</p>
              <p className="text-[11px] text-zinc-400">Predictions</p>
            </div>
          </div>
        </div>

        {/* User card */}
        <div className="px-4 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
              {initial}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50 truncate">
                {username} {streakBadge}
              </p>
              {streak !== 0 && (
                <p className="text-xs text-zinc-500">
                  {streak > 0 ? `+${streak}` : streak} רצף
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
          {NAV_ITEMS.map(({ href, icon, label }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-right ${
                isActive(href)
                  ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              <span className="text-base leading-none">{icon}</span>
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        {/* Sign out */}
        <div className="px-5 py-4 border-t border-zinc-100 dark:border-zinc-800">
          <button
            onClick={handleSignOut}
            className="text-xs text-zinc-400 hover:text-red-500 transition-colors"
          >
            יציאה מהחשבון
          </button>
        </div>
      </aside>

      {/* ══ Mobile Header ════════════════════════════════════════════════════ */}
      <header className="md:hidden fixed top-0 inset-x-0 z-10 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">⚽</span>
          <div>
            <p className="text-[11px] text-zinc-500 leading-none">שלום,</p>
            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50 leading-tight">
              {username} {streakBadge}
            </p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
        >
          יציאה
        </button>
      </header>

      {/* ══ Main Content ═════════════════════════════════════════════════════ */}
      <main className="flex-1 md:mr-56 lg:mr-64 pt-14 md:pt-0 pb-20 md:pb-0 overflow-y-auto min-h-screen">
        {children}
      </main>

      {/* ══ Mobile Bottom Tab Bar ════════════════════════════════════════════ */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex z-10">
        {NAV_ITEMS.map(({ href, icon, label }) => (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center gap-0.5 py-3 text-xs font-medium transition-colors ${
              isActive(href)
                ? "text-zinc-900 dark:text-zinc-50"
                : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            }`}
          >
            <span className="text-lg leading-none">{icon}</span>
            <span>{label}</span>
            {isActive(href) && (
              <span className="w-1 h-1 rounded-full bg-zinc-900 dark:bg-zinc-50 mt-0.5" />
            )}
          </Link>
        ))}
      </nav>
    </div>
  );
}
