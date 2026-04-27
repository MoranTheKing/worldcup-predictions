import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { TournamentTeamRecord } from "@/lib/tournament/matches";

export const dynamic = "force-dynamic";

type TeamPlayer = {
  id: number | string;
  name: string;
  position: string | null;
  photo_url?: string | null;
  shirt_number?: number | null;
  goals?: number | null;
  assists?: number | null;
  appearances?: number | null;
  minutes_played?: number | null;
  yellow_cards?: number | null;
  red_cards?: number | null;
};

type PositionGroup = {
  key: string;
  label: string;
  players: TeamPlayer[];
};

type FormationLine = {
  key: string;
  label: string;
  players: TeamPlayer[];
};

export default async function TeamSquadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: teamData }, { data: playersData, error: playersError }] = await Promise.all([
    supabase
      .from("teams")
      .select("id, name, name_he, logo_url, group_letter, fair_play_score, fifa_ranking, is_eliminated, coach_name, coach_bzzoiro_id, coach_photo_url, coach_updated_at")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("players")
      .select("id, name, position, photo_url, shirt_number, goals, assists, appearances, minutes_played, yellow_cards, red_cards")
      .eq("team_id", id)
      .order("position", { ascending: true })
      .order("name", { ascending: true }),
  ]);

  if (!teamData) notFound();

  if (playersError) {
    console.error("[TeamSquadPage] players error:", playersError);
  }

  const team = teamData as TournamentTeamRecord;
  const players = ((playersData ?? []) as TeamPlayer[]).filter((player) => player.name);
  const groups = groupPlayersByPosition(players);
  const formation = buildFormation(players);
  const displayName = team.name_he ?? team.name;
  const startersCount = formation.reduce((sum, line) => sum + line.players.length, 0);

  return (
    <div className="wc-shell px-4 py-4 md:px-6 md:py-6" dir="rtl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/dashboard/teams/${encodeURIComponent(id)}`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-wc-fg3 transition hover:text-wc-fg1"
        >
          חזרה לנבחרת
        </Link>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/dashboard/teams/${encodeURIComponent(id)}/stats`}
            className="rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs font-bold text-wc-fg2 transition hover:border-wc-neon/40 hover:text-wc-neon"
          >
            סטט׳ שחקנים
          </Link>
          <Link
            href={`/dashboard/teams/${encodeURIComponent(id)}/team-stats`}
            className="rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs font-bold text-wc-fg2 transition hover:border-wc-neon/40 hover:text-wc-neon"
          >
            סטט׳ קבוצתית
          </Link>
        </div>
      </div>

      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(95,255,123,0.12),rgba(111,60,255,0.24)_45%,rgba(8,14,29,0.95))] shadow-[0_28px_80px_rgba(0,0,0,0.38)]">
        <div className="grid gap-5 p-5 md:p-7 lg:grid-cols-[1fr_22rem] lg:items-center">
          <div className="flex min-w-0 items-center gap-4">
            <TeamFlag team={team} />
            <div className="min-w-0">
              <p className="wc-kicker">סגל ומאמן</p>
              <h1 className="mt-2 truncate font-sans text-4xl font-black leading-tight tracking-normal text-wc-fg1 md:text-6xl">
                {displayName}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-wc-fg2">
                מבט ספורטיבי על הסגל: מאמן, מערך משוער, תפקידי שחקנים ותשתית לתמונות ונתוני API מלאים.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <HeroStat label="שחקנים" value={String(players.length)} />
            <HeroStat label="מערך" value={startersCount > 0 ? "4-3-3" : "-"} />
            <HeroStat label="בית" value={team.group_letter ?? "-"} />
          </div>
        </div>
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-4 md:p-5">
          <SectionHeader title="מאמן" eyebrow="BSD API" />
          <CoachSummary team={team} />
        </section>

        <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-4 md:p-5">
          <SectionHeader title="מערך משוער" eyebrow={players.length > 0 ? "מבוסס עמדות זמינות" : "ממתין לסגל"} />
          {players.length > 0 ? (
            <FormationPitch lines={formation} />
          ) : (
            <EmptyPanel
              title="הסגל עדיין לא סונכרן"
              description="כשה-API יחזיר רשימת שחקנים רשמית, המערך יתמלא אוטומטית לפי עמדות ותמונות."
            />
          )}
        </section>
      </div>

      <section className="mt-5 rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-4 md:p-5">
        <SectionHeader title="סגל מלא" eyebrow="שחקנים לפי עמדות" />
        {players.length > 0 ? (
          <div className="mt-4 grid gap-4">
            {groups.map((group) => (
              <div key={group.key} className="rounded-[1.4rem] border border-white/10 bg-black/14 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-sans text-lg font-black tracking-normal text-wc-fg1">{group.label}</h3>
                  <span className="rounded-full bg-white/8 px-3 py-1 text-xs font-bold text-wc-fg3">
                    {group.players.length} שחקנים
                  </span>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {group.players.map((player) => (
                    <PlayerCard key={player.id} player={player} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyPanel
            title="אין עדיין סגל רשמי"
            description="העמוד מוכן לתמונות, מספרי חולצה, עמדות וסטטיסטיקות ברגע שהסנכרון מול ה-API יופעל."
          />
        )}
      </section>
    </div>
  );
}

function TeamFlag({ team }: { team: Pick<TournamentTeamRecord, "name" | "name_he" | "logo_url"> }) {
  const displayName = team.name_he ?? team.name;

  return (
    <div className="grid h-24 w-28 place-items-center rounded-[1.4rem] border border-white/15 bg-black/22 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
      {team.logo_url ? (
        <Image
          src={team.logo_url}
          alt={displayName}
          width={82}
          height={56}
          style={{ width: 82, height: 56 }}
          className="rounded-md object-cover"
          unoptimized
        />
      ) : (
        <span className="text-xl font-black text-wc-fg2">{displayName.slice(0, 1)}</span>
      )}
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

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.15rem] border border-white/10 bg-black/18 p-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-wc-fg3">{label}</p>
      <p className="mt-2 font-sans text-3xl font-black tracking-normal text-wc-fg1">{value}</p>
    </div>
  );
}

function CoachSummary({ team }: { team: Pick<TournamentTeamRecord, "coach_name" | "coach_photo_url" | "logo_url" | "name" | "name_he"> }) {
  const displayName = team.name_he ?? team.name;
  const coachName = team.coach_name ?? "טרם סונכרן";

  return (
    <div className="mt-4 flex items-center gap-4 rounded-[1.4rem] border border-white/10 bg-black/18 p-4">
      <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-[1.15rem] border border-white/10 bg-white/8">
        {team.coach_photo_url ? (
          <Image
            src={team.coach_photo_url}
            alt={coachName}
            width={80}
            height={80}
            style={{ width: 80, height: 80 }}
            className="h-full w-full object-cover"
            unoptimized
          />
        ) : team.logo_url ? (
          <Image
            src={team.logo_url}
            alt={displayName}
            width={58}
            height={40}
            style={{ width: 58, height: 40 }}
            className="rounded-md object-cover opacity-90"
            unoptimized
          />
        ) : (
          <span className="font-sans text-2xl font-black text-wc-fg2">{displayName.slice(0, 1)}</span>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-wc-fg3">מאמן ראשי</p>
        <p className="mt-1 truncate text-2xl font-black text-wc-fg1">{coachName}</p>
      </div>
    </div>
  );
}

function FormationPitch({ lines }: { lines: FormationLine[] }) {
  return (
    <div className="mt-4 overflow-hidden rounded-[1.6rem] border border-[rgba(95,255,123,0.18)] bg-[linear-gradient(180deg,rgba(95,255,123,0.16),rgba(13,70,48,0.18)_50%,rgba(8,14,29,0.94))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
      <div className="relative min-h-[32rem] rounded-[1.3rem] border border-white/18 bg-[linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.045)_1px,transparent_1px)] bg-[length:5rem_5rem] p-4">
        <div className="absolute inset-x-[18%] top-1/2 h-20 -translate-y-1/2 rounded-full border border-white/18" />
        <div className="absolute inset-x-[28%] top-4 h-20 rounded-b-[3rem] border-x border-b border-white/18" />
        <div className="absolute inset-x-[28%] bottom-4 h-20 rounded-t-[3rem] border-x border-t border-white/18" />

        <div className="relative z-10 flex h-full min-h-[30rem] flex-col justify-between gap-4">
          {lines.map((line) => (
            <div key={line.key}>
              <p className="mb-2 text-center text-[10px] font-black uppercase tracking-[0.18em] text-white/55">
                {line.label}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3">
                {line.players.map((player) => (
                  <PlayerToken key={player.id} player={player} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PlayerToken({ player }: { player: TeamPlayer }) {
  return (
    <div className="w-24 rounded-[1.1rem] border border-white/12 bg-black/32 p-2 text-center shadow-[0_12px_28px_rgba(0,0,0,0.26)] backdrop-blur">
      <PlayerAvatar player={player} size="sm" />
      <p className="mt-2 truncate text-xs font-black text-wc-fg1">{player.name}</p>
      <p className="text-[10px] font-bold text-wc-fg3">{getPositionLabel(player.position)}</p>
    </div>
  );
}

function PlayerCard({ player }: { player: TeamPlayer }) {
  return (
    <article className="overflow-hidden rounded-[1.25rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.025))] p-3">
      <div className="flex items-start gap-3">
        <PlayerAvatar player={player} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-wc-fg1">{player.name}</p>
              <p className="mt-1 text-xs font-bold text-wc-fg3">{getPositionLabel(player.position)}</p>
            </div>
            <span className="shrink-0 rounded-full bg-white/8 px-2 py-1 text-[11px] font-black text-wc-fg2">
              #{player.shirt_number ?? "-"}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-1 text-center">
            <MiniMetric label="הופ׳" value={player.appearances ?? 0} />
            <MiniMetric label="שערים" value={player.goals ?? 0} />
            <MiniMetric label="בישולים" value={player.assists ?? 0} />
            <MiniMetric label="דק׳" value={player.minutes_played ?? 0} />
          </div>
        </div>
      </div>
    </article>
  );
}

function PlayerAvatar({ player, size }: { player: TeamPlayer; size: "sm" | "lg" }) {
  const sizeClass = size === "lg" ? "h-16 w-16" : "mx-auto h-12 w-12";
  const imageSize = size === "lg" ? 64 : 48;

  return (
    <div className={`${sizeClass} relative shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(95,255,123,0.16),rgba(111,60,255,0.28))]`}>
      {player.photo_url ? (
        <Image
          src={player.photo_url}
          alt={player.name}
          width={imageSize}
          height={imageSize}
          style={{ width: imageSize, height: imageSize }}
          className="h-full w-full object-cover"
          unoptimized
        />
      ) : (
        <span className="grid h-full w-full place-items-center font-sans text-xl font-black tracking-normal text-wc-fg1">
          {getInitials(player.name)}
        </span>
      )}
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-black/18 px-2 py-1">
      <p className="text-[10px] font-bold text-wc-fg3">{label}</p>
      <p className="mt-0.5 text-sm font-black text-wc-fg1">{value}</p>
    </div>
  );
}

function EmptyPanel({ title, description }: { title: string; description: string }) {
  return (
    <div className="mt-4 rounded-[1.4rem] border border-dashed border-white/10 bg-white/[0.035] p-8 text-center">
      <p className="text-lg font-black text-wc-fg1">{title}</p>
      <p className="mt-2 text-sm leading-7 text-wc-fg3">{description}</p>
    </div>
  );
}

function buildFormation(players: TeamPlayer[]): FormationLine[] {
  const grouped = {
    goalkeeper: players.filter((player) => getPositionKey(player.position) === "goalkeeper"),
    defender: players.filter((player) => getPositionKey(player.position) === "defender"),
    midfielder: players.filter((player) => getPositionKey(player.position) === "midfielder"),
    forward: players.filter((player) => getPositionKey(player.position) === "forward"),
    other: players.filter((player) => getPositionKey(player.position) === "other"),
  };
  const used = new Set<TeamPlayer["id"]>();

  const pick = (list: TeamPlayer[], amount: number) => {
    const selected = list.filter((player) => !used.has(player.id)).slice(0, amount);
    selected.forEach((player) => used.add(player.id));
    return selected;
  };
  const fill = (line: TeamPlayer[], amount: number) => {
    if (line.length >= amount) return line;
    return [
      ...line,
      ...pick([...grouped.other, ...players], amount - line.length),
    ];
  };

  const forwards = fill(pick(grouped.forward, 3), 3);
  const midfielders = fill(pick(grouped.midfielder, 3), 3);
  const defenders = fill(pick(grouped.defender, 4), 4);
  const goalkeepers = fill(pick(grouped.goalkeeper, 1), 1);

  return [
    { key: "forward", label: "התקפה", players: forwards },
    { key: "midfielder", label: "קישור", players: midfielders },
    { key: "defender", label: "הגנה", players: defenders },
    { key: "goalkeeper", label: "שער", players: goalkeepers },
  ].filter((line) => line.players.length > 0);
}

function groupPlayersByPosition(players: TeamPlayer[]): PositionGroup[] {
  const order = ["goalkeeper", "defender", "midfielder", "forward", "other"];
  const labels: Record<string, string> = {
    goalkeeper: "שוערים",
    defender: "הגנה",
    midfielder: "קישור",
    forward: "התקפה",
    other: "שחקנים נוספים",
  };
  const grouped = new Map<string, TeamPlayer[]>();

  for (const player of players) {
    const key = getPositionKey(player.position);
    grouped.set(key, [...(grouped.get(key) ?? []), player]);
  }

  return order
    .map((key) => ({ key, label: labels[key], players: grouped.get(key) ?? [] }))
    .filter((group) => group.players.length > 0);
}

function getPositionKey(position: string | null) {
  if (!position) return "other";
  const normalized = position.trim().toLowerCase();
  if (normalized === "g") return "goalkeeper";
  if (normalized === "d") return "defender";
  if (normalized === "m") return "midfielder";
  if (normalized === "f") return "forward";
  if (normalized.includes("goal")) return "goalkeeper";
  if (normalized.includes("def")) return "defender";
  if (normalized.includes("mid")) return "midfielder";
  if (normalized.includes("att") || normalized.includes("for") || normalized.includes("striker") || normalized.includes("wing")) {
    return "forward";
  }
  return "other";
}

function getPositionLabel(position: string | null) {
  if (!position) return "שחקן";
  const key = getPositionKey(position);
  if (key === "goalkeeper") return "שוער";
  if (key === "defender") return "הגנה";
  if (key === "midfielder") return "קישור";
  if (key === "forward") return "התקפה";
  return position;
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
