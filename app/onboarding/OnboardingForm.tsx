"use client";

import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// ISO 3166-1 alpha-2 codes for flagcdn.com (subdivision codes for England/Scotland)
const COUNTRY_CODE: Record<string, string> = {
  "Mexico": "mx",                   "South Africa": "za",
  "South Korea": "kr",              "Czech Republic": "cz",
  "Canada": "ca",                   "Bosnia and Herzegovina": "ba",
  "Qatar": "qa",                    "Switzerland": "ch",
  "United States": "us",            "Paraguay": "py",
  "Australia": "au",                "Turkiye": "tr",
  "Brazil": "br",                   "Morocco": "ma",
  "Haiti": "ht",                    "Scotland": "gb-sct",
  "Germany": "de",                  "Curaçao": "cw",
  "Ivory Coast": "ci",              "Ecuador": "ec",
  "Netherlands": "nl",              "Japan": "jp",
  "Sweden": "se",                   "Tunisia": "tn",
  "Spain": "es",                    "Cape Verde": "cv",
  "Saudi Arabia": "sa",             "Uruguay": "uy",
  "Belgium": "be",                  "Egypt": "eg",
  "Iran": "ir",                     "New Zealand": "nz",
  "France": "fr",                   "Senegal": "sn",
  "Iraq": "iq",                     "Norway": "no",
  "Argentina": "ar",                "Algeria": "dz",
  "Austria": "at",                  "Jordan": "jo",
  "Portugal": "pt",                 "DR Congo": "cd",
  "Ghana": "gh",                    "Panama": "pa",
  "England": "gb-eng",              "Croatia": "hr",
  "Uzbekistan": "uz",               "Colombia": "co",
};

function FlagImg({ name, size = 24 }: { name: string; size?: number }) {
  const code = COUNTRY_CODE[name];
  if (!code) return null;
  return (
    <Image
      src={`https://flagcdn.com/w40/${code}.png`}
      alt={name}
      width={size}
      height={Math.round(size * 0.67)}
      className="rounded-sm object-cover flex-shrink-0"
      unoptimized
    />
  );
}

// ── Types ──────────────────────────────────────────────────────────────────────

type Team   = { id: number; name: string; name_he: string; flag: string; group_letter: string };
type Player = { id: number; name: string; team_id: number | null; position: string | null };

interface Props {
  userId:           string;
  teams:            Team[];
  players:          Player[];
  existingUsername: string;
  hasOutright:      boolean;
}

const STEPS = ["כינוי", "זוכה הטורניר", "מלך השערים"];

// ── Main component ─────────────────────────────────────────────────────────────

