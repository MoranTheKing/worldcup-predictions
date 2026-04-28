import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import TeamLink from "@/components/TeamLink";
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
  const { data: teamData } = player.team_id
    ? await supabase
        .from("teams")
        .select("id, name, name_he, logo_url, group_letter, fair_play_score, fifa_ranking, is_eliminated, outright_odds")
        .eq("id", player.team_id)
        .maybeSingle()
    : { data: null };
  const team = teamData as TournamentTeamRecord | null;
  const teamName = team ? team.name_he ?? team.name : "ללא נבחרת";

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

      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(95,255,123,0.12),rgba(111,60,255,0.24)_46%,rgba(8,14,29,0.96))] shadow-[0_28px_80px_rgba(0,0,0,0.38)]">
        <div className="grid gap-6 p-5 md:p-7 lg:grid-cols-[1fr_18rem] lg:items-center">
          <div className="flex min-w-0 items-center gap-4 md:gap-5">
            <PlayerPhoto player={player} size="hero" />
            <div className="min-w-0">
              <p className="wc-kicker">Player profile</p>
              <h1 className="mt-2 truncate font-sans text-4xl font-black leading-tight tracking-normal text-wc-fg1 md:text-6xl">
                {player.name}
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-black">
                <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-wc-fg2">
                  {getPositionLabel(player.position)}
                </span>
                <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-wc-fg2">
                  חולצה {player.shirt_number ?? "-"}
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
              <p className="mt-4 max-w-2xl text-sm leading-7 text-wc-fg2">
                פרופיל שחקן בסיסי שמוכן להתרחב עם נתוני BSD: תמונה, נבחרת, מספר חולצה, סטטיסטיקה ויחסים.
              </p>
            </div>
          </div>

          <div className="rounded-[1.35rem] border border-white/10 bg-black/18 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-wc-fg3">
              יחס מלך שערים
            </p>
            <p className="mt-2 font-sans text-4xl font-black tracking-normal text-wc-neon">
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

      <section className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="שערים" value={String(player.goals ?? 0)} />
        <MetricCard label="בישולים" value={String(player.assists ?? 0)} />
        <MetricCard label="הופעות" value={String(player.appearances ?? 0)} />
        <MetricCard label="דקות" value={String(player.minutes_played ?? 0)} />
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-4 md:p-5">
          <SectionHeader title="משמעת" eyebrow="כרטיסים" />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <MetricCard label="צהובים" value={String(player.yellow_cards ?? 0)} tone="amber" />
            <MetricCard label="אדומים" value={String(player.red_cards ?? 0)} tone="red" />
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-4 md:p-5">
          <SectionHeader title="סנכרון API" eyebrow="BSD" />
          <div className="mt-4 grid gap-3">
            <InfoRow label="מזהה BSD" value={player.bzzoiro_player_id ?? "לא סונכרן"} />
            <InfoRow label="תמונה" value={player.photo_url ? "זמינה" : "לא זמינה"} />
            <InfoRow label="עודכן לאחרונה" value={player.bzzoiro_synced_at ? formatDate(player.bzzoiro_synced_at) : "טרם עודכן"} />
            <InfoRow label="נבחרת" value={teamName} />
          </div>
        </section>
      </div>
    </div>
  );
}

function PlayerPhoto({ player, size }: { player: PlayerRecord; size: "hero" }) {
  const imageSize = size === "hero" ? 144 : 80;

  return (
    <div className="grid h-36 w-36 shrink-0 place-items-center overflow-hidden rounded-[2rem] border border-white/12 bg-[linear-gradient(135deg,rgba(95,255,123,0.16),rgba(111,60,255,0.28))] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
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
        <span className="font-sans text-5xl font-black text-wc-fg1">{getInitials(player.name)}</span>
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
      <p className={`mt-2 font-sans text-3xl font-black tracking-normal ${toneClass}`}>{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/14 px-4 py-3">
      <span className="text-sm font-bold text-wc-fg2">{label}</span>
      <span className="truncate text-sm font-black text-wc-fg1">{value}</span>
    </div>
  );
}

function parsePlayerId(value: string) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : value;
}

function getPositionLabel(position: string | null) {
  if (!position) return "שחקן";
  const normalized = position.trim().toLowerCase();
  if (normalized === "g") return "שוער";
  if (normalized === "d") return "הגנה";
  if (normalized === "m") return "קישור";
  if (normalized === "f") return "התקפה";
  if (normalized.includes("goal")) return "שוער";
  if (normalized.includes("def")) return "הגנה";
  if (normalized.includes("mid")) return "קישור";
  if (normalized.includes("att") || normalized.includes("for")) return "התקפה";
  return position;
}

function formatOdds(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "טרם עודכן";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "טרם עודכן";
  return numeric.toFixed(2);
}

function formatDate(iso: string) {
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

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.slice(0, 1))
    .join("")
    .toUpperCase();
}
