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
    <div className="min-h-screen" style={{ background: "var(--wc-bg)" }}>

      {/* ══ Desktop Sidebar (RTL → fixed right) ═══════════════════════════════ */}
      <aside
        className="hidden md:flex flex-col fixed top-0 right-0 bottom-0 w-56 lg:w-64 z-20"
        style={{ background: "var(--wc-surface)", borderLeft: "1px solid var(--wc-border)" }}
      >
        {/* Branding */}
        <div className="px-5 py-5" style={{ borderBottom: "1px solid var(--wc-border)" }}>
          <div
            className="text-lg font-black tracking-tight"
            style={{ fontFamily: "var(--font-display)", color: "var(--wc-fg1)" }}
          >
            ⚽ מונדיאל 2026
          </div>
          <div className="text-xs mt-0.5" style={{ color: "var(--wc-fg3)" }}>
            משחק תחזיות
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 flex flex-col gap-1 p-3 overflow-y-auto">
          {NAV_ITEMS.map(({ href, icon, label }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 text-right"
                style={{
                  background: active ? "var(--wc-neon-bg)"  : "transparent",
                  color:      active ? "var(--wc-neon)"     : "var(--wc-fg2)",
                  border:     active ? "1px solid rgba(0,230,90,0.2)" : "1px solid transparent",
                }}
              >
                <span className="text-base leading-none">{icon}</span>
                <span>{label}</span>
                {active && (
                  <span
                    className="mr-auto w-1.5 h-1.5 rounded-full"
                    style={{ background: "var(--wc-neon)", boxShadow: "0 0 6px var(--wc-neon)" }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User + sign out */}
        <div className="p-4" style={{ borderTop: "1px solid var(--wc-border)" }}>
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, var(--wc-neon), var(--wc-green))",
                color: "var(--wc-fg-inverse)",
              }}
            >
              {initial}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold truncate" style={{ color: "var(--wc-fg1)" }}>
                {username} {streakBadge}
              </p>
              {streak !== 0 && (
                <p className="text-xs" style={{ color: streak > 0 ? "var(--wc-fire)" : "var(--wc-fg3)" }}>
                  {streak > 0 ? `+${streak} רצף 🔥` : `${streak} רצף`}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full text-xs py-2 rounded-lg font-medium transition-all"
            style={{
              background: "var(--wc-raised)",
              color: "var(--wc-fg3)",
              border: "1px solid var(--wc-border)",
            }}
          >
            יציאה מהחשבון
          </button>
        </div>
      </aside>

      {/* ══ Mobile Header ══════════════════════════════════════════════════════ */}
      <header
        className="md:hidden fixed top-0 inset-x-0 z-10 flex items-center justify-between px-4 h-14"
        style={{
          background: "var(--wc-overlay)",
          backdropFilter: "blur(16px) saturate(180%)",
          borderBottom: "1px solid var(--wc-border-glass)",
        }}
      >
        <div
          className="text-base font-black"
          style={{ fontFamily: "var(--font-display)", color: "var(--wc-fg1)" }}
        >
          ⚽ מונדיאל 2026
        </div>
        <div className="flex items-center gap-2">
          {streak > 0 && (
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-full"
              style={{
                background: "var(--wc-fire-bg)",
                color: "var(--wc-fire)",
                border: "1px solid rgba(255,77,28,0.25)",
              }}
            >
              🔥 +{streak}
            </span>
          )}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
            style={{
              background: "linear-gradient(135deg, var(--wc-neon), var(--wc-green))",
              color: "var(--wc-fg-inverse)",
            }}
          >
            {initial}
          </div>
        </div>
      </header>

      {/* ══ Main Content ═══════════════════════════════════════════════════════ */}
      <main className="flex-1 md:mr-56 lg:mr-64 pt-14 md:pt-0 pb-20 md:pb-0 min-h-screen">
        {children}
      </main>

      {/* ══ Mobile Bottom Tab Bar ══════════════════════════════════════════════ */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 flex z-10"
        style={{
          height: 64,
          background: "var(--wc-overlay)",
          backdropFilter: "blur(16px) saturate(180%)",
          borderTop: "1px solid var(--wc-border-glass)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {NAV_ITEMS.map(({ href, icon, label }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2"
            >
              <span
                className="text-xl leading-none transition-all duration-200"
                style={{ filter: active ? "drop-shadow(0 0 5px rgba(0,230,90,0.7))" : "none" }}
              >
                {icon}
              </span>
              <span
                className="text-[10px] font-bold transition-colors duration-150"
                style={{ color: active ? "var(--wc-neon)" : "var(--wc-fg3)" }}
              >
                {label}
              </span>
              {active && (
                <span
                  className="w-1 h-1 rounded-full mt-0.5"
                  style={{ background: "var(--wc-neon)", boxShadow: "0 0 6px var(--wc-neon)" }}
                />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
