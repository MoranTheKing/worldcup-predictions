"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import OutrightChoiceBadge from "@/components/game/OutrightChoiceBadge";
import UserAvatar from "@/components/UserAvatar";
import { useDevLiveRefresh } from "@/lib/dev/live-refresh";
import { getLiveMatchStatusLabel, type MatchPhase } from "@/lib/tournament/matches";
import {
  deleteLeague,
  leaveLeague,
  removeMember,
  type LeagueActionState,
} from "@/app/actions/league";

type LivePredictionTone = "jackpot" | "success" | "direction" | "miss" | "live";

export type LeagueLiveMatchSummary = {
  match_number: number;
  stage: string;
  date_time: string;
  minute: number | null;
  match_phase: MatchPhase | null;
  home_name: string;
  away_name: string;
  home_logo_url: string | null;
  away_logo_url: string | null;
  home_score: number | null;
  away_score: number | null;
};

export type LeagueLivePrediction = {
  match_number: number;
  home_score_guess: number | null;
  away_score_guess: number | null;
  is_joker_applied: boolean;
};

export type LeagueMemberRow = {
  user_id: string;
  joined_at: string | null;
  display_name: string;
  total_score: number;
  avatar_url: string | null;
  winner_prediction: string | null;
  winner_logo_url: string | null;
  top_scorer_prediction: string | null;
  outrights_visible: boolean;
  live_predictions: LeagueLivePrediction[];
};

type LeagueViewProps = {
  league: {
    id: string;
    name: string;
    invite_code: string | null;
    owner_id: string | null;
  };
  currentUserId: string;
  members: LeagueMemberRow[];
  liveMatches: LeagueLiveMatchSummary[];
};

export default function LeagueViewClient({
  league,
  currentUserId,
  members,
  liveMatches,
}: LeagueViewProps) {
  useDevLiveRefresh({ pollIntervalMs: 1500 });

  const isOwner = league.owner_id === currentUserId;
  const hasLiveMatches = liveMatches.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/game/leagues"
          className="text-xs font-semibold text-wc-fg3 transition-colors hover:text-wc-neon"
        >
          ← חזרה לליגות שלי
        </Link>
      </div>

      <section className="rounded-[1.75rem] border border-white/10 bg-[rgba(13,27,46,0.82)] p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-wc-neon">League Lobby</p>
            <h2 className="mt-2 text-3xl font-black text-wc-fg1">{league.name}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {isOwner ? (
                <span className="rounded-full bg-[rgba(95,255,123,0.12)] px-3 py-1 text-xs font-semibold text-wc-neon">
                  מנהל הליגה
                </span>
              ) : (
                <span className="rounded-full bg-white/6 px-3 py-1 text-xs font-semibold text-wc-fg3">
                  חבר ליגה
                </span>
              )}
              <span className="rounded-full bg-white/6 px-3 py-1 text-xs font-semibold text-wc-fg3">
                {members.length} משתתפים
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <InviteCard inviteCode={league.invite_code} />
            {isOwner ? (
              <DeleteLeagueCard leagueId={league.id} />
            ) : (
              <LeaveLeagueCard leagueId={league.id} currentUserId={currentUserId} />
            )}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-[rgba(13,27,46,0.82)]">
        <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-bold text-wc-fg1">טבלת המובילים</p>
            <p className="mt-1 text-xs text-wc-fg3">
              מדורג לפי total score מהגבוה לנמוך. לחיצה על שורה תפתח את תצוגת הניחושים לקריאה בלבד,
              או עריכה מלאה אם זו השורה שלך.
            </p>
          </div>
          <LiveMatchesStrip liveMatches={liveMatches} />
        </div>

        {members.length > 0 ? (
          <div className="overflow-x-auto">
            <table className={`w-full ${hasLiveMatches ? "min-w-[1160px]" : "min-w-[980px]"}`}>
              <thead>
                <tr className="border-b border-white/10 text-right">
                  <th className="px-5 py-3 text-[11px] font-semibold text-wc-fg3">#</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-wc-fg3">שחקן</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-wc-fg3">נקודות</th>
                  {hasLiveMatches ? (
                    <th className="px-4 py-3 text-[11px] font-semibold text-wc-fg3">ניחושי לייב</th>
                  ) : null}
                  <th className="px-4 py-3 text-[11px] font-semibold text-wc-fg3">זוכת טורניר</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-wc-fg3">מלך השערים</th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-wc-fg3">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member, index) => (
                  <LeagueMemberRowView
                    key={member.user_id}
                    member={member}
                    rank={index + 1}
                    isOwner={isOwner}
                    isSelf={member.user_id === currentUserId}
                    leagueId={league.id}
                    liveMatches={liveMatches}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-sm text-wc-fg3">אין עדיין חברים בליגה.</div>
        )}
      </section>
    </div>
  );
}

