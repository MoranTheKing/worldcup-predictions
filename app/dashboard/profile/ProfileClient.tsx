"use client";

import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────

type Team   = { id: number; name: string; name_he: string | null; logo_url: string | null };
type Player = { id: number; name: string; team_id: number | null; position: string | null };

interface Props {
  userId:                  string;
  username:                string;
  streak:                  number;
  jokersGroups:            number;
  jokersKnockouts:         number;
  outrightWinnerId:        number | null;
  outrightWinnerName:      string | null;
  outrightWinnerHe:        string | null;
  outrightWinnerLogo:      string | null;
  outrightTopScorerPlayerId: number | null;
  outrightTopScorerName:   string | null;
  firstMatchTime:          string | null;  // ISO string or null
  teams:                   Team[];
  players:                 Player[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function translatePosition(pos: string | null): string {
  if (!pos) return "";
  if (pos.includes("Attacker"))   return "חלוץ";
  if (pos.includes("Midfielder")) return "קשר";
  if (pos.includes("Defender"))   return "בלם";
  if (pos.includes("Goalkeeper")) return "שוער";
  return pos;
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ProfileClient({
  userId, username, streak, jokersGroups, jokersKnockouts,
  outrightWinnerId, outrightWinnerName, outrightWinnerHe, outrightWinnerLogo,
  outrightTopScorerPlayerId, outrightTopScorerName,
  firstMatchTime, teams, players,
}: Props) {
  const supabase = createClient();
  const router   = useRouter();

  // Derived lock state
  const isLocked = firstMatchTime ? new Date() >= new Date(firstMatchTime) : false;

  // ── Nickname edit state ────────────────────────────────────────────────────
  const [editingNickname,  setEditingNickname]  = useState(false);
  const [nicknameValue,    setNicknameValue]    = useState(username);
  const [nicknameSaving,   setNicknameSaving]   = useState(false);
  const [nicknameError,    setNicknameError]    = useState<string | null>(null);

  // ── Outright edit state ────────────────────────────────────────────────────
  const [editingOutright,  setEditingOutright]  = useState(false);
  const [winnerId,         setWinnerId]         = useState<string>(String(outrightWinnerId ?? ""));
  const [winnerLabel,      setWinnerLabel]      = useState<string>(outrightWinnerHe ?? outrightWinnerName ?? "");
  const [selectedPlayer,   setSelectedPlayer]   = useState<Player | null>(
    outrightTopScorerPlayerId ? players.find((p) => p.id === outrightTopScorerPlayerId) ?? null : null
  );
  const [topScorerText,    setTopScorerText]    = useState(outrightTopScorerName ?? "");
  const [outrightSaving,   setOutrightSaving]   = useState(false);
  const [outrightError,    setOutrightError]    = useState<string | null>(null);

  const hasPlayers   = players.length > 0;
  const sortedTeams  = [...teams].sort((a, b) =>
    (a.name_he ?? a.name).localeCompare(b.name_he ?? b.name, "he")
  );
  const sortedPlayers = [...players].sort((a, b) => {
    const aWin = String(a.team_id) === winnerId;
    const bWin = String(b.team_id) === winnerId;
    if (aWin && !bWin) return -1;
    if (!aWin && bWin) return 1;
    return a.name.localeCompare(b.name);
  });

  // ── Save nickname ──────────────────────────────────────────────────────────
  async function saveNickname() {
    if (!nicknameValue.trim() || nicknameValue.trim().length < 2) {
      setNicknameError("כינוי חייב להכיל לפחות 2 תווים");
      return;
    }
    setNicknameSaving(true);
    setNicknameError(null);
    const { error } = await supabase
      .from("users")
      .update({ username: nicknameValue.trim() })
      .eq("id", userId);
    if (error?.code === "23505") setNicknameError("הכינוי הזה תפוס, בחר אחר");
    else if (error) { console.error(error.message); setNicknameError("שגיאה בשמירה"); }
    else {
      setEditingNickname(false);
      router.refresh();
    }
    setNicknameSaving(false);
  }

  // ── Save outright predictions ──────────────────────────────────────────────
  async function saveOutright() {
    if (!winnerId) { setOutrightError("בחר קבוצה זוכה"); return; }
    if (hasPlayers && !selectedPlayer) { setOutrightError("בחר שחקן"); return; }
    if (!hasPlayers && !topScorerText.trim()) { setOutrightError("הזן שם שחקן"); return; }

    setOutrightSaving(true);
    setOutrightError(null);

    const payload: Record<string, unknown> = {
      user_id:                  userId,
      predicted_winner_team_id: parseInt(winnerId, 10),
    };
    if (selectedPlayer) {
      payload.predicted_top_scorer_player_id = selectedPlayer.id;
      payload.predicted_top_scorer_name      = selectedPlayer.name;
    } else {
      payload.predicted_top_scorer_player_id = null;
      payload.predicted_top_scorer_name      = topScorerText.trim();
    }

    const { error } = await supabase
      .from("outright_bets")
      .upsert(payload, { onConflict: "user_id" });

    if (error) {
      console.error(error.message, error.code);
      setOutrightError(`שגיאה בשמירה (${error.code})`);
    } else {
      setEditingOutright(false);
      router.refresh();
    }
    setOutrightSaving(false);
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const streakBadge = streak >= 3 ? "🔥" : streak <= -5 ? "🐢" : null;
  const displayWinner = outrightWinnerHe ?? outrightWinnerName;

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-zinc-50">הפרופיל שלי</h1>
        <p className="text-sm text-zinc-500 mt-0.5">נהל את הכינוי וניחושי האלופים שלך</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">

        {/* ── Nickname card ─────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">כינוי</p>
            {!editingNickname && (
              <button
                onClick={() => { setEditingNickname(true); setNicknameError(null); }}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
              >
                ✏️ ערוך
              </button>
            )}
          </div>

          {editingNickname ? (
            <div className="flex flex-col gap-3">
              <input
                autoFocus
                type="text"
                value={nicknameValue}
                onChange={(e) => setNicknameValue(e.target.value)}
                maxLength={20}
                className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent text-sm outline-none focus:ring-2 focus:ring-emerald-400"
              />
              {nicknameError && <p className="text-xs text-red-500">{nicknameError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={saveNickname}
                  disabled={nicknameSaving}
                  className="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 disabled:opacity-50"
                >
                  {nicknameSaving ? "שומר..." : "שמור"}
                </button>
                <button
                  onClick={() => { setEditingNickname(false); setNicknameValue(username); setNicknameError(null); }}
                  className="flex-1 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-medium"
                >
                  בטל
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-base font-bold text-white">
                {username.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-zinc-900 dark:text-zinc-50">{username} {streakBadge}</p>
                {streak !== 0 && (
                  <p className="text-xs text-zinc-500">{streak > 0 ? `+${streak}` : streak} רצף</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Jokers card ───────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
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

        {/* ── Outright predictions card (spans 2 cols on desktop) ───────────── */}
        <div className="md:col-span-2 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          {/* Header */}
          <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">ניחושי אלופים</p>
            {isLocked ? (
              <span className="flex items-center gap-1 text-xs text-zinc-400">
                🔒 נעול — הטורניר התחיל
              </span>
            ) : !editingOutright ? (
              <button
                onClick={() => { setEditingOutright(true); setOutrightError(null); }}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
              >
                ✏️ ערוך
              </button>
            ) : null}
          </div>

          {editingOutright && !isLocked ? (
            /* ── Edit mode ───────────────────────────────────────────────── */
            <div className="p-5 flex flex-col gap-4">
              <div>
                <p className="text-xs font-medium text-zinc-500 mb-1.5">🏆 זוכה הטורניר</p>
                <TeamPicker
                  teams={sortedTeams}
                  value={winnerId}
                  label={winnerLabel}
                  onChange={(id, label) => { setWinnerId(id); setWinnerLabel(label); setSelectedPlayer(null); }}
                />
              </div>

              <div>
                <p className="text-xs font-medium text-zinc-500 mb-1.5">⚽ מלך השערים</p>
                {hasPlayers ? (
                  <PlayerPicker
                    players={sortedPlayers}
                    winnerId={winnerId}
                    value={selectedPlayer}
                    onChange={setSelectedPlayer}
                  />
                ) : (
                  <input
                    type="text"
                    value={topScorerText}
                    onChange={(e) => setTopScorerText(e.target.value)}
                    placeholder="שם השחקן"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent text-sm outline-none focus:ring-2 focus:ring-emerald-400 placeholder:text-zinc-400"
                  />
                )}
              </div>

              {outrightError && <p className="text-xs text-red-500">{outrightError}</p>}

              <div className="flex gap-2">
                <button
                  onClick={saveOutright}
                  disabled={outrightSaving}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
                >
                  {outrightSaving ? "שומר..." : "שמור ניחושים"}
                </button>
                <button
                  onClick={() => {
                    setEditingOutright(false);
                    setWinnerId(String(outrightWinnerId ?? ""));
                    setWinnerLabel(outrightWinnerHe ?? outrightWinnerName ?? "");
                    setSelectedPlayer(outrightTopScorerPlayerId ? players.find((p) => p.id === outrightTopScorerPlayerId) ?? null : null);
                    setTopScorerText(outrightTopScorerName ?? "");
                    setOutrightError(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-sm font-medium"
                >
                  בטל
                </button>
              </div>
            </div>
          ) : (
            /* ── Display mode ────────────────────────────────────────────── */
            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-zinc-100 dark:divide-zinc-800">
              <div className="px-5 py-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-zinc-500 mb-1">זוכה הטורניר</p>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    {displayWinner ?? "—"}
                  </p>
                </div>
                {outrightWinnerLogo ? (
                  <Image src={outrightWinnerLogo} alt={displayWinner ?? ""} width={40} height={27} className="rounded object-cover flex-shrink-0" unoptimized />
                ) : (
                  <span className="text-2xl flex-shrink-0">🏆</span>
                )}
              </div>
              <div className="px-5 py-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-zinc-500 mb-1">מלך השערים</p>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    {outrightTopScorerName ?? "—"}
                  </p>
                </div>
                <Image src="/avatar-player.svg" alt="שחקן" width={36} height={36} className="flex-shrink-0 opacity-50" />
              </div>
            </div>
          )}

          {/* Lock explanation when matches are loaded */}
          {!isLocked && !editingOutright && firstMatchTime && (
            <div className="px-5 py-2 border-t border-zinc-100 dark:border-zinc-800">
              <p className="text-xs text-zinc-400">
                ניתן לערוך עד:{" "}
                {new Date(firstMatchTime).toLocaleString("he-IL", {
                  day: "numeric", month: "long", year: "numeric",
                  hour: "2-digit", minute: "2-digit",
                })}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── TeamPicker ─────────────────────────────────────────────────────────────────

function TeamPicker({
  teams, value, label, onChange,
}: {
  teams:    Team[];
  value:    string;
  label:    string;
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
        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
      >
        <span className="flex items-center gap-2">
          {selectedTeam?.logo_url && (
            <Image src={selectedTeam.logo_url} alt="" width={20} height={13} className="rounded-sm flex-shrink-0" unoptimized />
          )}
          <span className={value ? "text-zinc-900 dark:text-zinc-50" : "text-zinc-400"}>
            {value ? label : "-- בחר קבוצה --"}
          </span>
        </span>
        <span className="text-zinc-400 text-xs">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-zinc-100 dark:border-zinc-800">
            <input autoFocus type="text" placeholder="חיפוש..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-sm outline-none placeholder:text-zinc-400"
            />
          </div>
          <ul className="max-h-48 overflow-y-auto">
            {filtered.length === 0 && <li className="px-4 py-3 text-sm text-zinc-400 text-center">לא נמצאה קבוצה</li>}
            {filtered.map((t) => {
              const dl = t.name_he ?? t.name;
              return (
                <li key={t.id}>
                  <button type="button"
                    onClick={() => { onChange(String(t.id), dl); setOpen(false); setSearch(""); }}
                    className={`w-full text-right px-4 py-2 text-sm flex items-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors ${String(t.id) === value ? "bg-zinc-100 dark:bg-zinc-800 font-medium" : ""}`}
                  >
                    {t.logo_url && <Image src={t.logo_url} alt="" width={18} height={12} className="rounded-sm flex-shrink-0" unoptimized />}
                    <span className="text-zinc-900 dark:text-zinc-50">{dl}</span>
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
  players:  Player[];
  winnerId: string;
  value:    Player | null;
  onChange: (p: Player | null) => void;
}) {
  const [open,    setOpen]    = useState(false);
  const [search,  setSearch]  = useState("");
  const [showAll, setShowAll] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const winnerPlayers = players.filter((p) => String(p.team_id) === winnerId);
  const pool          = (showAll || winnerPlayers.length === 0) ? players : winnerPlayers;
  const filtered      = search.trim()
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
    <div ref={ref} className="relative flex flex-col gap-1.5">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
      >
        <span className={value ? "text-zinc-900 dark:text-zinc-50" : "text-zinc-400"}>
          {value ? value.name : "-- בחר שחקן --"}
        </span>
        <span className="text-zinc-400 text-xs">{open ? "▲" : "▼"}</span>
      </button>

      {winnerPlayers.length > 0 && (
        <button type="button" onClick={() => { setShowAll((s) => !s); setSearch(""); }}
          className="text-xs text-zinc-400 underline text-center">
          {showAll ? `שחקני הנבחרת הזוכה (${winnerPlayers.length})` : `כל השחקנים (${players.length})`}
        </button>
      )}

      {open && (
        <div className="absolute z-50 top-11 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-zinc-100 dark:border-zinc-800">
            <input autoFocus type="text" placeholder="חיפוש שחקן..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-sm outline-none placeholder:text-zinc-400"
            />
          </div>
          <ul className="max-h-48 overflow-y-auto">
            {filtered.length === 0 && <li className="px-4 py-3 text-sm text-zinc-400 text-center">לא נמצא שחקן</li>}
            {filtered.map((p) => (
              <li key={p.id}>
                <button type="button"
                  onClick={() => { onChange(p); setOpen(false); setSearch(""); }}
                  className={`w-full text-right px-4 py-2 text-sm flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors ${value?.id === p.id ? "bg-zinc-100 dark:bg-zinc-800 font-medium" : ""}`}
                >
                  <span className="text-zinc-900 dark:text-zinc-50">{p.name}</span>
                  {p.position && <span className="text-xs text-zinc-400">{translatePosition(p.position)}</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
