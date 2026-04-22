"use client";

import Link from "next/link";
import { useActionState } from "react";
import { joinLeagueByCodeAction, type LeagueActionState } from "@/app/actions/league";

export default function JoinLeagueLandingClient({
  inviteCode,
  leagueId,
  leagueName,
  alreadyMember,
}: {
  inviteCode: string;
  leagueId: string;
  leagueName: string;
  alreadyMember: boolean;
}) {
  const boundAction = joinLeagueByCodeAction.bind(null, inviteCode);
  const [state, action, isPending] = useActionState<LeagueActionState, FormData>(
    boundAction,
    null,
  );

  return (
    <div className="mx-auto max-w-2xl p-4 md:p-8">
      <div className="rounded-[1.9rem] border border-white/10 bg-[rgba(13,27,46,0.82)] p-6 shadow-[0_0_28px_rgba(95,255,123,0.08)]">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-wc-neon">
          League Invite
        </p>
        <h1 className="mt-3 text-3xl font-black text-wc-fg1">{leagueName}</h1>
        <p className="mt-2 text-sm text-wc-fg2">
          הוזמנת להצטרף לליגת הניחושים הזו עם הקוד{" "}
          <span className="font-mono tracking-[0.28em] text-wc-neon">{inviteCode}</span>.
        </p>

        {alreadyMember ? (
          <div className="mt-6 rounded-2xl border border-[rgba(95,255,123,0.2)] bg-[rgba(95,255,123,0.08)] p-4">
            <p className="text-sm font-semibold text-wc-neon">אתה כבר חבר בליגה הזו.</p>
            <Link
              href={`/game/leagues/${leagueId}`}
              className="wc-button-primary mt-4 inline-flex px-5 py-3 text-sm font-bold"
            >
              פתח את הליגה
            </Link>
          </div>
        ) : (
          <form action={action} className="mt-6">
            {state?.error ? (
              <p
                role="alert"
                className="mb-4 rounded-xl bg-[rgba(255,92,130,0.12)] px-3 py-2 text-sm font-semibold text-wc-danger"
              >
                {state.error}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={isPending}
                className="wc-button-primary px-5 py-3 text-sm font-bold disabled:opacity-50"
              >
                {isPending ? "מצטרף..." : "אשר הצטרפות"}
              </button>
              <Link
                href="/game/leagues"
                className="wc-button-secondary px-5 py-3 text-sm font-bold"
              >
                חזור לליגות
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
