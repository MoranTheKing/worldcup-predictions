import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBzzoiroVenuePageData } from "@/lib/bzzoiro/venues";
import type { BzzoiroMatchEvent } from "@/lib/bzzoiro/matches";
import { translateTeamNameToHebrew } from "@/lib/i18n/team-names";
import { createClient } from "@/lib/supabase/server";
import {
  attachTeamsToMatches,
  getStageLabelHe,
  type MatchWithTeams,
} from "@/lib/tournament/matches";

export const dynamic = "force-dynamic";

export default async function StadiumPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getBzzoiroVenuePageData(id);
  if (!data.venue?.name) notFound();

  const supabase = await createClient();
  const [{ data: matchesData }, { data: teamsData }] = await Promise.all([
    supabase
      .from("matches")
      .select("match_number, stage, status, match_phase, date_time, minute, home_team_id, away_team_id, home_placeholder, away_placeholder, home_score, away_score, is_extra_time, home_penalty_score, away_penalty_score")
      .order("date_time", { ascending: true }),
    supabase
      .from("teams")
      .select("id, name, name_he, logo_url, group_letter, bzzoiro_team_id")
      .order("name", { ascending: true }),
  ]);
  const localMatches = attachTeamsToMatches((matchesData ?? []) as MatchWithTeams[], teamsData ?? []) as MatchWithTeams[];

  return (
    <div className="wc-shell px-4 py-4 md:px-6 md:py-6" dir="rtl">
      <Link
        href="/dashboard/matches"
        className="mb-4 inline-flex items-center gap-2 text-xs font-semibold text-wc-fg3 transition hover:text-wc-fg1"
      >
        חזרה למשחקים
      </Link>

      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(95,255,123,0.12),rgba(111,60,255,0.22)_48%,rgba(8,14,29,0.96))] shadow-[0_28px_80px_rgba(0,0,0,0.38)]">
        <div className="grid gap-6 p-5 md:p-7 lg:grid-cols-[1fr_24rem] lg:items-center">
          <div className="min-w-0">
            <p className="wc-kicker">World Cup Venue</p>
            <h1 className="mt-2 font-sans text-4xl font-black leading-tight tracking-normal text-wc-fg1 md:text-6xl">
              {data.venue.name}
            </h1>
            <p className="mt-3 text-sm font-bold text-wc-fg2">
              {[data.venue.city, data.venue.country].filter(Boolean).join(", ") || "מיקום לא זמין"}
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <HeroStat label="קיבולת" value={formatNumber(data.venue.capacity)} />
              <HeroStat label="משחקי מונדיאל" value={String(data.worldCupEvents.length)} />
              <HeroStat label="קבוצת בית API" value={data.venue.team?.name ?? "-"} />
            </div>
          </div>
          <div className="overflow-hidden rounded-[1.6rem] border border-white/10 bg-black/18 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            {data.imageUrl ? (
              <Image
                src={data.imageUrl}
                alt={data.venue.name}
                width={640}
                height={420}
                className="h-72 w-full object-cover"
                unoptimized
              />
            ) : (
              <div className="grid h-72 place-items-center text-sm font-bold text-wc-fg3">אין תמונת אצטדיון</div>
            )}
          </div>
        </div>
      </section>

      <section className="mt-5 rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-4 md:p-5">
        <SectionHeader title="משחקים באצטדיון" eyebrow="BSD World Cup events" />
        {data.worldCupEvents.length > 0 ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {data.worldCupEvents.map((event) => (
              <StadiumMatchCard
                key={String(event.id)}
                event={event}
                localMatch={findLocalMatchForEvent(event, localMatches)}
              />
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-[1.25rem] border border-dashed border-white/10 bg-black/12 p-6 text-center text-sm leading-7 text-wc-fg3">
            BSD עדיין לא מחזיר משחקי מונדיאל משויכים לאצטדיון הזה. כשהאירועים יתעדכנו, הרשימה תתמלא אוטומטית.
          </div>
        )}
      </section>
    </div>
  );
}

function StadiumMatchCard({
  event,
  localMatch,
}: {
  event: BzzoiroMatchEvent;
  localMatch: MatchWithTeams | null;
}) {
  const content = (
    <article className="rounded-[1.25rem] border border-white/10 bg-black/14 p-4 transition hover:border-wc-neon/35 hover:bg-white/[0.055]">
      <div className="flex items-center justify-between gap-3 text-xs text-wc-fg3">
        <span className="font-black text-wc-neon">{localMatch ? getStageLabelHe(localMatch.stage) : translateStatus(event.status)}</span>
        <span>{formatDateTime(event.event_date ?? event.date)}</span>
      </div>
      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
        <p className="truncate font-black text-wc-fg1">{translateTeamNameToHebrew(event.home_team)}</p>
        <span className="font-sans text-xl font-black tracking-normal text-wc-fg3">VS</span>
        <p className="truncate font-black text-wc-fg1">{translateTeamNameToHebrew(event.away_team)}</p>
      </div>
      {localMatch ? (
        <p className="mt-3 text-center text-xs font-bold text-wc-fg3">משחק {localMatch.match_number}</p>
      ) : null}
    </article>
  );

  return localMatch ? (
    <Link href={`/dashboard/matches/${localMatch.match_number}`} className="block">
      {content}
    </Link>
  ) : (
    content
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[1.15rem] border border-white/10 bg-black/18 p-3 text-center">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-wc-fg3">{label}</p>
      <p className="mt-2 truncate font-sans text-2xl font-black tracking-normal text-wc-fg1">{value}</p>
    </div>
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

function findLocalMatchForEvent(event: BzzoiroMatchEvent, matches: MatchWithTeams[]) {
  const eventTime = new Date(event.event_date ?? event.date ?? "").getTime();
  if (!Number.isFinite(eventTime)) return null;

  return matches
    .filter((match) => {
      const matchTime = new Date(match.date_time).getTime();
      if (!Number.isFinite(matchTime) || Math.abs(matchTime - eventTime) > 36 * 60 * 60 * 1000) return false;
      const homeName = match.homeTeam ? match.homeTeam.name : match.home_placeholder;
      const awayName = match.awayTeam ? match.awayTeam.name : match.away_placeholder;
      return namesMatch(homeName, event.home_team) && namesMatch(awayName, event.away_team);
    })
    .sort((left, right) => {
      const leftDelta = Math.abs(new Date(left.date_time).getTime() - eventTime);
      const rightDelta = Math.abs(new Date(right.date_time).getTime() - eventTime);
      return leftDelta - rightDelta;
    })[0] ?? null;
}

function namesMatch(left: string | null | undefined, right: string | null | undefined) {
  const leftKey = normalizeName(left);
  const rightKey = normalizeName(right);
  return Boolean(leftKey && rightKey && (leftKey === rightKey || leftKey.includes(rightKey) || rightKey.includes(leftKey)));
}

function normalizeName(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9א-ת]+/gi, "")
    .toLowerCase();
}

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("he-IL", {
      timeZone: "Asia/Jerusalem",
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value.toLocaleString("he-IL") : "-";
}

function translateStatus(value: string | null | undefined) {
  const status = String(value ?? "").toLowerCase();
  if (status.includes("progress") || status.includes("half")) return "חי";
  if (status === "finished") return "הסתיים";
  if (status === "notstarted" || status === "scheduled") return "מתוכנן";
  return value ?? "-";
}
