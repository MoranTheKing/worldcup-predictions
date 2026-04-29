import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBzzoiroVenuePageData } from "@/lib/bzzoiro/venues";
import type { BzzoiroMatchEvent } from "@/lib/bzzoiro/matches";
import { normalizeTeamNameKey, translateTeamNameToHebrew } from "@/lib/i18n/team-names";
import { createClient } from "@/lib/supabase/server";
import {
  attachTeamsToMatches,
  getMatchScoreSummary,
  getStageLabelHe,
  getTeamDisplayLogo,
  getTeamDisplayName,
  isMatchScoreVisible,
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
  const eventCards = data.worldCupEvents.map((event, index) => ({
    key: getEventKey(event, index),
    event,
    localMatch: findLocalMatchForEvent(event, localMatches),
  }));
  const mappedEventCount = eventCards.filter((card) => card.localMatch).length;

  return (
    <div className="wc-shell px-4 py-4 md:px-6 md:py-6" dir="rtl">
      <Link
        href="/dashboard/matches"
        className="mb-4 inline-flex items-center gap-2 text-xs font-semibold text-wc-fg3 transition hover:text-wc-fg1"
      >
        חזרה למשחקים
      </Link>

      <section className="relative isolate overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(95,255,123,0.12),rgba(111,60,255,0.22)_48%,rgba(8,14,29,0.96))] shadow-[0_28px_80px_rgba(0,0,0,0.38)]">
        {data.imageUrl ? (
          <Image
            src={data.imageUrl}
            alt=""
            fill
            className="-z-10 object-cover opacity-[0.16] saturate-125"
            sizes="100vw"
            unoptimized
          />
        ) : null}
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(135deg,rgba(5,8,18,0.42),rgba(8,14,29,0.96)_65%)]" />
        <div className="relative grid gap-6 p-5 md:p-7 lg:grid-cols-[1fr_24rem] lg:items-center">
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
              <HeroStat label="התאמות מקומיות" value={`${mappedEventCount}/${data.worldCupEvents.length}`} />
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

      <section className="mt-5 rounded-[1.85rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.026))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] md:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <SectionHeader title="משחקים באצטדיון" eyebrow="BSD World Cup events" />
          <span className="rounded-full border border-wc-neon/20 bg-wc-neon/10 px-3 py-1.5 text-xs font-black text-wc-neon">
            {mappedEventCount}/{data.worldCupEvents.length} משחקים מקושרים
          </span>
        </div>
        {eventCards.length > 0 ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {eventCards.map(({ key, event, localMatch }) => (
              <StadiumMatchCard
                key={key}
                event={event}
                localMatch={localMatch}
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
  const stageLabel = localMatch ? getStageLabelHe(localMatch.stage) : translateStatus(event.status);
  const homeTeam = localMatch ? resolveLocalTeamForEventSide(event, localMatch, "home") : null;
  const awayTeam = localMatch ? resolveLocalTeamForEventSide(event, localMatch, "away") : null;
  const homeName =
    (homeTeam ? getTeamDisplayName(homeTeam, null) : translateTeamNameToHebrew(event.home_team)) ||
    getTeamDisplayName(localMatch?.homeTeam ?? null, localMatch?.home_placeholder ?? null);
  const awayName =
    (awayTeam ? getTeamDisplayName(awayTeam, null) : translateTeamNameToHebrew(event.away_team)) ||
    getTeamDisplayName(localMatch?.awayTeam ?? null, localMatch?.away_placeholder ?? null);
  const score = localMatch && isMatchScoreVisible(localMatch)
    ? getMatchScoreSummary(getEventSideScoreMatch(event, localMatch))
    : null;
  const centerLabel = score ? score.displayScore : "VS";
  const statusLabel = localMatch ? translateStatus(localMatch.status) : translateStatus(event.status);
  const content = (
    <article className="group relative min-h-[11.5rem] overflow-hidden rounded-[1.45rem] border border-white/10 bg-[linear-gradient(150deg,rgba(255,255,255,0.085),rgba(255,255,255,0.035)_44%,rgba(0,0,0,0.20))] p-4 shadow-[0_18px_45px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.055)] transition duration-200 hover:-translate-y-1 hover:border-wc-neon/45 hover:bg-white/[0.065]">
      <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-l from-transparent via-wc-neon/55 to-transparent opacity-0 transition group-hover:opacity-100" />
      <div className="pointer-events-none absolute inset-y-5 end-0 w-1 rounded-s-full bg-wc-neon/0 transition group-hover:bg-wc-neon/70" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-full bg-wc-neon/10 px-2.5 py-1 text-[11px] font-black text-wc-neon">{stageLabel}</span>
            <span className="inline-flex rounded-full bg-white/8 px-2.5 py-1 text-[11px] font-black text-wc-fg3">{statusLabel}</span>
          </div>
          <p className="mt-2 text-xs font-bold text-wc-fg3">{formatDateTime(event.event_date ?? event.date)}</p>
        </div>
        <span className="shrink-0 rounded-full bg-black/22 px-2.5 py-1 text-[11px] font-black text-wc-fg3">
          {localMatch ? `#${localMatch.match_number}` : "BSD"}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-[minmax(0,1fr)_4.25rem_minmax(0,1fr)] items-center gap-3 text-center">
        <StadiumTeamFace team={homeTeam} name={homeName} />
        <span
          className={`grid min-h-14 place-items-center rounded-2xl border border-white/10 bg-black/24 px-2 font-sans font-black tracking-normal ${score ? "text-lg text-wc-fg1" : "text-sm text-wc-fg3"}`}
          dir="ltr"
        >
          {centerLabel}
        </span>
        <StadiumTeamFace team={awayTeam} name={awayName} />
      </div>

      {localMatch ? (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/18 px-3 py-2 text-xs font-black text-wc-fg2">
          <span>התאמה מקומית מלאה</span>
          <span className="text-wc-neon" aria-hidden="true">←</span>
        </div>
      ) : (
        <p className="mt-4 rounded-2xl border border-dashed border-white/10 bg-black/12 px-3 py-2 text-center text-xs font-bold text-wc-fg3">
          אירוע BSD ללא התאמה מקומית
        </p>
      )}
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

function StadiumTeamFace({
  team,
  name,
}: {
  team: MatchWithTeams["homeTeam"];
  name: string;
}) {
  const logo = getTeamDisplayLogo(team);

  return (
    <div className="flex min-w-0 flex-col items-center gap-2">
      <div className="grid h-14 w-16 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.055] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
        {logo ? (
          <Image
            src={logo}
            alt={name}
            width={64}
            height={44}
            className="h-11 w-14 rounded-md object-cover"
            unoptimized
          />
        ) : (
          <span className="text-sm font-black text-wc-fg2">{getTeamInitials(name)}</span>
        )}
      </div>
      <p className="max-w-full truncate text-sm font-black text-wc-fg1">{name}</p>
    </div>
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

  const nameMatch = matches
    .filter((match) => {
      const matchTime = new Date(match.date_time).getTime();
      if (!Number.isFinite(matchTime) || Math.abs(matchTime - eventTime) > 36 * 60 * 60 * 1000) return false;
      return matchEventPair(match, event, false);
    })
    .sort((left, right) => {
      const leftDelta = Math.abs(new Date(left.date_time).getTime() - eventTime);
      const rightDelta = Math.abs(new Date(right.date_time).getTime() - eventTime);
      return leftDelta - rightDelta;
    })[0] ?? null;

  if (nameMatch) return nameMatch;

  const swappedNameMatch = matches
    .filter((match) => {
      const matchTime = new Date(match.date_time).getTime();
      if (!Number.isFinite(matchTime) || Math.abs(matchTime - eventTime) > 36 * 60 * 60 * 1000) return false;
      return matchEventPair(match, event, true);
    })
    .sort((left, right) => {
      const leftDelta = Math.abs(new Date(left.date_time).getTime() - eventTime);
      const rightDelta = Math.abs(new Date(right.date_time).getTime() - eventTime);
      return leftDelta - rightDelta;
    })[0] ?? null;

  if (swappedNameMatch) return swappedNameMatch;

  const hasPlaceholderTeam =
    isPlaceholderSide(event.home_team) ||
    isPlaceholderSide(event.away_team);

  if (!hasPlaceholderTeam) return null;

  return matches
    .filter((match) => {
      const matchTime = new Date(match.date_time).getTime();
      if (!Number.isFinite(matchTime) || Math.abs(matchTime - eventTime) > 8 * 60 * 60 * 1000) return false;
      return isPlaceholderSide(match.home_placeholder) || isPlaceholderSide(match.away_placeholder) || match.match_number >= 73;
    })
    .sort((left, right) => {
      const leftDelta = Math.abs(new Date(left.date_time).getTime() - eventTime);
      const rightDelta = Math.abs(new Date(right.date_time).getTime() - eventTime);
      return leftDelta - rightDelta;
    })[0] ?? null;
}

function matchEventPair(match: MatchWithTeams, event: BzzoiroMatchEvent, swapped: boolean) {
  const homeRemote = swapped ? getEventRemoteTeam(event, "away") : getEventRemoteTeam(event, "home");
  const awayRemote = swapped ? getEventRemoteTeam(event, "home") : getEventRemoteTeam(event, "away");

  return (
    teamMatchesRemote(match.homeTeam, match.home_placeholder, homeRemote.id, homeRemote.name) &&
    teamMatchesRemote(match.awayTeam, match.away_placeholder, awayRemote.id, awayRemote.name)
  );
}

function resolveLocalTeamForEventSide(
  event: BzzoiroMatchEvent,
  match: MatchWithTeams,
  side: "home" | "away",
) {
  const remote = getEventRemoteTeam(event, side);

  if (teamMatchesRemote(match.homeTeam, match.home_placeholder, remote.id, remote.name)) {
    return match.homeTeam;
  }

  if (teamMatchesRemote(match.awayTeam, match.away_placeholder, remote.id, remote.name)) {
    return match.awayTeam;
  }

  return side === "home" ? match.homeTeam : match.awayTeam;
}

function getEventSideScoreMatch(event: BzzoiroMatchEvent, match: MatchWithTeams) {
  if (!shouldFlipScoreForEventSides(event, match)) return match;

  return {
    ...match,
    home_score: match.away_score,
    away_score: match.home_score,
    home_penalty_score: match.away_penalty_score,
    away_penalty_score: match.home_penalty_score,
  };
}

function shouldFlipScoreForEventSides(event: BzzoiroMatchEvent, match: MatchWithTeams) {
  return (
    eventSideMatchesLocalSide(event, match, "home", "away") &&
    eventSideMatchesLocalSide(event, match, "away", "home")
  );
}

function eventSideMatchesLocalSide(
  event: BzzoiroMatchEvent,
  match: MatchWithTeams,
  eventSide: "home" | "away",
  localSide: "home" | "away",
) {
  const remote = getEventRemoteTeam(event, eventSide);
  const team = localSide === "home" ? match.homeTeam : match.awayTeam;
  const placeholder = localSide === "home" ? match.home_placeholder : match.away_placeholder;
  return teamMatchesRemote(team, placeholder, remote.id, remote.name);
}

function getEventRemoteTeam(event: BzzoiroMatchEvent, side: "home" | "away") {
  const team = side === "home" ? event.home_team_obj : event.away_team_obj;
  return {
    id: team?.id,
    name: team?.name ?? (side === "home" ? event.home_team : event.away_team),
  };
}

function teamMatchesRemote(
  team: MatchWithTeams["homeTeam"],
  placeholder: string | null | undefined,
  remoteId: number | string | null | undefined,
  remoteName: string | null | undefined,
) {
  if (sameRemoteId(team?.bzzoiro_team_id, remoteId)) return true;
  return [team?.name, team?.name_he, placeholder].some((candidate) => namesMatch(candidate, remoteName));
}

function sameRemoteId(left: number | string | null | undefined, right: number | string | null | undefined) {
  return Boolean(left && right && String(left) === String(right));
}

function isPlaceholderSide(value: string | null | undefined) {
  const raw = String(value ?? "").trim().toLowerCase();
  const normalized = normalizeName(value);
  if (!normalized) return false;
  return (
    /^[1234][a-l]$/i.test(normalized) ||
    /^w\d+$/i.test(normalized) ||
    /^l\d+$/i.test(normalized) ||
    raw.includes("/") ||
    normalized.includes("winner") ||
    normalized.includes("runner")
  );
}

function getEventKey(event: BzzoiroMatchEvent, index: number) {
  return [
    event.id ?? index,
    index,
    event.event_date ?? event.date ?? "",
    event.home_team ?? "",
    event.away_team ?? "",
  ].join("-");
}

function namesMatch(left: string | null | undefined, right: string | null | undefined) {
  const leftKey = normalizeTeamNameKey(left);
  const rightKey = normalizeTeamNameKey(right);
  const leftHeKey = normalizeName(translateTeamNameToHebrew(left));
  const rightHeKey = normalizeName(translateTeamNameToHebrew(right));

  const directMatch = Boolean(
    leftKey &&
      rightKey &&
      (leftKey === rightKey || leftKey.includes(rightKey) || rightKey.includes(leftKey)),
  );
  const translatedMatch = Boolean(leftHeKey && rightHeKey && leftHeKey === rightHeKey);

  return directMatch || translatedMatch;
}

function normalizeName(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9א-ת]+/gi, "")
    .toLowerCase();
}

function getTeamInitials(name: string) {
  const parts = name
    .replace(/[()]/g, " ")
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  return (parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : name.slice(0, 2)).toUpperCase();
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
