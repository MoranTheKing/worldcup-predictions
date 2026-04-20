"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Tab = "matches" | "leagues" | "profile";

interface Props {
  username: string;
  streak: number;
  jokersGroups: number;
  jokersKnockouts: number;
  outrightWinner: string | null;
  outrightTopScorer: string | null;
}

export default function DashboardClient({
  username,
  streak,
  jokersGroups,
  jokersKnockouts,
  outrightWinner,
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

  const streakBadge =
    streak >= 3 ? "🔥" : streak <= -5 ? "🐢" : null;

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 max-w-md mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⚽</span>
          <div>
            <p className="text-xs text-zinc-500 leading-none">שלום,</p>
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

      {/* Tab content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {tab === "matches" && <MatchesTab />}
        {tab === "leagues" && <LeaguesTab />}
        {tab === "profile" && (
          <ProfileTab
            username={username}
            outrightWinner={outrightWinner}
            outrightTopScorer={outrightTopScorer}
            jokersGroups={jokersGroups}
            jokersKnockouts={jokersKnockouts}
          />
        )}
      </main>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 inset-x-0 max-w-md mx-auto bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex">
        {(
          [
            { id: "matches", icon: "🗓️", label: "משחקים" },
            { id: "leagues", icon: "🏅", label: "ליגות" },
            { id: "profile", icon: "👤", label: "פרופיל" },
          ] as { id: Tab; icon: string; label: string }[]
        ).map(({ id, icon, label }) => (
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

// ── Matches tab ────────────────────────────────────────────────────────────────
function MatchesTab() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 px-6 text-center">
      <span className="text-5xl">📅</span>
      <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
        משחקים יתווספו בקרוב
      </h2>
      <p className="text-sm text-zinc-500 max-w-xs">
        לוח המשחקים יסונכרן מ-api-football.com לאחר קביעת לוח הזמנים הרשמי.
      </p>
      <div className="mt-4 w-full max-w-xs bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-xs text-amber-700 dark:text-amber-400 text-right">
        <p className="font-bold mb-1">שיטת הניקוד:</p>
        <ul className="space-y-0.5">
          <li>✓ תוצאה נכונה: 2-10 נקודות (לפי שלב)</li>
          <li>✓ תוצאה מדויקת: 5-20 נקודות</li>
          <li>✓ ג׳וקר: ×3 על תוצאה מדויקת</li>
          <li>✓ מכפיל הפתעה: עד ×2 לפי מסלוס</li>
        </ul>
      </div>
    </div>
  );
}

// ── Leagues tab ────────────────────────────────────────────────────────────────
function LeaguesTab() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
        הליגות שלי
      </h2>
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800">
        <button className="w-full flex items-center gap-3 px-4 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors rounded-t-2xl text-right">
          <span className="text-2xl">➕</span>
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              יצירת ליגה חדשה
            </p>
            <p className="text-xs text-zinc-500">הזמן חברים עם קוד הצטרפות</p>
          </div>
        </button>
        <button className="w-full flex items-center gap-3 px-4 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors rounded-b-2xl text-right">
          <span className="text-2xl">🔑</span>
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              הצטרפות לליגה
            </p>
            <p className="text-xs text-zinc-500">הזן קוד הצטרפות</p>
          </div>
        </button>
      </div>
      <p className="text-xs text-zinc-400 text-center">
        הניחושים שלך חלים על כל הליגות — מנחש פעם אחת, מתחרה בכולן
      </p>
    </div>
  );
}

// ── Profile tab ────────────────────────────────────────────────────────────────
function ProfileTab({
  username,
  outrightWinner,
  outrightTopScorer,
  jokersGroups,
  jokersKnockouts,
}: {
  username: string;
  outrightWinner: string | null;
  outrightTopScorer: string | null;
  jokersGroups: number;
  jokersKnockouts: number;
}) {
  return (
    <div className="flex flex-col gap-4 p-4">
      <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
        הפרופיל שלי
      </h2>

      {/* Nickname card */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 px-4 py-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-lg font-bold text-zinc-600 dark:text-zinc-300">
          {username.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{username}</p>
          <p className="text-xs text-zinc-500">הכינוי שלי</p>
        </div>
      </div>

      {/* Outright predictions */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800">
        <div className="px-4 py-3">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">
            ניחושי אלופים
          </p>
        </div>
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-500">זוכה הטורניר</p>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              {outrightWinner ?? "—"}
            </p>
          </div>
          <span className="text-xl">🏆</span>
        </div>
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-500">מלך השערים</p>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              {outrightTopScorer ?? "—"}
            </p>
          </div>
          <span className="text-xl">⚽</span>
        </div>
        <div className="px-4 py-3">
          <button className="text-xs text-zinc-500 underline underline-offset-2 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
            עריכת ניחושי אלופים (עד תחילת הטורניר)
          </button>
        </div>
      </div>

      {/* Jokers */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 px-4 py-4">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">
          ג׳וקרים
        </p>
        <div className="flex gap-3">
          <div className="flex-1 bg-zinc-50 dark:bg-zinc-800 rounded-xl px-3 py-3 text-center">
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{jokersGroups}</p>
            <p className="text-xs text-zinc-500 mt-0.5">שלב הבתים</p>
          </div>
          <div className="flex-1 bg-zinc-50 dark:bg-zinc-800 rounded-xl px-3 py-3 text-center">
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{jokersKnockouts}</p>
            <p className="text-xs text-zinc-500 mt-0.5">שלב הנוקאאוט</p>
          </div>
        </div>
        <p className="text-xs text-zinc-400 mt-3 text-center">
          ג׳וקר על תוצאה מדויקת = ×3 נקודות
        </p>
      </div>
    </div>
  );
}
