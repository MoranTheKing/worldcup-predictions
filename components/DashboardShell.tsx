"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import ProfileEditorModal from "@/components/profile/ProfileEditorModal";
import UserAvatar from "@/components/UserAvatar";

const NAV_ITEMS = [
  { href: "/dashboard/matches", icon: "🎯", label: "משחקים" },
  { href: "/dashboard/tournament", icon: "🏆", label: "טורניר" },
  { href: "/game", icon: "📝", label: "ניחושים" },
];

interface Props {
  children: React.ReactNode;
}

export default function DashboardShell({ children }: Props) {
  const pathname = usePathname();
  const { displayName, isAuthenticated, isSigningOut, profile, signOut } = useAuth();
  const [isProfileEditorOpen, setIsProfileEditorOpen] = useState(false);

  function isActive(href: string) {
    if (href === "/dashboard/matches") {
      return pathname === "/dashboard" || pathname.startsWith("/dashboard/matches");
    }

    if (href === "/game") {
      return pathname === "/game" || pathname.startsWith("/game/");
    }

    return pathname.startsWith(href);
  }

  const streak = profile?.currentStreak ?? 0;
  const streakBadge = streak >= 3 ? "🔥" : streak <= -5 ? "🐢" : null;
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
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-wc-neon">
                  FIFA 2026
                </p>
                <div className="wc-display mt-3 text-4xl text-wc-fg1">מונדיאל</div>
                <p className="mt-2 text-sm text-wc-fg3">
                  תחזיות, ליגות וטורניר בעיצוב גיימיפייד עם התחברות גלובלית.
                </p>
              </div>
              <div className="rounded-2xl bg-[radial-gradient(circle_at_center,_rgba(95,255,123,0.45),_rgba(95,255,123,0.06)_64%,_transparent_70%)] p-3 text-2xl">
                🏟️
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
                  className={`group flex items-center gap-3 rounded-2xl px-4 py-3 text-start text-sm font-semibold transition-all duration-200 ${
                    active
                      ? "bg-[linear-gradient(135deg,rgba(95,255,123,0.14),rgba(255,47,166,0.1))] text-wc-fg1 shadow-[0_0_26px_rgba(95,255,123,0.14)]"
                      : "text-wc-fg2 hover:bg-white/6 hover:text-wc-fg1"
                  }`}
                >
                  <span
                    className={`text-lg leading-none ${
                      active ? "text-wc-neon" : "text-wc-fg3 group-hover:text-wc-magenta"
                    }`}
                  >
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
              {isAuthenticated ? (
                <>
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      name={displayName}
                      src={profile?.avatarUrl}
                      size={48}
                      roundedClassName="rounded-2xl"
                      className="h-12 w-12"
                    />
                    <div className="min-w-0 flex-1 text-start">
                      <p className="truncate text-sm font-bold text-wc-fg1">
                        {displayName} {streakBadge}
                      </p>
                      <p className="mt-1 text-xs text-wc-fg3">פרופיל פעיל לעונת התחזיות</p>
                    </div>
                  </div>

                  <div className={`mt-4 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${streakTone}`}>
                    {streak > 0 ? `+${streak} רצף חם` : streak < 0 ? `${streak} רצף` : "ללא רצף"}
                  </div>

                  <div className="mt-4 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => setIsProfileEditorOpen(true)}
                      className="rounded-[1.1rem] border border-wc-neon/25 bg-[rgba(95,255,123,0.07)] px-4 py-3 text-sm font-bold text-wc-neon transition hover:border-wc-neon/45 hover:bg-[rgba(95,255,123,0.12)]"
                    >
                      עריכת פרופיל
                    </button>

                    <button
                      onClick={signOut}
                      disabled={isSigningOut}
                      className="wc-button-secondary w-full px-4 py-3 text-sm disabled:opacity-50"
                    >
                      {isSigningOut ? "מתנתק..." : "התנתקות"}
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-4 text-start">
                  <div>
                    <p className="text-sm font-bold text-wc-fg1">כניסה גלובלית</p>
                    <p className="mt-1 text-xs text-wc-fg3">
                      ליגות, תחזיות ודפים אישיים נפתחים אחרי התחברות אחת לכל האפליקציה.
                    </p>
                  </div>

                  <Link
                    href="/login"
                    className="wc-button-primary block w-full px-4 py-3 text-center text-sm"
                  >
                    התחברות
                  </Link>
                </div>
              )}
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
            {isAuthenticated ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsProfileEditorOpen(true)}
                  className="rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-semibold text-wc-fg2 transition hover:border-white/20 hover:text-wc-fg1"
                >
                  עריכה
                </button>
                <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${streakTone}`}>
                  {streak > 0 ? `+${streak}` : streak < 0 ? `${streak}` : "0"}
                </span>
                <UserAvatar
                  name={displayName}
                  src={profile?.avatarUrl}
                  size={40}
                  roundedClassName="rounded-2xl"
                  className="h-10 w-10"
                />
              </>
            ) : (
              <Link href="/login" className="wc-button-primary px-4 py-2 text-xs">
                התחברות
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="min-h-screen pb-28 pt-20 md:mr-[18.5rem] md:px-4 md:pb-4 md:pt-4 lg:mr-[19.5rem]">
        {children}
      </main>

      {isAuthenticated && isProfileEditorOpen ? (
        <ProfileEditorModal
          avatarUrl={profile?.avatarUrl ?? null}
          displayName={displayName}
          isOpen={isProfileEditorOpen}
          onClose={() => setIsProfileEditorOpen(false)}
        />
      ) : null}

      <nav className="fixed inset-x-0 bottom-0 z-20 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] md:hidden">
        <div className="wc-glass grid grid-cols-3 rounded-[1.75rem] px-2 py-2">
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
                <span
                  className={`text-xl leading-none ${
                    active ? "drop-shadow-[0_0_12px_rgba(95,255,123,0.75)]" : ""
                  }`}
                >
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
