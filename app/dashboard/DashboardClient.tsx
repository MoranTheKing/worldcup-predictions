"use client";

import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Tab = "matches" | "leagues" | "profile";

const NAV_ITEMS: { id: Tab; icon: string; label: string }[] = [
  { id: "matches", icon: "🗓️", label: "משחקים" },
  { id: "leagues", icon: "🏅", label: "ליגות"  },
  { id: "profile", icon: "👤", label: "פרופיל" },
];

interface Props {
  username:          string;
  streak:            number;
  jokersGroups:      number;
  jokersKnockouts:   number;
  outrightWinner:    string | null;
  outrightWinnerHe:  string | null;
  outrightWinnerLogo:string | null;
  outrightTopScorer: string | null;
}

export default function DashboardClient({
  username,
  streak,
  jokersGroups,
  jokersKnockouts,
  outrightWinner,
  outrightWinnerHe,
  outrightWinnerLogo,
  outrightTopScorer,
}: Props) {
  const [tab, setTab] = useState<Tab>("matches");
  const router = useRouter();

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

      {/* ══ Desktop Sidebar (RTL → fixed on the right) ═══════════════════════ */}
      <aside className="hidden md:flex flex-col fixed top-0 right-0 bottom-0 w-56 lg:w-64 bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 z-20 select-none">

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
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-zinc-300 to-zinc-400 dark:from-zinc-600 dark:to-zinc-700 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
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
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {NAV_ITEMS.map(({ id, icon, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-right ${
                tab === id
                  ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              <span className="text-base leading-none">{icon}</span>
              <span>{label}</span>
            </button>
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
        <div className="flex items-center gap-3">
          {streak !== 0 && (
            <span className="text-xs font-medium text-zinc-500">
              {streak > 0 ? `+${streak} רצף` : `${streak} רצף`}
            </span>
          )}
          <button
            onClick={handleSignOut}
            className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
          >
            יציאה
          </button>
        </div>
      </header>

      {/* ══ Main Content ═════════════════════════════════════════════════════ */}
      {/* RTL sidebar is 56/64 on the right → offset main with mr-56/mr-64   */}
      <main className="flex-1 md:mr-56 lg:mr-64 pt-14 md:pt-0 pb-20 md:pb-0 overflow-y-auto">
        {tab === "matches" && <MatchesTab />}
        {tab === "leagues" && <LeaguesTab />}
        {tab === "profile" && (
          <ProfileTab
            username={username}
            outrightWinner={outrightWinner}
            outrightWinnerHe={outrightWinnerHe}
            outrightWinnerLogo={outrightWinnerLogo}
            outrightTopScorer={outrightTopScorer}
            jokersGroups={jokersGroups}
            jokersKnockouts={jokersKnockouts}
          />
        )}
      </main>

      {/* ══ Mobile Bottom Tab Bar ════════════════════════════════════════════ */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex">
        {NAV_ITEMS.map(({ id, icon, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-3 text-xs font-medium transition-colors ${
              tab === id
                ? "text-zinc-900 dark:text-zinc-50"
                : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            }`}
          >
            <span className="text-lg leading-none">{icon}</span>
            <span>{label}</span>
            {tab === id && (
              <span className="w-1 h-1 rounded-full bg-zinc-900 dark:bg-zinc-50 mt-0.5" />
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}

// ══ Matches Tab ══════════════════════════════════════════════════════════════

function MatchesTab() {
  return (
    <div className="p-4 md:p-8 max-w-5xl">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-zinc-50">משחקים</h1>
        <p className="text-sm text-zinc-500 mt-0.5">לוח המשחקים של מונדיאל 2026</p>
      </div>

      {/* Scoring info card */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 md:p-5 mb-6 text-right">
        <p className="text-sm font-bold text-amber-800 dark:text-amber-400 mb-2">שיטת הניקוד</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-amber-700 dark:text-amber-400">
          <span>✓ תוצאה נכונה: 2–10 נקודות (לפי שלב)</span>
          <span>✓ תוצאה מדויקת: 5–20 נקודות</span>
          <span>✓ ג׳וקר: ×3 על תוצאה מדויקת</span>
          <span>✓ מכפיל הפתעה: עד ×2 לפי מסלול</span>
        </div>
      </div>

      {/* Placeholder match cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 flex flex-col gap-3 animate-pulse"
          >
            <div className="flex items-center justify-between">
              <div className="h-3 w-20 bg-zinc-100 dark:bg-zinc-800 rounded" />
              <div className="h-3 w-12 bg-zinc-100 dark:bg-zinc-800 rounded" />
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1">
                <div className="w-7 h-5 bg-zinc-100 dark:bg-zinc-800 rounded" />
                <div className="h-3 w-16 bg-zinc-100 dark:bg-zinc-800 rounded" />
              </div>
              <div className="text-xs font-bold text-zinc-300 dark:text-zinc-700">vs</div>
              <div className="flex items-center gap-2 flex-1 justify-end">
                <div className="h-3 w-16 bg-zinc-100 dark:bg-zinc-800 rounded" />
                <div className="w-7 h-5 bg-zinc-100 dark:bg-zinc-800 rounded" />
              </div>
            </div>
            <div className="h-8 bg-zinc-50 dark:bg-zinc-800 rounded-xl" />
          </div>
        ))}
      </div>

      <p className="text-xs text-zinc-400 text-center mt-6">
        משחקים יסונכרנו מ-api-football.com עם פתיחת הטורניר ב-11 ביוני 2026
      </p>
    </div>
  );
}

// ══ Leagues Tab ══════════════════════════════════════════════════════════════

function LeaguesTab() {
  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-zinc-50">הליגות שלי</h1>
        <p className="text-sm text-zinc-500 mt-0.5">התחרה מול חברים בליגות פרטיות</p>
      </div>

      {/* Action cards — stack on mobile, side-by-side on sm+ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <button className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 px-5 py-5 flex items-start gap-4 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-right">
          <span className="text-3xl mt-0.5">➕</span>
          <div>
            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50">יצירת ליגה חדשה</p>
            <p className="text-xs text-zinc-500 mt-1">הזמן חברים עם קוד הצטרפות ייחודי</p>
          </div>
        </button>
        <button className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 px-5 py-5 flex items-start gap-4 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-right">
          <span className="text-3xl mt-0.5">🔑</span>
          <div>
            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50">הצטרפות לליגה</p>
            <p className="text-xs text-zinc-500 mt-1">הזן קוד הצטרפות שקיבלת</p>
          </div>
        </button>
      </div>

      {/* Empty state */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 p-8 flex flex-col items-center gap-2 text-center">
        <span className="text-4xl">🏅</span>
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">עדיין לא הצטרפת לאף ליגה</p>
        <p className="text-xs text-zinc-400 max-w-xs">
          הניחושים שלך חלים על כל הליגות — מנחש פעם אחת, מתחרה בכולן
        </p>
      </div>
    </div>
  );
}

// ══ Profile Tab ══════════════════════════════════════════════════════════════

function ProfileTab({
  username,
  outrightWinner,
  outrightWinnerHe,
  outrightWinnerLogo,
  outrightTopScorer,
  jokersGroups,
  jokersKnockouts,
}: {
  username:           string;
  outrightWinner:     string | null;
  outrightWinnerHe:   string | null;
  outrightWinnerLogo: string | null;
  outrightTopScorer:  string | null;
  jokersGroups:       number;
  jokersKnockouts:    number;
}) {
  const displayWinner = outrightWinnerHe ?? outrightWinner;

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-zinc-50">הפרופיל שלי</h1>
        <p className="text-sm text-zinc-500 mt-0.5">הניחושים וסטטיסטיקות שלי</p>
      </div>

      {/* Two-column grid on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">

        {/* Nickname card */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 px-5 py-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-zinc-300 to-zinc-400 dark:from-zinc-600 dark:to-zinc-700 flex items-center justify-center text-xl font-bold text-white flex-shrink-0">
            {username.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-base font-bold text-zinc-900 dark:text-zinc-50">{username}</p>
            <p className="text-xs text-zinc-500">הכינוי שלי</p>
          </div>
        </div>

        {/* Jokers card */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 px-5 py-4">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">ג׳וקרים</p>
          <div className="flex gap-3">
            <div className="flex-1 bg-zinc-50 dark:bg-zinc-800 rounded-xl py-3 text-center">
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{jokersGroups}</p>
              <p className="text-xs text-zinc-500 mt-0.5">שלב הבתים</p>
            </div>
            <div className="flex-1 bg-zinc-50 dark:bg-zinc-800 rounded-xl py-3 text-center">
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{jokersKnockouts}</p>
              <p className="text-xs text-zinc-500 mt-0.5">נוקאאוט</p>
            </div>
          </div>
          <p className="text-xs text-zinc-400 mt-2 text-center">ג׳וקר = ×3 על תוצאה מדויקת</p>
        </div>

        {/* Outright predictions — spans 2 cols on desktop */}
        <div className="md:col-span-2 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">ניחושי אלופים</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-zinc-100 dark:divide-zinc-800">
            {/* Winner */}
            <div className="px-5 py-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs text-zinc-500 mb-1">זוכה הטורניר</p>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  {displayWinner ?? "—"}
                </p>
              </div>
              <div className="flex-shrink-0">
                {outrightWinnerLogo ? (
                  <Image
                    src={outrightWinnerLogo}
                    alt={displayWinner ?? ""}
                    width={40}
                    height={27}
                    className="rounded object-cover"
                    unoptimized
                  />
                ) : (
                  <span className="text-2xl">🏆</span>
                )}
              </div>
            </div>
            {/* Top scorer */}
            <div className="px-5 py-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs text-zinc-500 mb-1">מלך השערים</p>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  {outrightTopScorer ?? "—"}
                </p>
              </div>
              <Image
                src="/avatar-player.svg"
                alt="שחקן"
                width={36}
                height={36}
                className="flex-shrink-0 opacity-60"
              />
            </div>
          </div>
          <div className="px-5 py-3 border-t border-zinc-100 dark:border-zinc-800">
            <button className="text-xs text-zinc-500 underline underline-offset-2 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
              עריכת ניחושי אלופים (עד תחילת הטורניר)
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