function LiveMatchesStrip({ liveMatches }: { liveMatches: LeagueLiveMatchSummary[] }) {
  if (liveMatches.length === 0) {
    return (
      <span className="inline-flex w-fit rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-wc-fg3">
        אין משחקי לייב כרגע
      </span>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {liveMatches.map((match) => (
        <div
          key={match.match_number}
          dir="rtl"
          className="inline-flex items-center gap-2 rounded-full border border-[rgba(34,211,238,0.24)] bg-[rgba(34,211,238,0.08)] px-3 py-1.5 text-[11px] font-bold text-cyan-300"
        >
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300" />
          <TeamFlag logoUrl={match.home_logo_url} name={match.home_name} />
          <span dir="ltr" className="min-w-10 text-center font-black">
            {formatScore(match.home_score, match.away_score)}
          </span>
          <TeamFlag logoUrl={match.away_logo_url} name={match.away_name} />
          <span className="text-[10px] text-cyan-200">
            {getLiveMatchStatusLabel(match.minute, match.match_phase)}
          </span>
        </div>
      ))}
    </div>
  );
}

function LivePredictionChip({
  match,
  prediction,
}: {
  match: LeagueLiveMatchSummary;
  prediction: LeagueLivePrediction | null;
}) {
  const tone = resolveLivePredictionTone(match, prediction);
  const predictedHome =
    typeof prediction?.home_score_guess === "number" ? prediction.home_score_guess : null;
  const predictedAway =
    typeof prediction?.away_score_guess === "number" ? prediction.away_score_guess : null;
  const hasPrediction = predictedHome !== null && predictedAway !== null;

  return (
    <div
      dir="rtl"
      className={`inline-flex h-10 min-w-[124px] items-center justify-center gap-2 rounded-xl border px-2.5 text-xs font-black shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${getLivePredictionClass(tone)}`}
      title={`${match.home_name} - ${match.away_name}`}
      aria-label={`${match.home_name} ${hasPrediction ? predictedHome : "?"} - ${
        hasPrediction ? predictedAway : "?"
      } ${match.away_name}`}
    >
      <TeamFlag logoUrl={match.home_logo_url} name={match.home_name} />
      <span dir="ltr" className="min-w-10 text-center tracking-normal">
        {hasPrediction ? `${predictedHome} - ${predictedAway}` : "? - ?"}
      </span>
      <TeamFlag logoUrl={match.away_logo_url} name={match.away_name} />
      {prediction?.is_joker_applied ? (
        <span className="rounded-full border border-current/30 px-1 text-[10px] leading-4">J</span>
      ) : null}
    </div>
  );
}

function TeamFlag({ logoUrl, name }: { logoUrl: string | null; name: string }) {
  return (
    <span
      className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 text-[9px] font-black text-wc-fg2"
      title={name}
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        name.slice(0, 1)
      )}
    </span>
  );
}

function InviteCard({ inviteCode }: { inviteCode: string | null }) {
  const [copied, setCopied] = useState(false);
  const inviteUrl = useMemo(() => {
    if (typeof window === "undefined" || !inviteCode) {
      return "";
    }

    return `${window.location.origin}/game/join/${inviteCode}`;
  }, [inviteCode]);

  async function handleShare() {
    if (!inviteCode || !inviteUrl) return;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "הצטרף לליגת הניחושים שלי",
          text: `קוד ההצטרפות לליגה הוא ${inviteCode}`,
          url: inviteUrl,
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(inviteUrl);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      }
    } catch (error) {
      console.error("[InviteCard] share failed:", error);
    }
  }

  return (
    <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-wc-fg3">Invite Link</p>
      <p className="mt-3 font-mono text-3xl font-black tracking-[0.3em] text-wc-neon">
        {inviteCode ?? "----"}
      </p>
      <p className="mt-2 text-xs text-wc-fg3">שתף לינק שמכיל את הקוד או בקש מחבר להקליד אותו ידנית.</p>
      <button
        type="button"
        onClick={handleShare}
        disabled={!inviteCode}
        className="wc-button-secondary mt-4 w-full px-4 py-3 text-sm disabled:opacity-40"
      >
        {copied ? "הלינק הועתק" : "שתף / העתק לינק"}
      </button>
    </div>
  );
}

