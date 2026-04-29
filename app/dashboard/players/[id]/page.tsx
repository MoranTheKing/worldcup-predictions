import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import TeamLink from "@/components/TeamLink";
import {
  getBzzoiroPlayerProfile,
  type BzzoiroPlayerDetail,
  type BzzoiroPlayerStatsRow,
} from "@/lib/bzzoiro/players";
import { createClient } from "@/lib/supabase/server";
import type { TournamentTeamRecord } from "@/lib/tournament/matches";

export const dynamic = "force-dynamic";

type PlayerRecord = {
  id: number | string;
  name: string;
  team_id: string | null;
  position: string | null;
  photo_url?: string | null;
  shirt_number?: number | null;
  goals?: number | null;
  assists?: number | null;
  appearances?: number | null;
  minutes_played?: number | null;
  yellow_cards?: number | null;
  red_cards?: number | null;
  top_scorer_odds?: number | string | null;
  top_scorer_odds_updated_at?: string | null;
  bzzoiro_player_id?: string | null;
  bzzoiro_synced_at?: string | null;
};

type AggregatedStats = {
  matches: number;
  minutes: number;
  avgRating: number | null;
  goals: number;
  assists: number;
  xg: number;
  xa: number;
  shots: number;
  shotsOnTarget: number;
  passes: number;
  accuratePasses: number;
  keyPasses: number;
  crosses: number;
  accurateCrosses: number;
  longBalls: number;
  accurateLongBalls: number;
  touches: number;
  dribblesWon: number;
  dribblesAttempted: number;
  duelsWon: number;
  duelsLost: number;
  aerialWon: number;
  aerialLost: number;
  tackles: number;
  tacklesWon: number;
  clearances: number;
  interceptions: number;
  recoveries: number;
  dispossessed: number;
  possessionLost: number;
  fouled: number;
  fouls: number;
  yellowCards: number;
  redCards: number;
  saves: number;
  goalsConceded: number;
  penaltyWon: number;
  penaltyMiss: number;
  penaltyConceded: number;
  penaltySave: number;
  penaltyFaced: number;
};

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const playerId = parsePlayerId(id);
  const supabase = await createClient();

  const { data: playerData, error: playerError } = await supabase
    .from("players")
    .select("id, name, team_id, position, photo_url, shirt_number, goals, assists, appearances, minutes_played, yellow_cards, red_cards, top_scorer_odds, top_scorer_odds_updated_at, bzzoiro_player_id, bzzoiro_synced_at")
    .eq("id", playerId)
    .maybeSingle();

  if (playerError) {
    console.error("[PlayerPage] player error:", playerError);
  }

  if (!playerData) notFound();

  const player = playerData as PlayerRecord;
  const [{ data: teamData }, apiProfile] = await Promise.all([
    player.team_id
      ? supabase
          .from("teams")
          .select("id, name, name_he, logo_url, group_letter, fair_play_score, fifa_ranking, is_eliminated, outright_odds")
          .eq("id", player.team_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    getBzzoiroPlayerProfile(player.bzzoiro_player_id),
  ]);

  const team = teamData as TournamentTeamRecord | null;
  const detail = apiProfile.detail;
  const stats = apiProfile.stats;
  const teamName = team ? team.name_he ?? team.name : "ללא נבחרת";
  const nationalStats = filterNationalStats(stats, detail, team);
  const allStats = aggregateStats(stats);
  const selectedStats = nationalStats.length > 0 ? aggregateStats(nationalStats) : null;
  const recentStats = stats
    .slice()
    .sort((left, right) => getEventTime(right) - getEventTime(left))
    .slice(0, 5);
  const detailPositions = getDetailedPositions(detail, player);
  const attributes = getAttributeEntries(detail?.attributes).slice(0, 8);
  const hasBsdData = Boolean(detail || stats.length > 0);

  return (
    <div className="wc-shell px-4 py-4 md:px-6 md:py-6" dir="rtl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/dashboard/stats"
          className="inline-flex items-center gap-2 text-xs font-semibold text-wc-fg3 transition hover:text-wc-fg1"
        >
          חזרה לטבלאות
        </Link>
        <div className="flex flex-wrap gap-2">
          {team ? (
            <>
              <TeamLink
                team={team}
                className="rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs font-bold text-wc-fg2 transition hover:border-wc-neon/40 hover:text-wc-neon"
              >
                עמוד הנבחרת
              </TeamLink>
              <Link
                href={`/dashboard/teams/${encodeURIComponent(team.id)}/squad`}
                className="rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs font-bold text-wc-fg2 transition hover:border-wc-neon/40 hover:text-wc-neon"
              >
                סגל מלא
              </Link>
            </>
          ) : null}
        </div>
      </div>

      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(95,255,123,0.12),rgba(111,60,255,0.22)_46%,rgba(8,14,29,0.96))] shadow-[0_28px_80px_rgba(0,0,0,0.38)]">
        <div className="grid gap-6 p-5 md:p-7 lg:grid-cols-[1fr_18rem] lg:items-center">
          <div className="flex min-w-0 items-center gap-4 md:gap-5">
            <PlayerPhoto player={player} detail={detail} size="hero" />
            <div className="min-w-0">
              <p className="wc-kicker">Player profile</p>
              <h1 className="mt-2 truncate font-sans text-4xl font-black leading-tight tracking-normal text-wc-fg1 md:text-6xl">
                {detail?.name ?? player.name}
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-black">
                {detailPositions.map((position) => (
                  <span key={position} className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-wc-fg2">
                    {position}
                  </span>
                ))}
                <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-wc-fg2">
                  חולצה {detail?.jersey_number ?? player.shirt_number ?? "-"}
                </span>
                {team ? (
                  <TeamLink
                    team={team}
                    className="inline-flex items-center gap-2 rounded-full border border-wc-neon/25 bg-[rgba(95,255,123,0.1)] px-3 py-1 text-wc-neon transition hover:border-wc-neon/50"
                  >
                    <SmallTeamLogo team={team} />
                    <span>{teamName}</span>
                  </TeamLink>
                ) : (
                  <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-wc-fg3">
                    {teamName}
                  </span>
                )}
              </div>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-wc-fg2">
                הנתונים מחולקים לשני מקורות: סטטיסטיקת מונדיאל 2026 מתוך מסד הנתונים של המשחק, ונתוני BSD כלליים ממשחקים זמינים ב־API. כך לא מתערבבים אפסים של הטורניר שעדיין לא התחיל עם עונה/משחקים אחרים.
              </p>
            </div>
          </div>

          <div className="rounded-[1.35rem] border border-white/10 bg-black/18 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-wc-fg3">
              יחס מלך שערים
            </p>
            <p className="mt-2 font-sans text-4xl font-black tracking-normal text-wc-neon" dir="ltr">
              {formatOdds(player.top_scorer_odds)}
            </p>
            <p className="mt-1 text-xs leading-5 text-wc-fg3">
              {player.top_scorer_odds_updated_at
                ? `עודכן ${formatDate(player.top_scorer_odds_updated_at)}`
                : "יתעדכן מסנכרון API או Dev Tools"}
            </p>
          </div>
        </div>
      </section>

      <section className="mt-5">
        <SectionHeader title="מונדיאל 2026" eyebrow="נתוני הטורניר באתר" />
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <MetricCard label="שערים" value={String(player.goals ?? 0)} />
          <MetricCard label="בישולים" value={String(player.assists ?? 0)} />
          <MetricCard label="הופעות" value={String(player.appearances ?? 0)} />
          <MetricCard label="דקות" value={String(player.minutes_played ?? 0)} />
          <MetricCard label="צהובים" value={String(player.yellow_cards ?? 0)} tone="amber" />
          <MetricCard label="אדומים" value={String(player.red_cards ?? 0)} tone="red" />
        </div>
        <p className="mt-3 text-xs leading-6 text-wc-fg3">
          אלה נתוני המונדיאל המקומיים בלבד. עד שהטורניר מתחיל הם יכולים להיות אפס, וזה תקין.
        </p>
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-4 md:p-5">
          <SectionHeader title="פרטי שחקן מ-BSD" eyebrow={hasBsdData ? "identity & availability" : "ממתין ל־API"} />
          {detail ? (
            <div className="mt-4 grid gap-3">
              <InfoRow label="שם קצר" value={detail.short_name ?? "-"} dir="ltr" />
              <InfoRow label="אזרחות" value={detail.nationality ?? "-"} />
              <InfoRow label="גיל" value={formatAge(detail.date_of_birth)} dir="ltr" />
              <InfoRow label="גובה / משקל" value={formatBody(detail)} />
              <InfoRow label="רגל חזקה" value={translateFoot(detail.preferred_foot)} />
              <InfoRow label="שווי שוק" value={formatMarketValue(detail.market_value)} dir="ltr" />
              <InfoRow label="קבוצה נוכחית" value={detail.current_team?.name ?? "-"} />
              <InfoRow label="נבחרת ב-BSD" value={detail.national_team?.name ?? "-"} />
              <InfoRow label="זמינות" value={formatAvailability(detail)} />
              <InfoRow label="חוזה עד" value={formatDate(detail.contract_until)} dir="ltr" />
            </div>
          ) : (
            <EmptyPanel
              title="אין עדיין פרופיל BSD מלא"
              description="העמוד עדיין מציג את נתוני המונדיאל המקומיים. ברגע שיש מזהה BSD פעיל ו־API זמין, הפרטים המורחבים יופיעו כאן."
            />
          )}
        </section>

        <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-4 md:p-5">
          <SectionHeader title="נתוני BSD כלליים" eyebrow="כל המשחקים שה־API החזיר לשחקן" />
          {stats.length > 0 ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="משחקים" value={String(allStats.matches)} />
              <MetricCard label="דקות" value={String(allStats.minutes)} />
              <MetricCard label="דירוג ממוצע" value={formatDecimal(allStats.avgRating)} />
              <MetricCard label="שערים + בישולים" value={`${allStats.goals} + ${allStats.assists}`} />
              <MetricCard label="xG / xA" value={`${formatDecimal(allStats.xg)} / ${formatDecimal(allStats.xa)}`} />
              <MetricCard label="בעיטות למסגרת" value={`${allStats.shotsOnTarget}/${allStats.shots}`} />
              <MetricCard label="דיוק מסירה" value={formatPercentRatio(allStats.accuratePasses, allStats.passes)} />
              <MetricCard label="מסירות מפתח" value={String(allStats.keyPasses)} />
            </div>
          ) : (
            <EmptyPanel
              title="אין עדיין שורות סטטיסטיקה מה־API"
              description="BSD דורש סינון לפי שחקן/אירוע/קבוצה. אם השחקן קיים אבל אין לו שורות זמינות, האזור נשאר ריק בלי להציג נתונים מומצאים."
            />
          )}
        </section>
      </div>

      {selectedStats ? (
        <section className="mt-5 rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-4 md:p-5">
          <SectionHeader title="שורות נבחרת ב-BSD" eyebrow="לא מונדיאל אלא משחקים שבהם BSD סימן אותו בנבחרת" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <MetricCard label="משחקים" value={String(selectedStats.matches)} />
            <MetricCard label="דקות" value={String(selectedStats.minutes)} />
            <MetricCard label="שערים" value={String(selectedStats.goals)} />
            <MetricCard label="בישולים" value={String(selectedStats.assists)} />
            <MetricCard label="xG" value={formatDecimal(selectedStats.xg)} />
            <MetricCard label="תיקולים מוצלחים" value={`${selectedStats.tacklesWon}/${selectedStats.tackles}`} />
          </div>
        </section>
      ) : null}

      <section className="mt-5 rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-4 md:p-5">
        <SectionHeader title="פירוט מתקדם" eyebrow="התקפה, מסירה, הגנה ומשמעת" />
        {stats.length > 0 ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="נגיעות" value={String(allStats.touches)} />
            <MetricCard label="דריבלים מוצלחים" value={`${allStats.dribblesWon}/${allStats.dribblesAttempted}`} />
            <MetricCard label="דו-קרבים" value={`${allStats.duelsWon}/${allStats.duelsWon + allStats.duelsLost}`} />
            <MetricCard label="אוויריים" value={`${allStats.aerialWon}/${allStats.aerialWon + allStats.aerialLost}`} />
            <MetricCard label="חילוצים" value={String(allStats.recoveries)} />
            <MetricCard label="הרחקות" value={String(allStats.clearances)} />
            <MetricCard label="חטיפות" value={String(allStats.interceptions)} />
            <MetricCard label="איבודי כדור" value={String(allStats.possessionLost)} />
            <MetricCard label="סחט עבירות" value={String(allStats.fouled)} />
            <MetricCard label="עבירות" value={String(allStats.fouls)} />
            <MetricCard label="צהובים / אדומים" value={`${allStats.yellowCards} / ${allStats.redCards}`} />
            <MetricCard label="הצלות / ספיגות" value={`${allStats.saves} / ${allStats.goalsConceded}`} />
          </div>
        ) : (
          <EmptyPanel
            title="אין עדיין נתונים מתקדמים"
            description="כש־BSD יחזיר player-stats, יופיעו כאן מדדי מסירה, הגנה, דו-קרבים, שוער ומשמעת."
          />
        )}
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-4 md:p-5">
          <SectionHeader title="מאפיינים וחוזקות" eyebrow="BSD profile" />
          <div className="mt-4 grid gap-4">
            <ChipGroup title="מאפיינים" values={attributes.map((item) => item.value ? `${item.label}: ${item.value}` : item.label)} />
            <ChipGroup title="חוזקות" values={detail?.strengths ?? []} />
            <ChipGroup title="חולשות" values={detail?.weaknesses ?? []} tone="muted" />
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-4 md:p-5">
          <SectionHeader title="משחקים אחרונים ב-BSD" eyebrow="5 שורות אחרונות" />
          {recentStats.length > 0 ? (
            <div className="mt-4 grid gap-3">
              {recentStats.map((row, index) => (
                <RecentStatRow key={`${row.event?.id ?? "event"}-${index}`} row={row} />
              ))}
            </div>
          ) : (
            <EmptyPanel
              title="אין משחקים אחרונים להצגה"
              description="ברגע ש־player-stats יחזיר שורות לשחקן, חמש האחרונות יוצגו כאן עם יריבות, דקות ותרומה התקפית."
            />
          )}
        </section>
      </div>
    </div>
  );
}

