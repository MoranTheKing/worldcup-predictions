"use client";

import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────

type Team = {
  id:           number;
  name:         string;
  name_he:      string;
  flag:         string;
  logo_url:     string | null;  // flagcdn.com URL stored in DB
  group_letter: string;
};

type Player = {
  id:       number;
  name:     string;
  team_id:  number | null;
  position: string | null;
};

interface Props {
  userId:           string;
  teams:            Team[];
  players:          Player[];
  existingUsername: string;
  hasOutright:      boolean;
}

const STEPS = ["כינוי", "זוכה הטורניר", "מלך השערים"];

// ── Flag image — uses logo_url from DB (flagcdn.com), no local map needed ──────
function FlagImg({ team, size = 24 }: { team: Team; size?: number }) {
  if (!team.logo_url) return null;
  return (
    <Image
      src={team.logo_url}
      alt={team.name}
      width={size}
      height={Math.round(size * 0.67)}
      className="rounded-sm object-cover flex-shrink-0"
      unoptimized
    />
  );
}

// ── Input focus/blur helpers ───────────────────────────────────────────────────
function onInputFocus(e: React.FocusEvent<HTMLInputElement>) {
  e.target.style.borderColor = "var(--wc-neon)";
  e.target.style.boxShadow   = "0 0 0 3px var(--wc-neon-glow)";
}
function onInputBlur(e: React.FocusEvent<HTMLInputElement>) {
  e.target.style.borderColor = "var(--wc-border)";
  e.target.style.boxShadow   = "none";
}

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
  const [topScorerText,  setTopScorerText]  = useState("");
  const [error,          setError]          = useState<string | null>(null);
  const [loading,        setLoading]        = useState(false);

  const hasPlayerData = players.length > 0;

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

    // upsert ensures the row exists even if the auth trigger didn't fire
    const { error: upsErr } = await supabase
      .from("users")
      .upsert({ id: userId, username: username.trim() }, { onConflict: "id" });

    if (upsErr?.code === "23505") setError("הכינוי הזה תפוס, בחר אחר");
    else if (upsErr) {
      console.error("users upsert:", upsErr.message, upsErr.code);
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

    // Guarantee public.users row exists before FK insert
    const { error: ensureErr } = await supabase
      .from("users")
      .upsert({ id: userId }, { onConflict: "id" });

    if (ensureErr) {
      console.error("ensure users row:", ensureErr.message, ensureErr.code);
      setError(`שגיאה בהגדרת פרופיל (${ensureErr.code ?? ensureErr.message})`);
      setLoading(false);
      return;
    }

    const payload: Record<string, unknown> = {
      user_id:                  userId,
      predicted_winner_team_id: parseInt(winnerId, 10),
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
      console.error("outright_bets upsert:", upsErr.message, "| code:", upsErr.code, "| details:", upsErr.details);
      setError(`שגיאה בשמירת הניחושים (${upsErr.code ?? upsErr.message})`);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
    setLoading(false);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4 py-12"
      style={{ background: "var(--wc-bg)" }}
    >

      {/* Progress bar */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors"
              style={
                i < step
                  ? { background: "var(--wc-neon)", color: "var(--wc-fg-inverse)" }
                  : i === step
                  ? { background: "var(--wc-fg1)", color: "var(--wc-bg)" }
                  : { background: "var(--wc-border)", color: "var(--wc-fg3)" }
              }
            >
              {i < step ? "✓" : i + 1}
            </div>
            <span
              className="text-xs hidden sm:block"
              style={
                i === step
                  ? { color: "var(--wc-fg1)", fontWeight: 500 }
                  : { color: "var(--wc-fg3)" }
              }
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div
                className="w-6 h-px"
                style={{ background: i < step ? "var(--wc-neon)" : "var(--wc-border)" }}
              />
            )}
          </div>
        ))}
      </div>

      <div
        className="w-full max-w-sm rounded-2xl shadow-sm p-6"
        style={{
          background: "var(--wc-surface)",
          border: "1px solid var(--wc-border)",
        }}
      >

        {/* ── Step 0 — Nickname ─────────────────────────────────────────── */}
        {step === 0 && (
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className="text-xl font-bold"
                style={{ fontFamily: "var(--font-display)", color: "var(--wc-fg1)" }}
              >
                👋 ברוך הבא!
              </h2>
              <p className="text-sm mt-1" style={{ color: "var(--wc-fg2)" }}>
                בחר כינוי שיופיע בטבלאות הניקוד
              </p>
            </div>
            <input
              type="text"
              placeholder="כינוי (לדוגמה: GoalKing)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleUsername()}
              onFocus={onInputFocus}
              onBlur={onInputBlur}
              maxLength={20}
              className="w-full text-sm"
              style={{
                background: "var(--wc-raised)",
                border: "1.5px solid var(--wc-border)",
                borderRadius: 12,
                color: "var(--wc-fg1)",
                padding: "10px 14px",
                outline: "none",
              }}
            />
            {error && (
              <p
                className="text-sm text-center"
                style={{
                  background: "var(--wc-danger-bg)",
                  color: "var(--wc-danger)",
                  borderRadius: 8,
                  padding: "8px 12px",
                }}
              >
                {error}
              </p>
            )}
            <button
              onClick={handleUsername}
              disabled={loading}
              className="w-full py-3 rounded-xl font-medium text-sm disabled:opacity-50 transition-colors"
              style={{
                background: "var(--wc-neon)",
                color: "var(--wc-fg-inverse)",
                boxShadow: "0 0 16px var(--wc-neon-glow)",
              }}
            >
              {loading ? "שומר..." : "המשך ←"}
            </button>
          </div>
        )}

        {/* ── Step 1 — Tournament winner ────────────────────────────────── */}
        {step === 1 && (
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className="text-xl font-bold"
                style={{ fontFamily: "var(--font-display)", color: "var(--wc-fg1)" }}
              >
                🏆 זוכה הטורניר
              </h2>
              <p className="text-sm mt-1" style={{ color: "var(--wc-fg2)" }}>
                איזו קבוצה תזכה במונדיאל 2026?
              </p>
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

            {error && (
              <p
                className="text-sm text-center"
                style={{
                  background: "var(--wc-danger-bg)",
                  color: "var(--wc-danger)",
                  borderRadius: 8,
                  padding: "8px 12px",
                }}
              >
                {error}
              </p>
            )}
            <button
              onClick={() => {
                if (!winnerId) { setError("בחר קבוצה זוכה"); return; }
                setError(null);
                setSelectedPlayer(null);
                setStep(2);
              }}
              disabled={loading || teams.length === 0}
              className="w-full py-3 rounded-xl font-medium text-sm disabled:opacity-50 transition-colors"
              style={{
                background: "var(--wc-neon)",
                color: "var(--wc-fg-inverse)",
                boxShadow: "0 0 16px var(--wc-neon-glow)",
              }}
            >
              המשך ←
            </button>
          </div>
        )}

        {/* ── Step 2 — Top scorer ───────────────────────────────────────── */}
        {step === 2 && (
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className="text-xl font-bold"
                style={{ fontFamily: "var(--font-display)", color: "var(--wc-fg1)" }}
              >
                ⚽ מלך השערים
              </h2>
              <p className="text-sm mt-1" style={{ color: "var(--wc-fg2)" }}>
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
              <input
                type="text"
                placeholder="לדוגמה: Kylian Mbappé"
                value={topScorerText}
                onChange={(e) => setTopScorerText(e.target.value)}
                onFocus={onInputFocus}
                onBlur={onInputBlur}
                className="w-full text-sm"
                style={{
                  background: "var(--wc-raised)",
                  border: "1.5px solid var(--wc-border)",
                  borderRadius: 12,
                  color: "var(--wc-fg1)",
                  padding: "10px 14px",
                  outline: "none",
                }}
              />
            )}

            <p className="text-xs text-center" style={{ color: "var(--wc-fg3)" }}>
              🔥 בשוויון נקודות — מי שמלך השערים שלו הבקיע יותר, הוא מנצח!
            </p>

            {error && (
              <p
                className="text-sm text-center"
                style={{
                  background: "var(--wc-danger-bg)",
                  color: "var(--wc-danger)",
                  borderRadius: 8,
                  padding: "8px 12px",
                }}
              >
                {error}
              </p>
            )}

            <button
              onClick={handleOutright}
              disabled={loading}
              className="w-full py-3 rounded-xl font-medium text-sm disabled:opacity-50 transition-colors"
              style={{
                background: "var(--wc-neon)",
                color: "var(--wc-fg-inverse)",
                boxShadow: "0 0 16px var(--wc-neon-glow)",
              }}
            >
              {loading ? "שומר..." : "✓ סיום ויציאה לדאשבורד"}
            </button>
            <button
              onClick={() => { setError(null); setStep(1); }}
              className="text-sm underline text-center"
              style={{ color: "var(--wc-fg3)" }}
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
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm outline-none"
        style={{
          background: "var(--wc-raised)",
          border: "1.5px solid var(--wc-border)",
          borderRadius: 12,
          color: "var(--wc-fg1)",
        }}
      >
        <span className="flex items-center gap-2">
          {selectedTeam && <FlagImg team={selectedTeam} />}
          <span style={{ color: value ? "var(--wc-fg1)" : "var(--wc-fg3)" }}>
            {value ? label : "-- בחר קבוצה --"}
          </span>
        </span>
        <span className="text-xs" style={{ color: "var(--wc-fg3)" }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div
          className="absolute z-50 mt-1 w-full overflow-hidden"
          style={{
            background: "var(--wc-surface)",
            border: "1px solid var(--wc-border)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            borderRadius: 12,
          }}
        >
          <div
            className="p-2"
            style={{ borderBottom: "1px solid var(--wc-border)" }}
          >
            <input
              autoFocus
              type="text"
              placeholder="חיפוש..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{
                background: "var(--wc-raised)",
                border: "1px solid var(--wc-border)",
                color: "var(--wc-fg1)",
              }}
            />
          </div>
          <ul className="max-h-52 overflow-y-auto">
            {filtered.length === 0 && (
              <li className="px-4 py-3 text-sm text-center" style={{ color: "var(--wc-fg3)" }}>
                לא נמצאה קבוצה
              </li>
            )}
            {filtered.map((t) => {
              const displayLabel = t.name_he ?? t.name;
              const isSelected   = String(t.id) === value;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(String(t.id), displayLabel);
                      setOpen(false);
                      setSearch("");
                    }}
                    className="w-full text-right px-4 py-2.5 text-sm flex items-center gap-2 transition-colors"
                    style={
                      isSelected
                        ? { background: "var(--wc-neon-bg)", color: "var(--wc-neon)", fontWeight: 500 }
                        : { color: "var(--wc-fg1)" }
                    }
                    onMouseEnter={(e) => {
                      if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = "var(--wc-raised)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                    }}
                  >
                    <FlagImg team={t} size={20} />
                    <span>{displayLabel}</span>
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
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm outline-none"
        style={{
          background: "var(--wc-raised)",
          border: "1.5px solid var(--wc-border)",
          borderRadius: 12,
          color: "var(--wc-fg1)",
        }}
      >
        <span className="flex items-center gap-2">
          <Image src="/avatar-player.svg" alt="" width={20} height={20} className="opacity-50" />
          <span style={{ color: value ? "var(--wc-fg1)" : "var(--wc-fg3)" }}>
            {value ? value.name : "-- בחר שחקן --"}
          </span>
        </span>
        <span className="text-xs" style={{ color: "var(--wc-fg3)" }}>{open ? "▲" : "▼"}</span>
      </button>

      {/* Toggle: winner team ↔ all players */}
      {winnerPlayers.length > 0 && (
        <button
          type="button"
          onClick={() => { setShowAll((s) => !s); setSearch(""); }}
          className="text-xs underline text-center"
          style={{ color: "var(--wc-fg3)" }}
        >
          {showAll
            ? `הצג שחקני הנבחרת הזוכה בלבד (${winnerPlayers.length})`
            : `הצג את כל השחקנים (${players.length})`}
        </button>
      )}

      {/* Dropdown */}
      {open && (
        <div
          className="absolute z-50 top-12 w-full overflow-hidden"
          style={{
            background: "var(--wc-surface)",
            border: "1px solid var(--wc-border)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            borderRadius: 12,
          }}
        >
          <div
            className="p-2"
            style={{ borderBottom: "1px solid var(--wc-border)" }}
          >
            <input
              autoFocus
              type="text"
              placeholder="חיפוש שם שחקן..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{
                background: "var(--wc-raised)",
                border: "1px solid var(--wc-border)",
                color: "var(--wc-fg1)",
              }}
            />
          </div>

          <div
            className="px-4 py-1.5 text-xs"
            style={{
              color: "var(--wc-fg3)",
              background: "var(--wc-raised)",
              borderBottom: "1px solid var(--wc-border)",
            }}
          >
            {showAll || winnerPlayers.length === 0
              ? `כל השחקנים (${filtered.length})`
              : `שחקני הנבחרת הזוכה (${filtered.length})`}
          </div>

          <ul className="max-h-56 overflow-y-auto">
            {filtered.length === 0 && (
              <li className="px-4 py-3 text-sm text-center" style={{ color: "var(--wc-fg3)" }}>
                לא נמצא שחקן
              </li>
            )}
            {filtered.map((p) => {
              const isSelected = value?.id === p.id;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => { onChange(p); setOpen(false); setSearch(""); }}
                    className="w-full text-right px-4 py-2.5 text-sm flex items-center justify-between transition-colors"
                    style={
                      isSelected
                        ? { background: "var(--wc-neon-bg)", color: "var(--wc-neon)", fontWeight: 500 }
                        : { color: "var(--wc-fg1)" }
                    }
                    onMouseEnter={(e) => {
                      if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = "var(--wc-raised)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Image src="/avatar-player.svg" alt="" width={18} height={18} className="opacity-40" />
                      <span>{p.name}</span>
                    </div>
                    {p.position && (
                      <span className="text-xs mr-1" style={{ color: "var(--wc-fg3)" }}>
                        {translatePosition(p.position)}
                      </span>
                    )}
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

function translatePosition(pos: string): string {
  if (pos.includes("Attacker"))   return "חלוץ";
  if (pos.includes("Midfielder")) return "קשר";
  if (pos.includes("Defender"))   return "בלם";
  if (pos.includes("Goalkeeper")) return "שוער";
  return pos;
}