function LeaveLeagueCard({
  leagueId,
  currentUserId,
}: {
  leagueId: string;
  currentUserId: string;
}) {
  const [state, action, isPending] = useActionState<LeagueActionState, FormData>(leaveLeague, null);

  return (
    <form action={action} className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
      <input type="hidden" name="league_id" value={leagueId} />
      <input type="hidden" name="target_user_id" value={currentUserId} />
      <p className="text-sm font-bold text-wc-fg1">עזיבת ליגה</p>
      <p className="mt-2 text-xs text-wc-fg3">הפעולה תסיר אותך מהליגה ותחזיר אותך למסך הליגות.</p>
      {state?.error ? <InlineError message={state.error} /> : null}
      <button
        type="submit"
        onClick={(event) => {
          if (!window.confirm("לעזוב את הליגה הזאת?")) {
            event.preventDefault();
          }
        }}
        disabled={isPending}
        className="wc-button-secondary mt-4 w-full px-4 py-3 text-sm text-wc-danger disabled:opacity-50"
      >
        {isPending ? "מעבד..." : "עזוב ליגה"}
      </button>
    </form>
  );
}

function DeleteLeagueCard({ leagueId }: { leagueId: string }) {
  const [state, action, isPending] = useActionState<LeagueActionState, FormData>(deleteLeague, null);

  return (
    <form
      action={action}
      className="rounded-[1.4rem] border border-[rgba(255,92,130,0.2)] bg-[rgba(255,92,130,0.06)] p-4"
    >
      <input type="hidden" name="league_id" value={leagueId} />
      <p className="text-sm font-bold text-wc-fg1">מחיקת ליגה</p>
      <p className="mt-2 text-xs text-wc-fg3">מחיקה תמחק גם את כל החברים מתוך הליגה. הפעולה בלתי הפיכה.</p>
      {state?.error ? <InlineError message={state.error} /> : null}
      <button
        type="submit"
        onClick={(event) => {
          if (!window.confirm("למחוק את הליגה ואת כל החברים שבה?")) {
            event.preventDefault();
          }
        }}
        disabled={isPending}
        className="wc-button-secondary mt-4 w-full px-4 py-3 text-sm text-wc-danger disabled:opacity-50"
      >
        {isPending ? "מוחק..." : "מחק ליגה"}
      </button>
    </form>
  );
}

function LeagueMemberRowView({
  member,
  rank,
  isOwner,
  isSelf,
  leagueId,
  liveMatches,
}: {
  member: LeagueMemberRow;
  rank: number;
  isOwner: boolean;
  isSelf: boolean;
  leagueId: string;
  liveMatches: LeagueLiveMatchSummary[];
}) {
  const router = useRouter();
  const href = `/game/users/${member.user_id}?league=${leagueId}`;

  return (
    <tr
      role="link"
      tabIndex={0}
      className={`cursor-pointer border-b border-white/10 transition hover:bg-white/5 ${
        isSelf ? "bg-[rgba(95,255,123,0.05)]" : ""
      }`}
      onClick={() => router.push(href)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          router.push(href);
        }
      }}
    >
      <td className="px-5 py-3 text-sm font-bold text-wc-fg3">{getRankLabel(rank)}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <UserAvatar
            name={member.display_name}
            src={member.avatar_url}
            size={36}
            className="aspect-square h-9 w-9"
          />
          <div>
            <p className={`text-sm font-semibold ${isSelf ? "text-wc-neon" : "text-wc-fg1"}`}>
              {member.display_name}
              {isSelf ? <span className="ms-1 text-[10px] text-wc-fg3">(אני)</span> : null}
            </p>
            <p className="text-xs text-wc-fg3">
              {member.joined_at ? new Date(member.joined_at).toLocaleDateString("he-IL") : "חבר ליגה"}
            </p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-sm font-black text-wc-neon">{member.total_score}</td>
      {liveMatches.length > 0 ? (
        <td className="px-4 py-3">
          <div className="flex min-w-[260px] flex-wrap items-center gap-2">
            {liveMatches.map((match) => (
              <LivePredictionChip
                key={match.match_number}
                match={match}
                prediction={
                  member.live_predictions.find(
                    (prediction) => prediction.match_number === match.match_number,
                  ) ?? null
                }
              />
            ))}
          </div>
        </td>
      ) : null}
      <td className="px-4 py-3 text-sm text-wc-fg2">
        <OutrightChoiceBadge
          kind="winner"
          value={member.winner_prediction}
          logoUrl={member.winner_logo_url}
          hidden={!member.outrights_visible}
          compact
          locked
        />
      </td>
      <td className="px-4 py-3 text-sm text-wc-fg2">
        <OutrightChoiceBadge
          kind="topScorer"
          value={member.top_scorer_prediction}
          hidden={!member.outrights_visible}
          compact
          locked
        />
      </td>
      <td
        className="px-5 py-3"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        {isOwner && !isSelf ? (
          <RemoveMemberButton leagueId={leagueId} targetUserId={member.user_id} />
        ) : (
          <span className="text-xs text-wc-fg3">—</span>
        )}
      </td>
    </tr>
  );
}

