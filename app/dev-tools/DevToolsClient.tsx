"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { notifyDevLiveRefresh } from "@/lib/dev/live-refresh";
import {
  getStageLabelHe,
  getTeamDisplayName,
  type MatchPhase,
  type MatchStatus,
  type MatchWithTeams,
} from "@/lib/tournament/matches";

export type DevMatchRow = MatchWithTeams;

type Props = { matches: DevMatchRow[]; error: string | null };

type Filter = "all" | "scheduled" | "live" | "finished";

const MATCH_PHASE_OPTIONS: Array<{ value: MatchPhase | ""; label: string; knockoutOnly?: boolean }> = [
  { value: "", label: "רגיל" },
  { value: "first_half", label: "מחצית 1" },
  { value: "halftime", label: "מחצית" },
  { value: "second_half", label: "מחצית 2" },
  { value: "extra_time", label: "הארכה", knockoutOnly: true },
  { value: "penalties", label: "פנדלים", knockoutOnly: true },
];

function isKnockoutMatch(matchNumber: number) {
  return matchNumber >= 73;
}

function isRegularDraw(match: Pick<DevMatchRow, "home_score" | "away_score">) {
  return (match.home_score ?? 0) === (match.away_score ?? 0);
}

function randomPenaltyPair() {
  const home = 3 + Math.floor(Math.random() * 4);
  let away = 3 + Math.floor(Math.random() * 4);

  if (away === home) {
    away = away === 6 ? away - 1 : away + 1;
  }

  return { home, away };
}

function isMinuteLockedPhase(phase: MatchPhase | null) {
  return phase === "halftime" || phase === "penalties";
}

function isExtraTimePhase(phase: MatchPhase | null) {
  return phase === "extra_time" || phase === "penalties";
}

function hasPenaltyScore(match: Pick<DevMatchRow, "home_penalty_score" | "away_penalty_score">) {
  return match.home_penalty_score !== null || match.away_penalty_score !== null;
}

function getPhaseFromMinute(
  matchNumber: number,
  minute: number | null,
  currentPhase: MatchPhase | null,
) {
  if (minute === null) {
    return currentPhase;
  }

  if (isKnockoutMatch(matchNumber) && minute >= 91) {
    return "extra_time";
  }

  if (currentPhase === "extra_time") {
    return minute <= 45 ? "first_half" : "second_half";
  }

  return currentPhase ?? (minute <= 45 ? "first_half" : "second_half");
}

function normalizeDraft(match: DevMatchRow): DevMatchRow {
  const knockout = isKnockoutMatch(match.match_number);
  const regularDraw = isRegularDraw(match);
  let matchPhase = match.status === "live" ? match.match_phase : null;

  if (match.status === "live") {
    if (!knockout && isExtraTimePhase(matchPhase)) {
      matchPhase = null;
    }

    if (knockout && regularDraw && hasPenaltyScore(match)) {
      matchPhase = "penalties";
    } else {
      matchPhase = getPhaseFromMinute(match.match_number, match.minute, matchPhase);
    }

    if ((!knockout || !regularDraw) && matchPhase === "penalties") {
      matchPhase = null;
    }
  }

  if (match.status === "scheduled") {
    return {
      ...match,
      match_phase: null,
      minute: null,
      is_extra_time: false,
      home_penalty_score: null,
      away_penalty_score: null,
    };
  }

  if (!knockout || !regularDraw) {
    return {
      ...match,
      match_phase: matchPhase,
      minute: isMinuteLockedPhase(matchPhase) ? null : match.minute,
      is_extra_time: knockout ? Boolean(match.is_extra_time) : false,
      home_penalty_score: null,
      away_penalty_score: null,
    };
  }

  return {
    ...match,
    match_phase: matchPhase,
    minute: isMinuteLockedPhase(matchPhase) ? null : match.minute,
    is_extra_time: Boolean(match.is_extra_time),
  };
}