function PlayerPhoto({
  player,
  detail,
  size,
}: {
  player: PlayerRecord;
  detail: BzzoiroPlayerDetail | null;
  size: "hero";
}) {
  const imageSize = size === "hero" ? 144 : 80;
  const photoUrl = player.photo_url;
  const playerName = detail?.name ?? player.name;

  return (
    <div className="grid h-36 w-36 shrink-0 place-items-center overflow-hidden rounded-[2rem] border border-white/12 bg-[linear-gradient(135deg,rgba(95,255,123,0.16),rgba(111,60,255,0.28))] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
      {photoUrl ? (
        <Image
          src={photoUrl}
          alt={playerName}
          width={imageSize}
          height={imageSize}
          style={{ width: imageSize, height: imageSize }}
          className="h-full w-full object-cover"
          unoptimized
        />
      ) : (
        <span className="font-sans text-5xl font-black text-wc-fg1">{getInitials(playerName)}</span>
      )}
    </div>
  );
}

function SmallTeamLogo({ team }: { team: TournamentTeamRecord }) {
  const label = team.name_he ?? team.name;

  return (
    <span className="grid h-4 w-6 shrink-0 place-items-center overflow-hidden rounded bg-white/10">
      {team.logo_url ? (
        <Image
          src={team.logo_url}
          alt={label}
          width={24}
          height={16}
          style={{ width: 24, height: 16 }}
          className="h-full w-full object-cover"
          unoptimized
        />
      ) : (
        <span className="text-[9px] font-black">{label.slice(0, 1)}</span>
      )}
    </span>
  );
}