function RemoveMemberButton({
  leagueId,
  targetUserId,
}: {
  leagueId: string;
  targetUserId: string;
}) {
  const router = useRouter();
  const [state, action, isPending] = useActionState<LeagueActionState, FormData>(
    removeMember,
    null,
  );

  useEffect(() => {
    if (state?.success) {
      router.refresh();
    }
  }, [router, state?.success]);

  return (
    <form action={action} className="flex items-center justify-end">
      <input type="hidden" name="league_id" value={leagueId} />
      <input type="hidden" name="target_user_id" value={targetUserId} />
      <button
        type="submit"
        onClick={(event) => {
          event.stopPropagation();
          if (!window.confirm("להסיר את החבר הזה מהליגה?")) {
            event.preventDefault();
          }
        }}
        disabled={isPending}
        className="rounded-full border border-[rgba(255,92,130,0.22)] px-3 py-1 text-xs font-bold text-wc-danger transition hover:bg-[rgba(255,92,130,0.1)] disabled:opacity-50"
        title="הסר חבר"
      >
        {isPending ? "מסיר..." : "הסר"}
      </button>
      {state?.error ? <InlineError message={state.error} /> : null}
    </form>
  );
}

function InlineError({ message }: { message: string }) {
  return <p className="mt-3 text-xs font-semibold text-wc-danger">{message}</p>;
}

function formatScore(homeScore: number | null, awayScore: number | null) {
  if (homeScore === null || awayScore === null) return "- -";
  return `${homeScore} - ${awayScore}`;
}

function resolveLivePredictionTone(
  match: LeagueLiveMatchSummary,
  prediction: LeagueLivePrediction | null,
): LivePredictionTone {
  if (
    !prediction ||
    typeof prediction.home_score_guess !== "number" ||
    typeof prediction.away_score_guess !== "number"
  ) {
    return "miss";
  }

  if (match.home_score === null || match.away_score === null) {
    return "live";
  }

  const exactHit =
    match.home_score === prediction.home_score_guess &&
    match.away_score === prediction.away_score_guess;

  if (exactHit && prediction.is_joker_applied) return "jackpot";
  if (exactHit) return "success";

  if (
    Math.sign(match.home_score - match.away_score) ===
    Math.sign(prediction.home_score_guess - prediction.away_score_guess)
  ) {
    return "direction";
  }

  return "miss";
}

function getLivePredictionClass(tone: LivePredictionTone) {
  if (tone === "jackpot") {
    return "border-[rgba(168,85,247,0.56)] bg-[linear-gradient(135deg,rgba(88,28,135,0.26),rgba(131,24,67,0.2))] text-[#F1B7FF]";
  }

  if (tone === "success") {
    return "border-[rgba(34,197,94,0.42)] bg-[rgba(34,197,94,0.12)] text-[#7BFFB1]";
  }

  if (tone === "direction") {
    return "border-[rgba(255,222,89,0.35)] bg-[rgba(255,222,89,0.08)] text-[#FFE9A1]";
  }

  if (tone === "live") {
    return "border-[rgba(34,211,238,0.28)] bg-[rgba(34,211,238,0.08)] text-cyan-300";
  }

  return "border-[rgba(255,92,130,0.28)] bg-[rgba(255,92,130,0.08)] text-[#FFB5C9]";
}

function getRankLabel(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return String(rank);
}
