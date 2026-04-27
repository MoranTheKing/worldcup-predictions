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

export default async function TeamSquadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: teamData }, { data: playersData, error: playersError }] = await Promise.all([
    supabase
      .from("teams")
      .select("id, name, name_he, logo_url, group_letter, fair_play_score, fifa_ranking, is_eliminated, coach_name, coach_updated_at")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("players")
      .select("id, name, position, goals, assists, appearances, minutes_played, yellow_cards, red_cards")
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
  const displayName = team.name_he ?? team.name;

  return (
    <div className="wc-shell px-4 py-4 md:px-6 md:py-6" dir="rtl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/dashboard/teams/${encodeURIComponent(id)}`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-wc-fg3 transition hover:text-wc-fg1"
        >
          חזרה לנבחרת
        </Link>
        <Link
          href={`/dashboard/teams/${encodeURIComponent(id)}/stats`}
          className="rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs font-bold text-wc-fg2 transition hover:border-wc-neon/40 hover:text-wc-neon"
        >
          סטטיסטיקות
        </Link>
      </div>

      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(95,255,123,0.12),rgba(111,60,255,0.22)_45%,rgba(8,14,29,0.95))] shadow-[0_28px_80px_rgba(0,0,0,0.38)]">
        <div className="grid gap-5 p-5 md:p-7 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="flex min-w-0 items-center gap-4">
            <TeamFlag team={team} />
            <div className="min-w-0">
              <p className="wc-kicker">סגל נבחרת</p>
              <h1 className="mt-2 truncate font-sans text-4xl font-black leading-tight tracking-normal text-wc-fg1 md:text-6xl">
                {displayName}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-wc-fg2">
                שחקנים, עמדות, מאמן ראשי ונתוני הופעות בסיסיים לקראת סנכרון מלא מה-API.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:min-w-[20rem]">
            <HeroStat label="שחקנים" value={String(players.length)} />
            <HeroStat label="בית" value={team.group_letter ?? "-"} />
          </div>
        </div>
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-4 md:p-5">
          <p className="wc-kicker text-[0.68rem]">צוות מקצועי</p>
          <h2 className="mt-1 font-sans text-xl font-black tracking-normal text-wc-fg1">מאמן</h2>
          <div className="mt-4 rounded-[1.4rem] border border-white/10 bg-black/14 p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-wc-fg3">מאמן ראשי</p>
            <p className="mt-2 text-2xl font-black text-wc-fg1">{team.coach_name ?? "טרם סונכרן"}</p>
            <p className="mt-2 text-sm leading-7 text-wc-fg3">
              כאשר נתוני המאמן יגיעו מה-API, הכרטיס הזה יתעדכן אוטומטית.
            </p>
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-4 md:p-5">
          <p className="wc-kicker text-[0.68rem]">שחקנים</p>
          <h2 className="mt-1 font-sans text-xl font-black tracking-normal text-wc-fg1">סגל</h2>

          {players.length > 0 ? (
            <div className="mt-4 grid gap-4">
              {groups.map((group) => (
                <div key={group.key} className="rounded-[1.4rem] border border-white/10 bg-black/14 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-sans text-lg font-black tracking-normal text-wc-fg1">{group.label}</h3>
                    <span className="rounded-full bg-white/8 px-3 py-1 text-xs font-bold text-wc-fg3">
                      {group.players.length}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {group.players.map((player) => (
                      <PlayerRow key={player.id} player={player} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-[1.4rem] border border-dashed border-white/10 bg-white/[0.035] p-8 text-center">
              <p className="text-lg font-black text-wc-fg1">הסגל עדיין לא סונכרן</p>
              <p className="mt-2 text-sm leading-7 text-wc-fg3">
                כאשר ה-API יחזיר את רשימת השחקנים הרשמית, הם יוצגו כאן לפי עמדות.
              </p>
            </div>
          )}
        </section>
      </div>
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

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.15rem] border border-white/10 bg-black/18 p-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-wc-fg3">{label}</p>
      <p className="mt-2 font-sans text-3xl font-black tracking-normal text-wc-fg1">{value}</p>
    </div>
  );
}

function PlayerRow({ player }: { player: TeamPlayer }) {
  return (
    <div className="rounded-xl bg-white/5 px-3 py-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-wc-fg1">{player.name}</p>
          <p className="text-[11px] text-wc-fg3">{getPositionLabel(player.position)}</p>
        </div>
        <div className="shrink-0 text-end">
          <p className="text-xs font-bold text-wc-fg2">{player.goals ?? 0} שערים</p>
          <p className="text-[11px] text-wc-fg3">{player.assists ?? 0} בישולים</p>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[10px] font-bold text-wc-fg3">
        <span className="rounded-full bg-white/6 px-2 py-1">{player.appearances ?? 0} הופ׳</span>
        <span className="rounded-full bg-white/6 px-2 py-1 text-wc-amber">{player.yellow_cards ?? 0} צה׳</span>
        <span className="rounded-full bg-white/6 px-2 py-1 text-wc-danger">{player.red_cards ?? 0} אד׳</span>
      </div>
    </div>
  );
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
  const normalized = position.toLowerCase();
  if (normalized.includes("goal")) return "goalkeeper";
  if (normalized.includes("def")) return "defender";
  if (normalized.includes("mid")) return "midfielder";
  if (normalized.includes("att") || normalized.includes("for")) return "forward";
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
