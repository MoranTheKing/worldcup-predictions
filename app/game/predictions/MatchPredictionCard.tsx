"use client";

import type { CSSProperties, ReactNode } from "react";
import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  upsertMatchPrediction,
  type PredictionActionState,
} from "@/app/actions/predictions";
import TeamLink from "@/components/TeamLink";
import {
  getLiveMatchStatusLabel,
  getMatchScoreSummary,
  getStageLabelHe,
  type MatchPhase,
  type MatchWithTeams,
} from "@/lib/tournament/matches";
import { calculatePredictionPoints } from "@/lib/game/scoring";

type PredictionTone =
  | "scheduled"
  | "saved"
  | "miss"
  | "direction"
  | "success"
  | "jackpot"
  | "live";

export default function MatchPredictionCard({
  match,
  existingHome,
  existingAway,
  existingIsJoker,
  pointsEarned,
  isJokerSelected,
  showJokerToggle,
  onToggleJoker,
  predictionOwnerLabel = "הניחוש שלך",
  isReadOnly = false,
  hideScheduledPrediction = false,
}: {
  match: MatchWithTeams;
  existingHome: number | null;
  existingAway: number | null;
  existingIsJoker: boolean;
  pointsEarned: number | null;
  isJokerSelected: boolean;
  showJokerToggle: boolean;
  onToggleJoker?: () => void;
  predictionOwnerLabel?: string;
  isReadOnly?: boolean;
  hideScheduledPrediction?: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const isEditable = match.status === "scheduled" && !isReadOnly;
  const isLive = match.status === "live";
  const isFinished = match.status === "finished";
  const boundAction = upsertMatchPrediction.bind(null, match.match_number, match.stage);
  const [state, formAction, isPending] = useActionState<PredictionActionState, FormData>(
    boundAction,
    null,
  );
  const [homeDraft, setHomeDraft] = useState(String(existingHome ?? 0));
  const [awayDraft, setAwayDraft] = useState(String(existingAway ?? 0));

  useEffect(() => {
    if (!state?.success) return;

    startTransition(() => {
      router.refresh();
    });
  }, [router, startTransition, state?.savedAt, state?.success]);

  const homeTeamName = match.homeTeam?.name_he ?? match.homeTeam?.name ?? "נבחרת בית";
  const awayTeamName = match.awayTeam?.name_he ?? match.awayTeam?.name ?? "נבחרת חוץ";
  const actualSummary = getMatchScoreSummary(match);
  const stageLabel = getStageLabelHe(match.stage);
  const matchDate = new Date(match.date_time);
  const optimisticHome = state?.success ? parseDraftValue(homeDraft) : existingHome;
  const optimisticAway = state?.success ? parseDraftValue(awayDraft) : existingAway;
  const optimisticIsJoker = state?.success ? isJokerSelected : existingIsJoker;
  const hasPrediction = optimisticHome !== null && optimisticAway !== null;
  const scoreCanBeEvaluated = (isLive || isFinished) && hasPrediction;
  const availableRewards = buildAvailableRewards(
    match,
    isJokerSelected || optimisticIsJoker,
    homeTeamName,
    awayTeamName,
  );
  const projectedPoints =
    scoreCanBeEvaluated && match.home_score !== null && match.away_score !== null
      ? calculatePredictionPoints(
          {
            home_score_guess: optimisticHome,
            away_score_guess: optimisticAway,
            is_joker_applied: optimisticIsJoker,
          },
          match,
        )
      : null;
  const currentExactHit =
    scoreCanBeEvaluated &&
    match.home_score === optimisticHome &&
    match.away_score === optimisticAway;
  const currentDirectionHit =
    scoreCanBeEvaluated &&
    !currentExactHit &&
    compareOutcome(match.home_score, match.away_score, optimisticHome, optimisticAway);
  const exactHit = isFinished && currentExactHit;
  const directionHit = isFinished && currentDirectionHit;
  const jokerJackpot = exactHit && optimisticIsJoker;
  const tone = resolveTone({
    isEditable,
    isLive,
    isFinished,
    hasPrediction,
    exactHit,
    directionHit,
    jokerJackpot,
  });
  const livePredictionTone = isLive
    ? resolveLivePredictionTone({
        hasPrediction,
        exactHit: currentExactHit,
        directionHit: currentDirectionHit,
        jokerJackpot: currentExactHit && optimisticIsJoker,
      })
    : tone;
  const hiddenPredictionForPrivacy =
    isReadOnly && hideScheduledPrediction && match.status === "scheduled";
  const unsubmittedTone = !hasPrediction && (isLive || isFinished) ? "miss" : tone;
  const predictionPanelTone = hiddenPredictionForPrivacy ? "scheduled" : hasPrediction ? livePredictionTone : unsubmittedTone;
  const pointsPanelTone = hiddenPredictionForPrivacy ? "scheduled" : isLive ? predictionPanelTone : tone;
  const pointsLabel = isLive ? "נקודות כרגע" : "נקודות";
  const displayedPoints =
    hiddenPredictionForPrivacy
      ? "🔒"
      : isLive && projectedPoints !== null
        ? `+${projectedPoints}`
        : typeof pointsEarned === "number"
          ? String(pointsEarned)
          : isFinished && projectedPoints !== null
            ? String(projectedPoints)
            : "0";

  return (
    <div className="relative overflow-hidden rounded-[1.6rem]">
      {tone === "jackpot" ? (
        <>
          <div
            className="pointer-events-none absolute inset-0 animate-pulse"
            style={{
              background:
                "linear-gradient(130deg, rgba(58,12,163,0.34), rgba(123,31,162,0.34), rgba(192,38,211,0.26), rgba(236,72,153,0.24))",
            }}
          />
          <div
            className="pointer-events-none absolute inset-[1px] rounded-[1.45rem]"
            style={{
              boxShadow:
                "0 0 22px 4px rgba(168,85,247,0.48), 0 0 44px rgba(192,38,211,0.34), 0 0 58px rgba(217,70,239,0.3), inset 0 0 24px rgba(255,255,255,0.08)",
            }}
          />
        </>
      ) : null}

      <div
        className="relative overflow-hidden rounded-[1.6rem] border"
        style={getCardChrome(tone, isJokerSelected || optimisticIsJoker, Boolean(state?.success))}
      >
        <div
          className="flex items-center justify-between border-b px-4 py-2"
          style={{ borderColor: "var(--wc-border)" }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold text-wc-fg3">{stageLabel}</span>
            <StatusPill
              isFinished={isFinished}
              isLive={isLive}
              minute={match.minute}
              phase={match.match_phase}
            />
            {tone === "jackpot" ? (
              <span className="rounded-full bg-[rgba(168,85,247,0.18)] px-2 py-0.5 text-[10px] font-black text-[#F1B7FF] shadow-[0_0_18px_rgba(168,85,247,0.38)]">
                👑 JOKER EXACT HIT
              </span>
            ) : tone === "success" ? (
              <span className="rounded-full bg-[rgba(34,197,94,0.16)] px-2 py-0.5 text-[10px] font-bold text-[#7BFFB1]">
                EXACT HIT
              </span>
            ) : tone === "direction" ? (
              <span className="rounded-full bg-[rgba(255,222,89,0.14)] px-2 py-0.5 text-[10px] font-bold text-[#FFE68A]">
                DIRECTION HIT
              </span>
            ) : tone === "miss" ? (
              <span className="rounded-full bg-[rgba(255,92,130,0.12)] px-2 py-0.5 text-[10px] font-bold text-wc-danger">
                0 POINTS
              </span>
            ) : state?.success ? (
              <span className="animate-pulse rounded-full bg-[rgba(95,255,123,0.14)] px-2 py-0.5 text-[10px] font-bold text-wc-neon">
                ✓ נשמר
              </span>
            ) : null}
          </div>

          <span className="text-[11px] font-semibold text-wc-fg3">
            {matchDate.toLocaleDateString("he-IL", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        <div className="px-4 py-4">
          {isEditable ? (
            <form action={formAction} className="space-y-3">
              <input
                type="hidden"
                name="is_joker_applied"
                value={isJokerSelected ? "true" : "false"}
              />

              <div className="flex items-center gap-3">
                <TeamSide align="right" team={match.homeTeam} name={homeTeamName} logoUrl={match.homeTeam?.logo_url ?? null} />

                <div dir="ltr" className="flex flex-shrink-0 flex-row-reverse items-center gap-2">
                  <ScoreInput
                    name="home_score"
                    value={homeDraft}
                    disabled={isPending}
                    onChange={setHomeDraft}
                  />
                  <span className="text-sm font-black text-wc-fg3">-</span>
                  <ScoreInput
                    name="away_score"
                    value={awayDraft}
                    disabled={isPending}
                    onChange={setAwayDraft}
                  />
                </div>

                <TeamSide align="left" team={match.awayTeam} name={awayTeamName} logoUrl={match.awayTeam?.logo_url ?? null} />
              </div>

              <AvailableRewardsStrip rewards={availableRewards} />

              {hasPrediction ? (
                <div
                  className={`rounded-[1rem] border px-3 py-2.5 text-xs font-semibold text-wc-fg1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-sm ${
                    isLive
                      ? getLivePredictionBoxClass(livePredictionTone)
                      : "border-white/10 bg-[rgba(255,255,255,0.05)]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] font-bold text-wc-fg2">
                      {predictionOwnerLabel}
                    </span>
                    <ScoreInline
                      homeScore={optimisticHome}
                      awayScore={optimisticAway}
                      className="inline-flex font-black tracking-[0.08em]"
                    />
                    {optimisticIsJoker ? <span className="ms-auto text-wc-violet">🎏</span> : null}
                  </div>
                </div>
              ) : null}

              {showJokerToggle && onToggleJoker ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={onToggleJoker}
                  className="w-full rounded-xl py-2 text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-40"
                  style={
                    isJokerSelected
                      ? {
                          background: "rgba(111,60,255,0.2)",
                          border: "1.5px solid rgba(111,60,255,0.6)",
                          color: "var(--wc-violet)",
                          boxShadow: "0 0 12px rgba(111,60,255,0.25)",
                        }
                      : {
                          background: "var(--wc-raised)",
                          border: "1.5px solid var(--wc-border)",
                          color: "var(--wc-fg2)",
                        }
                  }
                >
                  {isJokerSelected ? "🎏 הג'וקר פעיל על המשחק הזה" : "🎏 הפעל ג'וקר"}
                </button>
              ) : null}

              <div className="flex items-center justify-between gap-3">
                <div className="min-h-[1.25rem] flex-1">
                  {state?.error ? (
                    <p role="alert" className="text-xs font-semibold text-wc-danger">
                      {state.error}
                    </p>
                  ) : state?.success ? (
                    <p className="text-xs font-semibold text-wc-neon">
                      הניחוש נשמר{isJokerSelected ? " עם ג'וקר" : ""}.
                    </p>
                  ) : null}
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="wc-button-primary flex-shrink-0 px-4 py-2 text-xs font-bold disabled:opacity-50"
                >
                  {isPending ? "שומר..." : "שמור ניחוש"}
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <TeamSide align="right" team={match.homeTeam} name={homeTeamName} logoUrl={match.homeTeam?.logo_url ?? null} />

                <div className="flex flex-shrink-0 items-center gap-2">
                  <ReadOnlyScore summary={actualSummary} />
                </div>

                <TeamSide align="left" team={match.awayTeam} name={awayTeamName} logoUrl={match.awayTeam?.logo_url ?? null} />
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <ResultPanel
                  label={
                    isLive
                      ? "התוצאה כרגע"
                      : match.status === "scheduled"
                        ? "טרם התחיל"
                        : "התוצאה בפועל"
                  }
                  value={<ScoreSummaryInline summary={actualSummary} />}
                  tone={isLive ? predictionPanelTone : tone}
                />
                <ResultPanel
                  label={predictionOwnerLabel}
                  value={
                    hiddenPredictionForPrivacy
                      ? <LockedScoreInline />
                      : hasPrediction
                        ? (
                            <span className="inline-flex items-center gap-1.5">
                              <ScoreInline homeScore={optimisticHome} awayScore={optimisticAway} />
                              {optimisticIsJoker ? <span>👑</span> : null}
                            </span>
                          )
                        : "לא נשלח"
                  }
                  tone={predictionPanelTone}
                />
                <ResultPanel
                  label={pointsLabel}
                  value={displayedPoints}
                  tone={pointsPanelTone}
                  emphasize
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function resolveTone({
  isEditable,
  isLive,
  isFinished,
  hasPrediction,
  exactHit,
  directionHit,
  jokerJackpot,
}: {
  isEditable: boolean;
  isLive: boolean;
  isFinished: boolean;
  hasPrediction: boolean;
  exactHit: boolean;
  directionHit: boolean;
  jokerJackpot: boolean;
}): PredictionTone {
  if (jokerJackpot) return "jackpot";
  if (exactHit) return "success";
  if (directionHit) return "direction";
  if (isFinished) return "miss";
  if (isLive) return "live";
  if (isEditable && hasPrediction) return "saved";
  return "scheduled";
}

function resolveLivePredictionTone({
  hasPrediction,
  exactHit,
  directionHit,
  jokerJackpot,
}: {
  hasPrediction: boolean;
  exactHit: boolean;
  directionHit: boolean;
  jokerJackpot: boolean;
}): PredictionTone {
  if (!hasPrediction) return "miss";
  if (jokerJackpot) return "jackpot";
  if (exactHit) return "success";
  if (directionHit) return "direction";
  return "miss";
}

function TeamSide({
  align,
  team,
  name,
  logoUrl,
}: {
  align: "left" | "right";
  team: MatchWithTeams["homeTeam"];
  name: string;
  logoUrl: string | null;
}) {
  const content = (
    <>
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="h-7 w-7 flex-shrink-0 rounded-full object-cover" />
      ) : null}
      <span className="truncate text-sm font-bold text-wc-fg1">{name}</span>
    </>
  );
  const className = `flex min-w-0 flex-1 items-center gap-2 rounded-xl px-1 py-0.5 transition ${
    align === "right" ? "justify-end" : ""
  } ${team ? "hover:bg-white/5" : ""}`;

  if (team) {
    return (
      <TeamLink team={team} className={className}>
        {content}
      </TeamLink>
    );
  }

  return (
    <div className={className}>{content}</div>
  );
}

type AvailableReward = {
  key: "home" | "draw" | "away";
  label: string;
  directionPoints: number;
  exactBonusPoints: number;
};

function AvailableRewardsStrip({ rewards }: { rewards: AvailableReward[] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {rewards.map((reward) => (
        <div
          key={reward.key}
          className="min-w-0 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2"
        >
          <div className="flex min-w-0 items-center justify-between gap-2">
            <span className="truncate text-[11px] font-bold text-wc-fg2">{reward.label}</span>
            <span dir="ltr" className="text-sm font-black text-wc-neon">
              +{reward.directionPoints}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between gap-2 text-[10px] font-semibold text-wc-fg3">
            <span>בול</span>
            <span dir="ltr">+{reward.exactBonusPoints}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function buildAvailableRewards(
  match: MatchWithTeams,
  isJoker: boolean,
  homeTeamName: string,
  awayTeamName: string,
): AvailableReward[] {
  return [
    {
      key: "home",
      label: homeTeamName,
      directionPoints: calculateRewardPoints(match, 1, 0, 2, 0, isJoker),
      exactBonusPoints:
        calculateRewardPoints(match, 1, 0, 1, 0, isJoker) -
        calculateRewardPoints(match, 1, 0, 2, 0, isJoker),
    },
    {
      key: "draw",
      label: "תיקו",
      directionPoints: calculateRewardPoints(match, 1, 1, 2, 2, isJoker),
      exactBonusPoints:
        calculateRewardPoints(match, 1, 1, 1, 1, isJoker) -
        calculateRewardPoints(match, 1, 1, 2, 2, isJoker),
    },
    {
      key: "away",
      label: awayTeamName,
      directionPoints: calculateRewardPoints(match, 0, 1, 0, 2, isJoker),
      exactBonusPoints:
        calculateRewardPoints(match, 0, 1, 0, 1, isJoker) -
        calculateRewardPoints(match, 0, 1, 0, 2, isJoker),
    },
  ];
}

function calculateRewardPoints(
  match: MatchWithTeams,
  predictedHome: number,
  predictedAway: number,
  actualHome: number,
  actualAway: number,
  isJoker: boolean,
) {
  return calculatePredictionPoints(
    {
      home_score_guess: predictedHome,
      away_score_guess: predictedAway,
      is_joker_applied: isJoker,
    },
    {
      ...match,
      home_score: actualHome,
      away_score: actualAway,
    },
  );
}

function ResultPanel({
  label,
  value,
  tone,
  emphasize = false,
}: {
  label: string;
  value: ReactNode;
  tone: PredictionTone;
  emphasize?: boolean;
}) {
  return (
    <div className={`rounded-2xl border px-4 py-3 ${getResultPanelClass(tone)}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-wc-fg3">{label}</p>
      <div className={`mt-2 font-black ${emphasize ? "text-3xl" : "text-lg"}`}>{value}</div>
    </div>
  );
}

function ReadOnlyScore({
  summary,
}: {
  summary: ReturnType<typeof getMatchScoreSummary> | null;
}) {
  return (
    <div className="min-w-[118px] rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center text-lg font-black text-wc-fg1">
      <ScoreSummaryInline summary={summary} />
    </div>
  );
}

function ScoreInline({
  homeScore,
  awayScore,
  className = "",
}: {
  homeScore: number | null;
  awayScore: number | null;
  className?: string;
}) {
  return (
    <span className={`inline-flex flex-row items-center justify-center gap-1 ${className}`}>
      <span className="font-bold">{homeScore ?? "?"}</span>
      <span>-</span>
      <span className="font-bold">{awayScore ?? "?"}</span>
    </span>
  );
}

function ScoreSummaryInline({
  summary,
}: {
  summary: ReturnType<typeof getMatchScoreSummary> | null;
}) {
  if (!summary) {
    return <span>—</span>;
  }

  return (
    <span className="inline-flex items-center gap-2">
      <ScoreInline homeScore={summary.homeScore} awayScore={summary.awayScore} className="" />
      {summary.hasPenalties && summary.homePenaltyScore !== null && summary.awayPenaltyScore !== null ? (
        <span className="inline-flex items-center gap-1 text-sm text-wc-fg3">
          <span>(</span>
          <ScoreInline
            homeScore={summary.homePenaltyScore}
            awayScore={summary.awayPenaltyScore}
            className="text-sm font-semibold"
          />
          <span>PEN)</span>
        </span>
      ) : summary.statusSuffix ? (
        <span className="text-sm text-wc-fg3">{summary.statusSuffix}</span>
      ) : null}
    </span>
  );
}

function LockedScoreInline() {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span>🔒</span>
      <ScoreInline homeScore={null} awayScore={null} className="" />
    </span>
  );
}

function ScoreInput({
  name,
  value,
  disabled,
  onChange,
}: {
  name: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <input
      dir="ltr"
      type="number"
      name={name}
      min="0"
      max="99"
      required
      disabled={disabled}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder="0"
      className="wc-input w-16 text-center text-lg font-black"
      style={{ padding: "0.5rem 0.25rem" }}
    />
  );
}

function StatusPill({
  isFinished,
  isLive,
  minute,
  phase,
}: {
  isFinished: boolean;
  isLive: boolean;
  minute: number | null;
  phase: MatchPhase | null;
}) {
  if (isLive) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(34,211,238,0.12)] px-2 py-0.5 text-[10px] font-bold text-cyan-300">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300" />
        {getLiveMatchStatusLabel(minute, phase)}
      </span>
    );
  }

  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${getStatusPillClass(isFinished)}`}>
      {isFinished ? "FT" : "UPCOMING"}
    </span>
  );
}

function compareOutcome(
  actualHome: number | null,
  actualAway: number | null,
  predictedHome: number | null,
  predictedAway: number | null,
) {
  if (
    actualHome === null ||
    actualAway === null ||
    predictedHome === null ||
    predictedAway === null
  ) {
    return false;
  }

  return Math.sign(actualHome - actualAway) === Math.sign(predictedHome - predictedAway);
}

function parseDraftValue(value: string) {
  const trimmed = value.trim();
  const parsed = trimmed === "" ? 0 : Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function getStatusPillClass(isFinished: boolean) {
  if (isFinished) {
    return "bg-white/8 text-wc-fg2";
  }

  return "bg-white/6 text-wc-fg3";
}

function getCardChrome(
  tone: PredictionTone,
  hasJokerSelected: boolean,
  wasJustSaved: boolean,
): CSSProperties {
  if (tone === "jackpot") {
    return {
      borderColor: "rgba(168,85,247,0.9)",
      background: "linear-gradient(135deg, rgba(20,9,44,0.98), rgba(53,12,65,0.96), rgba(74,12,70,0.95))",
      boxShadow:
        "0 0 0 1px rgba(168,85,247,0.45), 0 0 20px 4px rgba(168,85,247,0.36), 0 0 34px rgba(217,70,239,0.3), 0 0 56px rgba(192,38,211,0.28)",
    };
  }

  if (tone === "success") {
    return {
      borderColor: "rgba(34,197,94,0.95)",
      background: "linear-gradient(135deg, rgba(6,30,15,0.96), rgba(8,25,18,0.92))",
      boxShadow: "0 0 24px rgba(34,197,94,0.18)",
    };
  }

  if (tone === "direction") {
    return {
      borderColor: "rgba(255,222,89,0.58)",
      background: "linear-gradient(135deg, rgba(38,28,8,0.94), rgba(26,20,10,0.9))",
      boxShadow: "0 0 18px rgba(255,222,89,0.12)",
    };
  }

  if (tone === "miss") {
    return {
      borderColor: "rgba(255,92,130,0.64)",
      background: "linear-gradient(135deg, rgba(33,11,18,0.94), rgba(26,12,24,0.92))",
      boxShadow: "0 0 18px rgba(255,92,130,0.12)",
    };
  }

  if (tone === "live") {
    return {
      borderColor: "rgba(34,211,238,0.5)",
      background: "linear-gradient(135deg, rgba(7,22,32,0.96), rgba(6,18,29,0.94))",
      boxShadow: "0 0 18px rgba(34,211,238,0.14)",
    };
  }

  if (tone === "saved") {
    return {
      borderColor: "rgba(109,141,188,0.42)",
      background: "linear-gradient(135deg, rgba(10,18,32,0.96), rgba(11,16,26,0.94))",
      boxShadow: "0 0 18px rgba(79,112,164,0.12)",
    };
  }

  return {
    borderColor: hasJokerSelected
      ? "rgba(111,60,255,0.5)"
      : wasJustSaved
        ? "rgba(95,255,123,0.4)"
        : "var(--wc-border)",
    background: "var(--wc-surface)",
    boxShadow: hasJokerSelected ? "0 0 18px rgba(111,60,255,0.2)" : undefined,
  };
}

function getResultPanelClass(tone: PredictionTone) {
  if (tone === "jackpot") {
    return "border-[rgba(168,85,247,0.46)] bg-[linear-gradient(135deg,rgba(88,28,135,0.24),rgba(131,24,67,0.18))] text-[#F1B7FF]";
  }

  if (tone === "success") {
    return "border-[rgba(34,197,94,0.42)] bg-[rgba(34,197,94,0.12)] text-[#7BFFB1]";
  }

  if (tone === "direction") {
    return "border-[rgba(255,222,89,0.35)] bg-[rgba(255,222,89,0.08)] text-[#FFE9A1]";
  }

  if (tone === "miss") {
    return "border-[rgba(255,92,130,0.28)] bg-[rgba(255,92,130,0.08)] text-[#FFB5C9]";
  }

  if (tone === "live") {
    return "border-[rgba(34,211,238,0.28)] bg-[rgba(34,211,238,0.08)] text-cyan-300";
  }

  if (tone === "saved") {
    return "border-[rgba(109,141,188,0.24)] bg-[rgba(109,141,188,0.08)] text-wc-fg1";
  }

  return "border-white/10 bg-white/5 text-wc-fg1";
}

function getLivePredictionBoxClass(tone: PredictionTone) {
  if (tone === "success") {
    return "border-[rgba(34,197,94,0.38)] bg-[rgba(34,197,94,0.08)]";
  }

  if (tone === "direction") {
    return "border-[rgba(255,222,89,0.34)] bg-[rgba(255,222,89,0.07)]";
  }

  return "border-[rgba(255,92,130,0.26)] bg-[rgba(255,92,130,0.06)]";
}