function ensureFinishedWinner(match: DevMatchRow): DevMatchRow {
  if (!isKnockoutMatch(match.match_number) || match.status !== "finished" || !isRegularDraw(match)) {
    return normalizeDraft(match);
  }

  if (
    match.home_penalty_score !== null &&
    match.away_penalty_score !== null &&
    match.home_penalty_score !== match.away_penalty_score
  ) {
    return normalizeDraft(match);
  }

  const penalties = randomPenaltyPair();
  return normalizeDraft({
    ...match,
    is_extra_time: true,
    home_penalty_score: penalties.home,
    away_penalty_score: penalties.away,
  });
}

function toPayload(match: DevMatchRow) {
  return {
    match_number: match.match_number,
    status: match.status as MatchStatus,
    match_phase: match.match_phase,
    home_score: match.home_score,
    away_score: match.away_score,
    minute: match.minute,
    is_extra_time: match.is_extra_time ?? false,
    home_penalty_score: match.home_penalty_score,
    away_penalty_score: match.away_penalty_score,
  };
}

function buildScheduledReset(match: DevMatchRow) {
  return normalizeDraft({
    ...match,
    status: "scheduled",
    match_phase: null,
    home_score: 0,
    away_score: 0,
    minute: null,
    is_extra_time: false,
    home_penalty_score: null,
    away_penalty_score: null,
  });
}

export default function DevToolsClient({ matches, error }: Props) {
  const resetKey = useMemo(
    () =>
      matches
        .map(
          (match) =>
            `${match.match_number}:${match.status}:${match.match_phase}:${match.minute}:${match.home_score}:${match.away_score}:${match.home_team_id}:${match.away_team_id}`,
        )
        .join("|"),
    [matches],
  );

  return <DevToolsClientInner key={resetKey} matches={matches} error={error} />;
}

