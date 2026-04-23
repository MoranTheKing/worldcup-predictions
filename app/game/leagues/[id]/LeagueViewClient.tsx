"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import OutrightChoiceBadge from "@/components/game/OutrightChoiceBadge";
import UserAvatar from "@/components/UserAvatar";
import {
  deleteLeague,
  leaveLeague,
  removeMember,
  type LeagueActionState,
} from "@/app/actions/league";

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
};

export default function LeagueViewClient({
  league,
  currentUserId,
  members,
}: LeagueViewProps) {
  const isOwner = league.owner_id === currentUserId;

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
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-sm font-bold text-wc-fg1">טבלת המובילים</p>
            <p className="mt-1 text-xs text-wc-fg3">
              מדורג לפי total score מהגבוה לנמוך. לחיצה על שורה תפתח את תצוגת הניחושים לקריאה בלבד,
              או עריכה מלאה אם זו השורה שלך.
            </p>
          </div>
        </div>

        {members.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px]">
              <thead>
                <tr className="border-b border-white/10 text-right">
                  <th className="px-5 py-3 text-[11px] font-semibold text-wc-fg3">#</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-wc-fg3">שחקן</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-wc-fg3">נקודות</th>
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
}: {
  member: LeagueMemberRow;
  rank: number;
  isOwner: boolean;
  isSelf: boolean;
  leagueId: string;
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

function getRankLabel(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return String(rank);
}
