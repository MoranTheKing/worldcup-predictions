"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", icon: "🎯", label: "משחקים" },
  { href: "/dashboard/tournament", icon: "🏆", label: "טורניר" },
  { href: "/dashboard/leagues", icon: "👥", label: "ליגות" },
  { href: "/dashboard/profile", icon: "🧤", label: "פרופיל" },
];

interface Props {
  username: string;
  streak: number;
  children: React.ReactNode;
}

export default function DashboardShell({ username, streak, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  function isActive(href: string) {
    return href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const streakBadge = streak >= 3 ? "🔥" : streak <= -5 ? "🐢" : null;
  const initial = username.charAt(0).toUpperCase();
  const streakTone =
    streak > 0
      ? "bg-[rgba(95,255,123,0.12)] text-wc-neon"
      : streak < 0
        ? "bg-[rgba(255,92,130,0.12)] text-wc-danger"
        : "bg-white/6 text-wc-fg2";

  return (
    <div className="wc-page">
      <aside className="fixed inset-y-0 right-0 z-30 hidden w-[18.5rem] p-4 md:block lg:w-[19.5rem]">
        <div className="wc-glass flex h-full flex-col overflow-hidden rounded-[2rem]">
          <div className="border-b border-white/10 px-5 pb-5 pt-6">
            <div className="flex items-start justify-between gap-3">
              <div className="text-start">
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-wc-neon">FIFA 2026</p>
                <div className="wc-display mt-3 text-4xl text-wc-fg1">מונדיאל</div>
                <p className="mt-2 text-sm text-wc-fg3">תחזיות, ליגות וטורניר בעיצוב גיימיפייד</p>
              </div>
              <div className="rounded-2xl bg-[radial-gradient(circle_at_center,_rgba(95,255,123,0.45),_rgba(95,255,123,0.06)_64%,_transparent_70%)] p-3 text-2xl">
                ⚽
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-2 overflow-y-auto px-3 py-4">
            {NAV_ITEMS.map(({ href, icon, label }) => {
              const active = isActive(href);

              return (
                <Link
                  key={href}
                  href={href}
                  className={`group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-start transition-all duration-200 ${
                    active
                      ? "bg-[linear-gradient(135deg,rgba(95,255,123,0.14),rgba(255,47,166,0.1))] text-wc-fg1 shadow-[0_0_26px_rgba(95,255,123,0.14)]"
                      : "text-wc-fg2 hover:bg-white/6 hover:text-wc-fg1"
                  }`}
                >
                  <span className={`text-lg leading-none ${active ? "text-wc-neon" : "text-wc-fg3 group-hover:text-wc-magenta"}`}>
                    {icon}
                  </span>
                  <span>{label}</span>
                  <span
                    className={`me-auto h-2.5 w-2.5 rounded-full transition-all ${
                      active ? "bg-wc-neon shadow-[0_0_18px_rgba(95,255,123,0.65)]" : "bg-transparent"
                    }`}
                  />
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-white/10 p-4">
            <div className="rounded-[1.5rem] border border-white/8 bg-white/5 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--wc-violet),var(--wc-magenta))] text-base font-black text-white">
                  {initial}
                </div>
                <div className="min-w-0 flex-1 text-start">
                  <p className="truncate text-sm font-bold text-wc-fg1">
                    {username} {streakBadge}
                  </p>
                  <p className="mt-1 text-xs text-wc-fg3">פרופיל פעיל לעונת התחזיות</p>
                </div>
              </div>

              <div className={`mt-4 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${streakTone}`}>
                {streak > 0 ? `+${streak} רצף חם` : streak < 0 ? `${streak} רצף` : "ללא רצף"}
              </div>

              <button
                onClick={handleSignOut}
                className="wc-button-secondary mt-4 w-full px-4 py-3 text-sm"
              >
                יציאה מהחשבון
              </button>
            </div>
          </div>
        </div>
      </aside>

      <header className="fixed inset-x-0 top-0 z-20 px-3 pt-3 md:hidden">
        <div className="wc-glass flex items-center justify-between rounded-[1.75rem] px-4 py-3">
          <div className="min-w-0 text-start">
            <p className="wc-display truncate text-3xl text-wc-fg1">מונדיאל</p>
            <p className="truncate text-xs text-wc-fg3">המשחק שלך מתחיל כאן</p>
          </div>

          <div className="flex items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${streakTone}`}>
              {streak > 0 ? `+${streak}` : streak < 0 ? `${streak}` : "0"}
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--wc-neon),var(--wc-violet))] font-black text-[color:var(--wc-text-inverse)]">
              {initial}
            </div>
          </div>
        </div>
      </header>

      <main className="min-h-screen pb-28 pt-20 md:mr-[18.5rem] md:px-4 md:pb-4 md:pt-4 lg:mr-[19.5rem]">
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] md:hidden">
        <div className="wc-glass grid grid-cols-4 rounded-[1.75rem] px-2 py-2">
          {NAV_ITEMS.map(({ href, icon, label }) => {
            const active = isActive(href);

            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center justify-center gap-1 rounded-[1.15rem] px-2 py-2 text-center transition-all duration-200 ${
                  active
                    ? "bg-[linear-gradient(135deg,rgba(95,255,123,0.14),rgba(255,47,166,0.12))] text-wc-neon shadow-[0_0_22px_rgba(95,255,123,0.18)]"
                    : "text-wc-fg3"
                }`}
              >
                <span className={`text-xl leading-none ${active ? "drop-shadow-[0_0_12px_rgba(95,255,123,0.75)]" : ""}`}>
                  {icon}
                </span>
                <span className="text-[11px] font-bold">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
