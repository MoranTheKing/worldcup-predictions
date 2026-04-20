"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Team = { id: number; name: string; name_he: string; flag: string; group_letter: string };

interface Props {
  userId: string;
  teams: Team[];
  existingUsername: string;
  hasOutright: boolean;
}

const STEPS = ["כינוי", "זוכה הטורניר", "מלך השערים"];

export default function OnboardingForm({
  userId,
  teams,
  existingUsername,
  hasOutright,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(existingUsername ? (hasOutright ? 2 : 1) : 0);
  const [username, setUsername] = useState(existingUsername);
  const [winnerId, setWinnerId] = useState<string>("");
  const [topScorer, setTopScorer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Flat list sorted alphabetically by Hebrew name
  const sortedTeams = [...teams].sort((a, b) =>
    (a.name_he ?? a.name).localeCompare(b.name_he ?? b.name, "he")
  );

  async function handleUsername() {
    if (!username.trim() || username.trim().length < 2) {
      setError("כינוי חייב להכיל לפחות 2 תווים");
      return;
    }
    setLoading(true);
    setError(null);

    const { error } = await supabase
      .from("users")
      .update({ username: username.trim() })
      .eq("id", userId);

    if (error?.code === "23505") {
      setError("הכינוי הזה תפוס, בחר אחר");
    } else if (error) {
      setError("שגיאה בשמירת הכינוי");
    } else {
      setStep(1);
    }
    setLoading(false);
  }

  async function handleOutright() {
    if (!winnerId) {
      setError("בחר קבוצה זוכה");
      return;
    }
    if (!topScorer.trim()) {
      setError("הזן שם שחקן");
      return;
    }
    setLoading(true);
    setError(null);

    const { error } = await supabase.from("outright_bets").upsert(
      {
        user_id: userId,
        predicted_winner_team_id: parseInt(winnerId),
        predicted_top_scorer_name: topScorer.trim(),
      },
      { onConflict: "user_id" }
    );

    if (error) {
      setError("שגיאה בשמירת הניחושים");
    } else {
      router.push("/dashboard");
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4 py-12">
      {/* Progress indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                i < step
                  ? "bg-green-500 text-white"
                  : i === step
                  ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                  : "bg-zinc-200 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500"
              }`}
            >
              {i < step ? "✓" : i + 1}
            </div>
            <span
              className={`text-xs hidden sm:block ${
                i === step
                  ? "text-zinc-900 dark:text-zinc-50 font-medium"
                  : "text-zinc-400"
              }`}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div className={`w-6 h-px ${i < step ? "bg-green-500" : "bg-zinc-200 dark:bg-zinc-700"}`} />
            )}
          </div>
        ))}
      </div>

      <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-6">
        {/* Step 0 — Nickname */}
        {step === 0 && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                👋 ברוך הבא!
              </h2>
              <p className="text-sm text-zinc-500 mt-1">
                בחר כינוי שיופיע בטבלאות הניקוד
              </p>
            </div>
            <input
              type="text"
              placeholder="כינוי (לדוגמה: GoalKing)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={20}
              className="w-full px-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent text-sm outline-none focus:ring-2 focus:ring-zinc-400 placeholder:text-zinc-400"
            />
            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
            <button
              onClick={handleUsername}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 font-medium text-sm hover:bg-zinc-700 transition-colors disabled:opacity-50"
            >
              {loading ? "שומר..." : "המשך ←"}
            </button>
          </div>
        )}

        {/* Step 1 — Tournament winner */}
        {step === 1 && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                🏆 זוכה הטורניר
              </h2>
              <p className="text-sm text-zinc-500 mt-1">
                איזו קבוצה תזכה במונדיאל 2026?
              </p>
            </div>

            {teams.length === 0 ? (
              <p className="text-sm text-amber-500 text-center">
                טבלת הקבוצות עדיין ריקה — הרץ <code>npm run seed:teams</code> תחילה
              </p>
            ) : (
              <select
                value={winnerId}
                onChange={(e) => setWinnerId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm outline-none focus:ring-2 focus:ring-zinc-400"
              >
                <option value="">-- בחר קבוצה --</option>
                {sortedTeams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.flag} {t.name_he ?? t.name}
                  </option>
                ))}
              </select>
            )}

            {error && <p className="text-sm text-red-500 text-center">{error}</p>}

            <button
              onClick={() => {
                if (!winnerId) { setError("בחר קבוצה זוכה"); return; }
                setError(null);
                setStep(2);
              }}
              disabled={loading || teams.length === 0}
              className="w-full py-3 rounded-xl bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 font-medium text-sm hover:bg-zinc-700 transition-colors disabled:opacity-50"
            >
              המשך ←
            </button>
          </div>
        )}

        {/* Step 2 — Top scorer */}
        {step === 2 && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                ⚽ מלך השערים
              </h2>
              <p className="text-sm text-zinc-500 mt-1">
                מי יהיה מלך השערים של המונדיאל? (הקלד שם השחקן)
              </p>
            </div>
            <input
              type="text"
              placeholder="לדוגמה: Kylian Mbappé"
              value={topScorer}
              onChange={(e) => setTopScorer(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent text-sm outline-none focus:ring-2 focus:ring-zinc-400 placeholder:text-zinc-400"
            />
            <p className="text-xs text-zinc-400 text-center">
              זכור: בשוויון נקודות — מי שמלך השערים שלו הבקיע יותר, הוא מנצח!
            </p>
            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
            <button
              onClick={handleOutright}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-green-600 text-white font-medium text-sm hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {loading ? "שומר..." : "✓ סיום ויציאה לדאשבורד"}
            </button>
            <button
              onClick={() => { setError(null); setStep(1); }}
              className="text-sm text-zinc-400 underline text-center"
            >
              חזרה
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