function DevToolsClientInner({ matches, error }: Props) {
  const router = useRouter();
  const [refreshPending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [drafts, setDrafts] = useState<DevMatchRow[]>(matches);

  const pending = refreshPending || bulkSaving;

  const counts = useMemo(
    () => ({
      all: drafts.length,
      scheduled: drafts.filter((match) => match.status === "scheduled").length,
      live: drafts.filter((match) => match.status === "live").length,
      finished: drafts.filter((match) => match.status === "finished").length,
    }),
    [drafts],
  );

  const filtered = useMemo(
    () => drafts.filter((match) => filter === "all" || match.status === filter),
    [drafts, filter],
  );

  function updateDraft(matchNumber: number, recipe: (match: DevMatchRow) => DevMatchRow) {
    setDrafts((current) =>
      current.map((match) => (match.match_number === matchNumber ? normalizeDraft(recipe(match)) : match)),
    );
  }

  function refreshWithMessage(nextMessage: string) {
    setMessage(nextMessage);
    notifyDevLiveRefresh(nextMessage);
    startTransition(() => router.refresh());
  }

  async function persistDrafts(nextDrafts: DevMatchRow[], successMessage: string) {
    setBulkSaving(true);
    setMessage(null);
    setDrafts(nextDrafts);

    try {
      const res = await fetch("/api/dev/matches/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matches: nextDrafts.map((match) => toPayload(ensureFinishedWinner(match))),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setMessage(`Error: ${body.error ?? res.statusText}`);
        return;
      }

      refreshWithMessage(successMessage);
    } finally {
      setBulkSaving(false);
    }
  }

  async function saveMatch(matchNumber: number) {
    const draft = drafts.find((match) => match.match_number === matchNumber);
    if (!draft) return;

    await persistSingleMatch(
      matchNumber,
      draft,
      `משחק ${matchNumber} נשמר. הטבלאות, לוח המשחקים והנוקאאוט סונכרנו מחדש.`,
    );
  }

  async function persistSingleMatch(
    matchNumber: number,
    nextDraft: DevMatchRow,
    successMessage: string,
  ) {
    setBusyId(matchNumber);
    setMessage(null);
    setDrafts((existing) =>
      existing.map((match) => (match.match_number === matchNumber ? normalizeDraft(nextDraft) : match)),
    );

    try {
      const res = await fetch(`/api/dev/matches/${matchNumber}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPayload(ensureFinishedWinner(nextDraft))),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setMessage(`Error: ${body.error ?? res.statusText}`);
        return;
      }

      refreshWithMessage(successMessage);
    } finally {
      setBusyId(null);
    }
  }

  async function updateMatchAndSave(
    matchNumber: number,
    recipe: (match: DevMatchRow) => DevMatchRow,
    successMessage: string,
  ) {
    const current = drafts.find((match) => match.match_number === matchNumber);
    if (!current) return;

    await persistSingleMatch(matchNumber, normalizeDraft(recipe(current)), successMessage);
  }

  async function saveAll() {
    await persistDrafts(
      drafts,
      "כל השינויים נשמרו ל-Supabase, וה-bracket נבנה מחדש מהמצב המעודכן של הטורניר.",
    );
  }

  async function clearAll() {
    if (!confirm("לאפס את כל המשחקים ל-scheduled ו-0:0? הפעולה אינה הפיכה.")) return;

    setBulkSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/dev/matches/clear", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setMessage(`Error: ${body.error ?? res.statusText}`);
        return;
      }

      const body = await res.json();
      refreshWithMessage(
        `אופסו ${body.reset ?? 0} משחקים, וכל שלב הנוקאאוט נוקה ונבנה מחדש מהטבלאות העדכניות.`,
      );
    } finally {
      setBulkSaving(false);
    }
  }

  async function resetAllPredictions() {
    if (
      !confirm("לאפס את כל הניחושים, הג'וקרים וניחושי הטורניר? הפעולה מוחקת את כל טבלאות החיזוי ואינה הפיכה.")
    ) {
      return;
    }

    setBulkSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/dev/predictions/reset", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setMessage(`Error: ${body.error ?? res.statusText}`);
        return;
      }

      const body = await res.json().catch(() => ({}));
      refreshWithMessage(
        `אופסו ${body.predictionsReset ?? 0} ניחושי משחק ו-${body.outrightsReset ?? 0} ניחושי טורניר. כל הג'וקרים שוחררו.`,
      );
    } finally {
      setBulkSaving(false);
    }
  }

  async function randomizeAll() {
    if (!confirm("למלא את כל המשחקים בתוצאות אקראיות ולסנכרן מיד את כל הטורניר?")) return;

    setBulkSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/dev/matches/randomize", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setMessage(`Error: ${body.error ?? res.statusText}`);
        return;
      }

      const body = await res.json().catch(() => ({}));
      refreshWithMessage(
        `נוצרו תוצאות אקראיות עבור ${body.randomized ?? drafts.length} משחקים, וכל ה-bracket סונכרן מחדש.`,
      );
    } finally {
      setBulkSaving(false);
    }
  }

  async function finishAll() {
    const nextDrafts = drafts.map((match) =>
      ensureFinishedWinner({
        ...match,
        status: "finished",
        minute: null,
      }),
    );

    await persistDrafts(
      nextDrafts,
      "כל המשחקים סומנו כ-finished ונשמרו מיד לדייטבייס, עם סנכרון מלא של הטבלאות וה-bracket.",
    );
  }

  async function resetMatch(matchNumber: number) {
    const current = drafts.find((match) => match.match_number === matchNumber);
    if (!current) return;

    const nextDraft = buildScheduledReset(current);

    setBusyId(matchNumber);
    setMessage(null);
    setDrafts((existing) =>
      existing.map((match) => (match.match_number === matchNumber ? nextDraft : match)),
    );

    try {
      const res = await fetch(`/api/dev/matches/${matchNumber}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPayload(nextDraft)),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setMessage(`Error: ${body.error ?? res.statusText}`);
        return;
      }

      refreshWithMessage(`משחק ${matchNumber} אופס ל-scheduled ו-0:0, והטורניר סונכרן מיד.`);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="min-h-screen bg-wc-bg p-4 text-wc-fg1 md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="wc-kicker">Developer Tools</p>
            <h1 className="wc-display mt-2 text-4xl text-wc-fg1">כלי בדיקות פיתוח</h1>
            <p className="mt-2 max-w-2xl text-sm text-wc-fg3">
              עריכת תוצאות, סטטוסים, הארכות ופנדלים לכל משחק. כל שמירה, איפוס או פעולה
              גלובלית מפעילים סנכרון מלא של טבלאות הבתים, 8 המקומות השלישיים וה-bracket.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/dashboard"
                className="inline-flex items-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-wc-fg2 transition hover:bg-white/10 hover:text-wc-fg1"
              >
                חזרה לעמוד הראשי
              </Link>
              <Link
                href="/dashboard/matches"
                className="inline-flex items-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-wc-fg2 transition hover:bg-white/10 hover:text-wc-fg1"
              >
                מעבר ללוח המשחקים
              </Link>
              <Link
                href="/dashboard/tournament"
                className="inline-flex items-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-wc-fg2 transition hover:bg-white/10 hover:text-wc-fg1"
              >
                מעבר לטבלאות ול-bracket
              </Link>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={randomizeAll}
              disabled={pending}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-wc-fg1 transition hover:bg-white/10 disabled:opacity-50"
            >
              Randomize All Matches
            </button>
            <button
              onClick={finishAll}
              disabled={pending}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-wc-fg1 transition hover:bg-white/10 disabled:opacity-50"
            >
              Finish All Matches
            </button>
            <button
              onClick={saveAll}
              disabled={pending}
              className="rounded-2xl border border-[rgba(95,255,123,0.32)] bg-[rgba(95,255,123,0.14)] px-4 py-3 text-sm font-bold text-wc-neon transition hover:bg-[rgba(95,255,123,0.22)] disabled:opacity-50"
            >
              Save All Matches
            </button>
            <button
              onClick={clearAll}
              disabled={pending}
              className="rounded-2xl border border-[rgba(255,92,130,0.6)] bg-[rgba(255,92,130,0.12)] px-4 py-3 text-sm font-bold text-wc-danger transition hover:bg-[rgba(255,92,130,0.25)] disabled:opacity-50"
            >
              Clear All Match Data
            </button>
            <button
              onClick={resetAllPredictions}
              disabled={pending}
              className="rounded-2xl border border-[rgba(255,145,64,0.65)] bg-[rgba(255,145,64,0.14)] px-4 py-3 text-sm font-bold text-[#FFB36B] transition hover:bg-[rgba(255,145,64,0.24)] disabled:opacity-50"
            >
              איפוס כל הניחושים והג׳וקרים
            </button>
          </div>
        </header>

        {message && (
          <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-wc-fg2">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-2xl border border-[rgba(255,92,130,0.35)] bg-[rgba(255,92,130,0.12)] px-4 py-3 text-sm text-wc-danger">
            {error}
          </div>
        )}

        <div className="mb-4 inline-flex rounded-2xl p-1.5 wc-glass">
          {(["all", "scheduled", "live", "finished"] as const).map((value) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${
                filter === value ? "bg-white/10 text-wc-fg1" : "text-wc-fg3 hover:text-wc-fg1"
              }`}
            >
              {value} ({counts[value]})
            </button>
          ))}
        </div>

        <div className="overflow-x-auto rounded-[1.5rem] wc-card">
          <table className="w-full min-w-[1240px] text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs text-wc-fg3">
                <th className="px-3 py-3 text-start">#</th>
                <th className="px-3 py-3 text-start">שלב</th>
                <th className="px-3 py-3 text-center">סטטוס</th>
                <th className="px-3 py-3 text-center">מצב</th>
                <th className="px-3 py-3 text-center">דקה</th>
                <th className="px-3 py-3 text-center">ET</th>
                <th className="px-3 py-3 text-center">פנדלים</th>
                <th className="px-3 py-3 text-center">פעולות</th>
                <th className="px-3 py-3 text-start">בית</th>
                <th className="px-3 py-3 text-center">תוצאה</th>
                <th className="px-3 py-3 text-start">חוץ</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((match) => (
                <DevMatchRowEditor
                  key={match.match_number}
                  match={match}
                  busy={busyId === match.match_number || pending}
                  onChange={updateDraft}
                  onSave={saveMatch}
                  onQuickSave={updateMatchAndSave}
                  onReset={resetMatch}
                />
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-3 py-8 text-center text-wc-fg3">
                    אין משחקים בקטגוריה הזו
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function DevMatchRowEditor({
  match,
  busy,
  onChange,
  onSave,
  onQuickSave,
  onReset,
}: {
  match: DevMatchRow;
  busy: boolean;
  onChange: (matchNumber: number, recipe: (match: DevMatchRow) => DevMatchRow) => void;
  onSave: (matchNumber: number) => Promise<void>;
  onQuickSave: (
    matchNumber: number,
    recipe: (match: DevMatchRow) => DevMatchRow,
    successMessage: string,
  ) => Promise<void>;
  onReset: (matchNumber: number) => Promise<void>;
}) {
  const homeName = getTeamDisplayName(match.homeTeam, match.home_placeholder);
  const awayName = getTeamDisplayName(match.awayTeam, match.away_placeholder);
  const knockout = isKnockoutMatch(match.match_number);
  const regularDraw = isRegularDraw(match);
  const isMinuteLocked = isMinuteLockedPhase(match.match_phase);

  const statusClass =
    match.status === "live"
      ? "bg-[rgba(255,92,130,0.16)] text-wc-danger"
      : match.status === "finished"
        ? "bg-white/6 text-wc-fg2"
        : "bg-[rgba(95,255,123,0.1)] text-wc-neon";

  function update(recipe: (current: DevMatchRow) => DevMatchRow) {
    onChange(match.match_number, recipe);
  }

  function buildStatusUpdate(current: DevMatchRow, status: MatchStatus) {
    if (status === "scheduled") {
      return buildScheduledReset(current);
    }

    if (status === "finished" && knockout && isRegularDraw(current)) {
      const penalties = randomPenaltyPair();
      return {
        ...current,
        status,
        minute: null,
        is_extra_time: true,
        home_penalty_score:
          current.home_penalty_score !== null &&
          current.away_penalty_score !== null &&
          current.home_penalty_score !== current.away_penalty_score
            ? current.home_penalty_score
            : penalties.home,
        away_penalty_score:
          current.home_penalty_score !== null &&
          current.away_penalty_score !== null &&
          current.home_penalty_score !== current.away_penalty_score
            ? current.away_penalty_score
            : penalties.away,
        match_phase: null,
      };
    }

    return {
      ...current,
      status,
      match_phase:
        status === "live"
          ? current.match_phase ?? (current.minute !== null && current.minute > 45 ? "second_half" : "first_half")
          : null,
      minute: status === "finished" || isMinuteLockedPhase(current.match_phase) ? null : current.minute,
    };
  }

  function updateStatus(status: MatchStatus) {
    void onQuickSave(
      match.match_number,
      (current) => buildStatusUpdate(current, status),
      `משחק ${match.match_number} עודכן ל-${status} וסונכרן מיד לדייטבייס.`,
    );
  }

  const phaseOptions = MATCH_PHASE_OPTIONS.filter((option) => !option.knockoutOnly || knockout);
  const canEditPhase = !busy && match.status !== "finished";

  function updatePhase(value: MatchPhase | "") {
    const nextPhase = value || null;
    update((current) => ({
      ...current,
      status: value ? "live" : current.status,
      match_phase: nextPhase,
      minute:
        isMinuteLockedPhase(nextPhase)
          ? null
          : value === "extra_time" && (current.minute === null || current.minute < 90)
            ? 91
            : current.minute,
      is_extra_time: isExtraTimePhase(nextPhase),
    }));
  }

  return (
    <tr className="border-b border-white/5 last:border-0">
      <td className="px-3 py-3 font-mono text-xs text-wc-fg3">{match.match_number}</td>
      <td className="px-3 py-3 text-xs text-wc-fg2">{getStageLabelHe(match.stage)}</td>
      <td className="px-3 py-3 text-center align-top">
        <div className="flex w-[168px] flex-col items-center gap-2">
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusClass}`}
          >
            {match.status}
          </span>
          <div className="grid w-full grid-cols-3 gap-1">
            <button
              onClick={() => updateStatus("live")}
              disabled={busy || match.status === "live"}
              className="rounded-xl bg-[rgba(255,92,130,0.12)] px-2 py-2 text-[10px] font-black text-wc-danger transition hover:bg-[rgba(255,92,130,0.22)] disabled:opacity-40"
            >
              LIVE
            </button>
            <button
              onClick={() => updateStatus("finished")}
              disabled={busy || match.status === "finished"}
              className="rounded-xl bg-white/6 px-2 py-2 text-[10px] font-black text-wc-fg2 transition hover:bg-white/12 disabled:opacity-40"
            >
              FINISH
            </button>
            <button
              onClick={() => onReset(match.match_number)}
              disabled={busy || match.status === "scheduled"}
              className="rounded-xl bg-white/4 px-2 py-2 text-[10px] font-black text-wc-fg3 transition hover:bg-white/10 disabled:opacity-40"
            >
              RESET
            </button>
          </div>
        </div>
      </td>
      <td className="px-3 py-3 text-center align-top">
        <div className="grid w-[220px] grid-cols-3 gap-1 rounded-2xl border border-white/10 bg-black/20 p-1 shadow-inner shadow-black/20">
          {phaseOptions.map((option) => {
            const activeValue = match.match_phase ?? "";
            const isActive = activeValue === option.value;
            const isDisabled = !canEditPhase || (!option.value && match.status === "scheduled");

            return (
              <button
                key={option.value || "none"}
                type="button"
                onClick={() => updatePhase(option.value)}
                disabled={isDisabled}
                aria-pressed={isActive}
                className={`rounded-xl px-2 py-2 text-[11px] font-black transition disabled:cursor-not-allowed disabled:opacity-35 ${
                  isActive
                    ? "bg-wc-neon text-black shadow-[0_0_18px_rgba(95,255,123,0.18)]"
                    : "bg-white/[0.055] text-wc-fg2 hover:bg-white/10 hover:text-wc-fg1"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </td>
      <td className="px-3 py-3 text-center align-top">
        <input
          dir="ltr"
          type="number"
          value={match.minute ?? ""}
          min={0}
          max={130}
          placeholder="-"
          onChange={(event) => {
            const value = event.target.value;
            const nextMinute = value === "" ? null : Number(value);
            const nextPhase = getPhaseFromMinute(match.match_number, nextMinute, match.match_phase);
            update((current) => ({
              ...current,
              minute: nextMinute,
              status: nextMinute !== null ? "live" : current.status,
              match_phase: nextPhase,
              is_extra_time: isExtraTimePhase(nextPhase),
            }));
          }}
          disabled={busy || match.status === "scheduled" || match.status === "finished" || isMinuteLocked}
          className="w-16 rounded-xl border border-white/10 bg-black/30 px-2 py-2 text-center text-xs font-black text-wc-fg1 outline-none transition focus:border-wc-neon disabled:cursor-not-allowed disabled:opacity-35"
          title={isMinuteLocked ? "במחצית ובפנדלים אין דקת משחק פעילה" : undefined}
        />
      </td>
      <td className="px-3 py-3 text-center align-top">
        {knockout ? (
          <label className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/[0.045] px-3 py-2 text-xs font-black text-wc-fg2">
            <input
              type="checkbox"
              checked={Boolean(match.is_extra_time) || match.match_phase === "extra_time"}
              onChange={(event) => {
                const checked = event.target.checked;
                update((current) => {
                  const nextMinute =
                    checked && (current.minute === null || current.minute < 91) ? 91 : current.minute;
                  const nextPhase = checked
                    ? "extra_time"
                    : isExtraTimePhase(current.match_phase)
                      ? getPhaseFromMinute(current.match_number, nextMinute, null)
                      : current.match_phase;

                  return {
                    ...current,
                    status: checked ? "live" : current.status,
                    minute: checked ? nextMinute : current.minute,
                    match_phase: nextPhase,
                    is_extra_time: checked,
                    home_penalty_score: checked ? current.home_penalty_score : null,
                    away_penalty_score: checked ? current.away_penalty_score : null,
                  };
                });
              }}
              disabled={busy || match.status === "finished"}
              className="h-4 w-4 rounded border-white/10 bg-black/30"
            />
            ET
          </label>
        ) : (
          <span className="text-xs text-wc-fg3">-</span>
        )}
      </td>
      <td className="px-3 py-3 align-top">
        {knockout ? (
          <div dir="ltr" className="flex flex-row-reverse items-center justify-center gap-1">
            <input
              type="number"
              value={match.home_penalty_score ?? ""}
              min={0}
              max={30}
              placeholder="-"
              aria-label={`Home penalty score for ${homeName}`}
              onChange={(event) => {
                const value = event.target.value;
                const nextPenaltyScore = value === "" ? null : Number(value);
                update((current) => {
                  const hasAnyPenalty =
                    nextPenaltyScore !== null || current.away_penalty_score !== null;
                  const nextPhase = hasAnyPenalty
                    ? "penalties"
                    : current.match_phase === "penalties"
                      ? null
                      : current.match_phase;

                  return {
                    ...current,
                    status: hasAnyPenalty ? "live" : current.status,
                    match_phase: nextPhase,
                    minute: hasAnyPenalty ? null : current.minute,
                    is_extra_time: isExtraTimePhase(nextPhase),
                    home_penalty_score: nextPenaltyScore,
                  };
                });
              }}
              disabled={busy || !regularDraw || match.status === "finished"}
              className="w-10 rounded-lg border border-white/10 bg-black/30 px-1.5 py-2 text-center text-xs font-bold text-wc-fg1 outline-none focus:border-wc-neon disabled:opacity-40"
            />
            <span className="text-wc-fg3">-</span>
            <input
              type="number"
              value={match.away_penalty_score ?? ""}
              min={0}
              max={30}
              placeholder="-"
              aria-label={`Away penalty score for ${awayName}`}
              onChange={(event) => {
                const value = event.target.value;
                const nextPenaltyScore = value === "" ? null : Number(value);
                update((current) => {
                  const hasAnyPenalty =
                    current.home_penalty_score !== null || nextPenaltyScore !== null;
                  const nextPhase = hasAnyPenalty
                    ? "penalties"
                    : current.match_phase === "penalties"
                      ? null
                      : current.match_phase;

                  return {
                    ...current,
                    status: hasAnyPenalty ? "live" : current.status,
                    match_phase: nextPhase,
                    minute: hasAnyPenalty ? null : current.minute,
                    is_extra_time: isExtraTimePhase(nextPhase),
                    away_penalty_score: nextPenaltyScore,
                  };
                });
              }}
              disabled={busy || !regularDraw || match.status === "finished"}
              className="w-10 rounded-lg border border-white/10 bg-black/30 px-1.5 py-2 text-center text-xs font-bold text-wc-fg1 outline-none focus:border-wc-neon disabled:opacity-40"
            />
          </div>
        ) : (
          <span className="block text-center text-xs text-wc-fg3">-</span>
        )}
      </td>
      <td className="px-3 py-3 text-center align-top">
        <button
          onClick={() => onSave(match.match_number)}
          disabled={busy}
          className="rounded-xl bg-[rgba(95,255,123,0.15)] px-4 py-2 text-[11px] font-black text-wc-neon transition hover:bg-[rgba(95,255,123,0.28)] disabled:opacity-50"
        >
          שמור
        </button>
      </td>
      <td className="px-3 py-3 text-xs text-wc-fg1">{homeName}</td>
      <td className="px-3 py-3">
        <div dir="ltr" className="flex flex-row-reverse items-center justify-center gap-1">
          <input
            type="number"
            value={match.home_score ?? ""}
            min={0}
            max={99}
            aria-label={`Home score for ${homeName}`}
            onChange={(event) => {
              const value = event.target.value;
              update((current) => ({
                ...current,
                home_score: value === "" ? null : Number(value),
              }));
            }}
            disabled={busy}
            className="w-14 rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-center font-bold text-wc-fg1 outline-none focus:border-wc-neon"
          />
          <span className="text-wc-fg3">-</span>
          <input
            type="number"
            value={match.away_score ?? ""}
            min={0}
            max={99}
            aria-label={`Away score for ${awayName}`}
            onChange={(event) => {
              const value = event.target.value;
              update((current) => ({
                ...current,
                away_score: value === "" ? null : Number(value),
              }));
            }}
            disabled={busy}
            className="w-14 rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-center font-bold text-wc-fg1 outline-none focus:border-wc-neon"
          />
        </div>
      </td>
      <td className="px-3 py-3 text-xs text-wc-fg1">{awayName}</td>
    </tr>
  );
}