function SectionHeader({ title, eyebrow }: { title: string; eyebrow?: string }) {
  return (
    <div>
      {eyebrow ? <p className="wc-kicker text-[0.68rem]">{eyebrow}</p> : null}
      <h2 className="mt-1 font-sans text-xl font-black tracking-normal text-wc-fg1">{title}</h2>
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "amber" | "red";
}) {
  const toneClass =
    tone === "amber" ? "text-wc-amber" : tone === "red" ? "text-wc-danger" : "text-wc-fg1";

  return (
    <div className="rounded-[1.35rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.025))] p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-wc-fg3">{label}</p>
      <p className={`mt-2 font-sans text-3xl font-black tracking-normal ${toneClass}`} dir="ltr">{value}</p>
    </div>
  );
}

function InfoRow({
  label,
  value,
  valueNode,
  dir,
}: {
  label: string;
  value?: string;
  valueNode?: ReactNode;
  dir?: "ltr" | "rtl";
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/14 px-4 py-3">
      <span className="text-sm font-bold text-wc-fg2">{label}</span>
      <span className="truncate text-sm font-black text-wc-fg1" dir={dir}>{valueNode ?? value ?? "-"}</span>
    </div>
  );
}

function ChipGroup({
  title,
  values,
  tone = "default",
}: {
  title: string;
  values: string[];
  tone?: "default" | "muted";
}) {
  const filtered = values.filter(Boolean).slice(0, 10);

  return (
    <div>
      <p className="text-xs font-black text-wc-fg2">{title}</p>
      {filtered.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {filtered.map((value) => (
            <span
              key={value}
              className={`rounded-full border px-3 py-1 text-xs font-bold ${
                tone === "muted"
                  ? "border-white/10 bg-white/6 text-wc-fg3"
                  : "border-wc-neon/20 bg-[rgba(95,255,123,0.08)] text-wc-fg2"
              }`}
            >
              {value}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-xs text-wc-fg3">אין נתון זמין.</p>
      )}
    </div>
  );
}

function RecentStatRow({ row }: { row: BzzoiroPlayerStatsRow }) {
  return (
    <div className="rounded-[1.25rem] border border-white/10 bg-black/14 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black text-wc-fg1">
            {row.event?.home_team ?? "-"} - {row.event?.away_team ?? "-"}
          </p>
          <p className="mt-1 text-xs text-wc-fg3">{formatDate(row.event?.event_date)}</p>
        </div>
        <span className="rounded-full bg-white/8 px-3 py-1 text-xs font-black text-wc-fg2" dir="ltr">
          {formatScore(row)}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2 text-center">
        <MiniMetric label="דקות" value={row.minutes_played ?? 0} />
        <MiniMetric label="דירוג" value={formatDecimal(row.rating)} />
        <MiniMetric label="שערים" value={row.goals ?? 0} />
        <MiniMetric label="בישולים" value={row.goal_assist ?? 0} />
      </div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg bg-white/[0.045] px-2 py-1">
      <p className="text-[10px] font-bold text-wc-fg3">{label}</p>
      <p className="mt-0.5 text-sm font-black text-wc-fg1" dir="ltr">{value}</p>
    </div>
  );
}

function EmptyPanel({ title, description }: { title: string; description: string }) {
  return (
    <div className="mt-4 rounded-[1.35rem] border border-dashed border-white/12 bg-black/12 p-5">
      <h3 className="font-sans text-lg font-black tracking-normal text-wc-fg1">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-wc-fg3">{description}</p>
    </div>
  );
}

function aggregateStats(rows: BzzoiroPlayerStatsRow[]): AggregatedStats {
  const ratedRows = rows.filter((row) => Number.isFinite(Number(row.rating)));
  const sum = (selector: (row: BzzoiroPlayerStatsRow) => number | null | undefined) =>
    rows.reduce((total, row) => total + safeNumber(selector(row)), 0);

  return {
    matches: rows.length,
    minutes: sum((row) => row.minutes_played),
    avgRating: ratedRows.length > 0
      ? ratedRows.reduce((total, row) => total + safeNumber(row.rating), 0) / ratedRows.length
      : null,
    goals: sum((row) => row.goals),
    assists: sum((row) => row.goal_assist),
    xg: sum((row) => row.expected_goals),
    xa: sum((row) => row.expected_assists),
    shots: sum((row) => row.total_shots),
    shotsOnTarget: sum((row) => row.shots_on_target),
    passes: sum((row) => row.total_pass),
    accuratePasses: sum((row) => row.accurate_pass),
    keyPasses: sum((row) => row.key_pass),
    crosses: sum((row) => row.total_cross),
    accurateCrosses: sum((row) => row.accurate_cross),
    longBalls: sum((row) => row.total_long_balls),
    accurateLongBalls: sum((row) => row.accurate_long_balls),
    touches: sum((row) => row.touches),
    dribblesWon: sum((row) => row.dribble_won),
    dribblesAttempted: sum((row) => row.dribble_attempted),
    duelsWon: sum((row) => row.duel_won),
    duelsLost: sum((row) => row.duel_lost),
    aerialWon: sum((row) => row.aerial_won),
    aerialLost: sum((row) => row.aerial_lost),
    tackles: sum((row) => row.total_tackle),
    tacklesWon: sum((row) => row.won_tackle),
    clearances: sum((row) => row.total_clearance),
    interceptions: sum((row) => row.interception),
    recoveries: sum((row) => row.ball_recovery),
    dispossessed: sum((row) => row.dispossessed),
    possessionLost: sum((row) => row.possession_lost),
    fouled: sum((row) => row.was_fouled),
    fouls: sum((row) => row.fouls),
    yellowCards: sum((row) => row.yellow_card),
    redCards: sum((row) => row.red_card),
    saves: sum((row) => row.saves),
    goalsConceded: sum((row) => row.goals_conceded),
    penaltyWon: sum((row) => row.penalty_won),
    penaltyMiss: sum((row) => row.penalty_miss),
    penaltyConceded: sum((row) => row.penalty_conceded),
    penaltySave: sum((row) => row.penalty_save),
    penaltyFaced: sum((row) => row.penalty_faced),
  };
}

function filterNationalStats(
  rows: BzzoiroPlayerStatsRow[],
  detail: BzzoiroPlayerDetail | null,
  team: TournamentTeamRecord | null,
) {
  const names = new Set(
    [
      team?.name,
      team?.name_he,
      detail?.national_team?.name,
      detail?.national_team?.short_name,
      detail?.national_team?.country,
    ]
      .map(normalizeName)
      .filter(Boolean),
  );

  if (names.size === 0) return [];
  return rows.filter((row) => names.has(normalizeName(row.player?.team)));
}

function getDetailedPositions(detail: BzzoiroPlayerDetail | null, player: PlayerRecord) {
  const values = [
    detail?.specific_position,
    ...(detail?.positions_detailed ?? []),
    detail?.position,
    player.position,
  ]
    .map(getPositionLabel)
    .filter((value): value is string => Boolean(value));

  return Array.from(new Set(values)).slice(0, 4);
}

function getAttributeEntries(value: BzzoiroPlayerDetail["attributes"]) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => ({ label: item, value: "" }));
  }

  return Object.entries(value)
    .filter(([, entryValue]) => entryValue !== null && entryValue !== undefined && entryValue !== "")
    .sort((left, right) => Number(right[1]) - Number(left[1]))
    .map(([label, entryValue]) => ({ label, value: String(entryValue) }));
}