export default function OnboardingForm({
  userId, teams, players, existingUsername, hasOutright,
}: Props) {
  const router   = useRouter();
  const supabase = createClient();

  const [step,           setStep]           = useState(existingUsername ? (hasOutright ? 2 : 1) : 0);
  const [username,       setUsername]       = useState(existingUsername);
  const [winnerId,       setWinnerId]       = useState<string>("");
  const [winnerLabel,    setWinnerLabel]    = useState<string>("");
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [topScorerText,  setTopScorerText]  = useState(""); // text fallback when no players in DB
  const [error,          setError]          = useState<string | null>(null);
  const [loading,        setLoading]        = useState(false);

  const hasPlayerData = players.length > 0;

  // Teams sorted by Hebrew name
  const sortedTeams = [...teams].sort((a, b) =>
    (a.name_he ?? a.name).localeCompare(b.name_he ?? b.name, "he")
  );

  // Players sorted: winner team first, then alphabetically
  const sortedPlayers = [...players].sort((a, b) => {
    const aWin = String(a.team_id) === winnerId;
    const bWin = String(b.team_id) === winnerId;
    if (aWin && !bWin) return -1;
    if (!aWin && bWin) return 1;
    return a.name.localeCompare(b.name);
  });

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleUsername() {
    if (!username.trim() || username.trim().length < 2) {
      setError("כינוי חייב להכיל לפחות 2 תווים");
      return;
    }
    setLoading(true);
    setError(null);

    // ✅ FIX: use upsert (not update) so the row is created if the
    //    auth trigger didn't fire (e.g. existing users before migration).
    const { error: upsErr } = await supabase
      .from("users")
      .upsert({ id: userId, username: username.trim() }, { onConflict: "id" });

    if (upsErr?.code === "23505") setError("הכינוי הזה תפוס, בחר אחר");
    else if (upsErr) {
      console.error("users upsert:", upsErr);
      setError("שגיאה בשמירת הכינוי");
    } else {
      setStep(1);
    }
    setLoading(false);
  }

  async function handleOutright() {
    if (!winnerId) { setError("בחר קבוצה זוכה"); return; }
    if (hasPlayerData && !selectedPlayer) { setError("בחר שחקן מהרשימה"); return; }
    if (!hasPlayerData && !topScorerText.trim()) { setError("הזן שם שחקן"); return; }

    setLoading(true);
    setError(null);

    const payload: Record<string, unknown> = {
      user_id:                   userId,
      predicted_winner_team_id:  parseInt(winnerId, 10),
    };

    if (selectedPlayer) {
      payload.predicted_top_scorer_player_id = selectedPlayer.id;
      payload.predicted_top_scorer_name      = selectedPlayer.name;
    } else {
      payload.predicted_top_scorer_name = topScorerText.trim();
    }

    const { error: upsErr } = await supabase
      .from("outright_bets")
      .upsert(payload, { onConflict: "user_id" });

    if (upsErr) {
      console.error("outright_bets upsert:", upsErr);
      setError("שגיאה בשמירת הניחושים");
    } else {
      router.push("/dashboard");
      router.refresh();
    }
    setLoading(false);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4 py-12">

      {/* Progress bar */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              i < step
                ? "bg-green-500 text-white"
                : i === step
                ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                : "bg-zinc-200 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500"
            }`}>
              {i < step ? "✓" : i + 1}
            </div>
            <span className={`text-xs hidden sm:block ${
              i === step ? "text-zinc-900 dark:text-zinc-50 font-medium" : "text-zinc-400"
            }`}>
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div className={`w-6 h-px ${i < step ? "bg-green-500" : "bg-zinc-200 dark:bg-zinc-700"}`} />
            )}
          </div>
        ))}
      </div>

      <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-6">

        {/* ── Step 0 — Nickname ─────────────────────────────────────────── */}
        {step === 0 && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">👋 ברוך הבא!</h2>
              <p className="text-sm text-zinc-500 mt-1">בחר כינוי שיופיע בטבלאות הניקוד</p>
            </div>
            <input
              type="text"
              placeholder="כינוי (לדוגמה: GoalKing)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleUsername()}
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

        {/* ── Step 1 — Tournament winner ────────────────────────────────── */}
        {step === 1 && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">🏆 זוכה הטורניר</h2>
              <p className="text-sm text-zinc-500 mt-1">איזו קבוצה תזכה במונדיאל 2026?</p>
            </div>

            {teams.length === 0 ? (
              <p className="text-sm text-amber-500 text-center">
                טבלת הקבוצות ריקה — הרץ <code>npm run seed:teams</code>
              </p>
            ) : (
              <TeamPicker
                teams={sortedTeams}
                value={winnerId}
                label={winnerLabel}
                onChange={(id, label) => { setWinnerId(id); setWinnerLabel(label); }}
              />
            )}

            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
            <button
              onClick={() => {
                if (!winnerId) { setError("בחר קבוצה זוכה"); return; }
                setError(null);
                setSelectedPlayer(null); // reset player when winner changes
                setStep(2);
              }}
              disabled={loading || teams.length === 0}
              className="w-full py-3 rounded-xl bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 font-medium text-sm hover:bg-zinc-700 transition-colors disabled:opacity-50"
            >
              המשך ←
            </button>
          </div>
        )}

        {/* ── Step 2 — Top scorer ───────────────────────────────────────── */}
        {step === 2 && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">⚽ מלך השערים</h2>
              <p className="text-sm text-zinc-500 mt-1">
                {hasPlayerData
                  ? "שחקני הנבחרת הזוכה שבחרת מוצגים ראשונים"
                  : "מי יהיה מלך השערים של המונדיאל?"}
              </p>
            </div>

            {hasPlayerData ? (
              <PlayerPicker
                players={sortedPlayers}
                winnerId={winnerId}
                value={selectedPlayer}
                onChange={setSelectedPlayer}
              />
            ) : (
              /* Fallback: free-text until seed:players is run */
              <input
                type="text"
                placeholder="לדוגמה: Kylian Mbappé"
                value={topScorerText}
                onChange={(e) => setTopScorerText(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent text-sm outline-none focus:ring-2 focus:ring-zinc-400 placeholder:text-zinc-400"
              />
            )}

            <p className="text-xs text-zinc-400 text-center">
              🔥 בשוויון נקודות — מי שמלך השערים שלו הבקיע יותר, הוא מנצח!
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

// ── TeamPicker ─────────────────────────────────────────────────────────────────

function TeamPicker({
  teams, value, label, onChange,
}: {
  teams: Team[];
  value: string;
  label: string;
  onChange: (id: string, label: string) => void;
}) {
  const [open,   setOpen]   = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const filtered = search.trim()
    ? teams.filter((t) =>
        (t.name_he ?? t.name).includes(search) ||
        t.name.toLowerCase().includes(search.toLowerCase())
      )
    : teams;

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectedTeam = teams.find((t) => String(t.id) === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm outline-none focus:ring-2 focus:ring-zinc-400"
      >
        <span className="flex items-center gap-2">
          {value && <FlagImg name={selectedTeam?.name ?? ""} />}
          <span className={value ? "text-zinc-900 dark:text-zinc-50" : "text-zinc-400"}>
            {value ? label : "-- בחר קבוצה --"}
          </span>
        </span>
        <span className="text-zinc-400 text-xs">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-zinc-100 dark:border-zinc-800">
            <input
              autoFocus
              type="text"
              placeholder="חיפוש..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-sm outline-none placeholder:text-zinc-400"
            />
          </div>
          <ul className="max-h-52 overflow-y-auto">
            {filtered.length === 0 && (
              <li className="px-4 py-3 text-sm text-zinc-400 text-center">לא נמצאה קבוצה</li>
            )}
            {filtered.map((t) => {
              const displayLabel = t.name_he ?? t.name;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(String(t.id), displayLabel);
                      setOpen(false);
                      setSearch("");
                    }}
                    className={`w-full text-right px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors ${
                      String(t.id) === value ? "bg-zinc-100 dark:bg-zinc-800 font-medium" : ""
                    }`}
                  >
                    <FlagImg name={t.name} size={20} />
                    <span className="text-zinc-900 dark:text-zinc-50">{displayLabel}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── PlayerPicker ───────────────────────────────────────────────────────────────

function PlayerPicker({
  players, winnerId, value, onChange,
}: {
  players: Player[];
  winnerId: string;
  value:    Player | null;
  onChange: (p: Player | null) => void;
}) {
  const [open,   setOpen]   = useState(false);
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Decide which pool to display
  const winnerPlayers = players.filter((p) => String(p.team_id) === winnerId);
  const pool = (showAll || winnerPlayers.length === 0) ? players : winnerPlayers;

  const filtered = search.trim()
    ? pool.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : pool;

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative flex flex-col gap-2">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm outline-none focus:ring-2 focus:ring-zinc-400"
      >
        <span className={value ? "text-zinc-900 dark:text-zinc-50" : "text-zinc-400"}>
          {value ? value.name : "-- בחר שחקן --"}
        </span>
        <span className="text-zinc-400 text-xs">{open ? "▲" : "▼"}</span>
      </button>

      {/* Toggle: winner team only ↔ all players */}
      {winnerPlayers.length > 0 && (
        <button
          type="button"
          onClick={() => { setShowAll((s) => !s); setSearch(""); }}
          className="text-xs text-zinc-400 underline text-center"
        >
          {showAll
            ? `הצג שחקני הנבחרת הזוכה בלבד (${winnerPlayers.length})`
            : `הצג את כל השחקנים (${players.length})`}
        </button>
      )}

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 top-12 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-zinc-100 dark:border-zinc-800">
            <input
              autoFocus
              type="text"
              placeholder="חיפוש שם שחקן..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-sm outline-none placeholder:text-zinc-400"
            />
          </div>

          {/* Section header */}
          <div className="px-4 py-1.5 text-xs text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
            {showAll || winnerPlayers.length === 0
              ? `כל השחקנים (${filtered.length})`
              : `שחקני הנבחרת הזוכה (${filtered.length})`}
          </div>

          <ul className="max-h-56 overflow-y-auto">
            {filtered.length === 0 && (
              <li className="px-4 py-3 text-sm text-zinc-400 text-center">לא נמצא שחקן</li>
            )}
            {filtered.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(p);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={`w-full text-right px-4 py-2.5 text-sm flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors ${
                    value?.id === p.id ? "bg-zinc-100 dark:bg-zinc-800 font-medium" : ""
                  }`}
                >
                  <span className="text-zinc-900 dark:text-zinc-50">{p.name}</span>
                  {p.position && (
                    <span className="text-xs text-zinc-400 mr-2">{translatePosition(p.position)}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function translatePosition(pos: string): string {
  if (pos.includes("Attacker"))  return "חלוץ";
  if (pos.includes("Midfielder")) return "קשר";
  if (pos.includes("Defender"))   return "בלם";
  if (pos.includes("Goalkeeper")) return "שוער";
  return pos;
}