function parsePlayerId(value: string) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : value;
}

function getPositionLabel(position: string | null | undefined) {
  if (!position) return null;
  const normalized = position.trim().toLowerCase();
  if (normalized === "g") return "שוער";
  if (normalized === "d") return "הגנה";
  if (normalized === "m") return "קישור";
  if (normalized === "f") return "התקפה";
  if (normalized.includes("goal")) return "שוער";
  if (normalized.includes("def") || normalized.includes("back")) return "הגנה";
  if (normalized.includes("mid")) return "קישור";
  if (normalized.includes("att") || normalized.includes("for") || normalized.includes("wing") || normalized.includes("striker")) {
    return "התקפה";
  }
  return position;
}

function formatOdds(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "טרם עודכן";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "טרם עודכן";
  return numeric.toFixed(2);
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString("he-IL", {
      timeZone: "Asia/Jerusalem",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatAge(dateOfBirth: string | null | undefined) {
  if (!dateOfBirth) return "-";
  const birthDate = new Date(dateOfBirth);
  if (Number.isNaN(birthDate.getTime())) return "-";
  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  const monthDelta = now.getMonth() - birthDate.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < birthDate.getDate())) {
    age -= 1;
  }
  return `${age} (${formatDate(dateOfBirth)})`;
}

function formatBody(detail: BzzoiroPlayerDetail) {
  const height = detail.height ? `${detail.height} ס״מ` : "-";
  const weight = detail.weight ? `${detail.weight} ק״ג` : "-";
  return `${height} / ${weight}`;
}

function formatAvailability(detail: BzzoiroPlayerDetail) {
  const availability = detail.availability ?? "-";
  const injury = [detail.injury_type, detail.injury_expected_return ? `חזרה: ${formatDate(detail.injury_expected_return)}` : null]
    .filter(Boolean)
    .join(" · ");
  return injury ? `${translateAvailability(availability)} · ${injury}` : translateAvailability(availability);
}

function translateAvailability(value: string | null | undefined) {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized === "available") return "זמין";
  if (normalized === "injured") return "פצוע";
  if (normalized === "suspended") return "מושעה";
  if (normalized === "doubtful") return "בספק";
  return value || "-";
}

function translateFoot(value: string | null | undefined) {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized === "right") return "ימין";
  if (normalized === "left") return "שמאל";
  if (normalized === "both") return "שתי רגליים";
  return value || "-";
}

function formatMarketValue(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "-";
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);
  if (number >= 1_000_000) return `€${(number / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (number >= 1_000) return `€${(number / 1_000).toFixed(0)}K`;
  return `€${number}`;
}

function formatDecimal(value: number | string | null | undefined) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  return number.toFixed(2).replace(/\.00$/, "");
}

function formatPercentRatio(numerator: number, denominator: number) {
  if (!denominator) return "-";
  return `${Math.round((numerator / denominator) * 100)}%`;
}

function formatScore(row: BzzoiroPlayerStatsRow) {
  const home = row.event?.home_score;
  const away = row.event?.away_score;
  if (!Number.isFinite(Number(home)) || !Number.isFinite(Number(away))) return "-";
  return `${home}-${away}`;
}

function getEventTime(row: BzzoiroPlayerStatsRow) {
  return new Date(row.event?.event_date ?? "").getTime() || 0;
}

function safeNumber(value: number | string | null | undefined) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function normalizeName(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9א-ת]+/gi, "")
    .toLowerCase();
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.slice(0, 1))
    .join("")
    .toUpperCase();
}
