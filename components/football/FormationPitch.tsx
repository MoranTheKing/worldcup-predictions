import Image from "next/image";
import PlayerLink from "@/components/PlayerLink";
import { formatFormation, type FootballFormationLine } from "@/lib/football/formation";

export type FormationPitchPlayer = {
  id: number | string;
  name: string;
  position?: string | null;
  photo_url?: string | null;
  shirt_number?: number | string | null;
  top_scorer_odds?: number | string | null;
  isLocal?: boolean;
  match_goals?: number | null;
  match_assists?: number | null;
  match_yellow_cards?: number | null;
  match_red_cards?: number | null;
};

export function FormationBadge({ value, label = "מערך" }: { value: string | null | undefined; label?: string }) {
  return (
    <span className="inline-grid grid-cols-[auto_auto] items-center gap-1.5 rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs font-black text-wc-fg2">
      <span>{label}</span>
      <span dir="ltr" className="font-sans tracking-normal text-wc-fg1">
        {formatFormation(value)}
      </span>
    </span>
  );
}

export default function FormationPitch({
  lines,
  formationName,
  source,
  compact = false,
}: {
  lines: Array<FootballFormationLine<FormationPitchPlayer>>;
  formationName?: string | null;
  source?: string | null;
  compact?: boolean;
}) {
  const pitchHeight = compact ? "min-h-[31rem]" : "min-h-[38rem]";
  const innerHeight = compact ? "min-h-[29rem]" : "min-h-[36rem]";

  return (
    <div className="mt-4 overflow-hidden rounded-[1.45rem] border border-[rgba(95,255,123,0.18)] bg-[radial-gradient(circle_at_50%_0%,rgba(95,255,123,0.13),transparent_34%),linear-gradient(180deg,rgba(16,83,54,0.34),rgba(5,8,18,0.96))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
        <FormationBadge value={formationName} />
        {source ? <span className="text-xs font-bold text-wc-fg3">{source}</span> : null}
      </div>

      <div className={`relative overflow-hidden rounded-[1.2rem] border border-white/16 bg-[linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.045)_1px,transparent_1px)] bg-[length:4.5rem_4.5rem] p-3 ${pitchHeight}`}>
        <div className="absolute inset-x-[18%] top-1/2 h-20 -translate-y-1/2 rounded-full border border-white/14" />
        <div className="absolute inset-x-[31%] top-3 h-16 rounded-b-[2.5rem] border-x border-b border-white/14" />
        <div className="absolute inset-x-[31%] bottom-3 h-16 rounded-t-[2.5rem] border-x border-t border-white/14" />
        <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/8" />

        <div className={`relative z-10 flex h-full flex-col justify-between gap-3 ${innerHeight}`}>
          {lines.map((line) => (
            <div key={line.key}>
              <p className="mb-2 text-center text-[10px] font-black uppercase tracking-[0.14em] text-white/55">
                {line.label}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 md:gap-2.5">
                {line.players.map((player) => (
                  <PlayerToken key={player.id} player={player} compact={compact} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PlayerToken({ player, compact }: { player: FormationPitchPlayer; compact: boolean }) {
  const eventBadges = getPlayerEventBadges(player);
  const content = (
    <div className={`${compact ? "w-[5.15rem]" : "w-[5.85rem]"} rounded-[1rem] border border-white/12 bg-black/36 px-2 py-2 text-center shadow-[0_10px_24px_rgba(0,0,0,0.24)] backdrop-blur transition hover:border-wc-neon/40 hover:bg-white/[0.07]`}>
      <PlayerAvatar player={player} compact={compact} />
      <p
        className="mx-auto mt-2 min-h-[2rem] max-w-full overflow-hidden text-[11px] font-black leading-4 text-wc-fg1"
        dir="auto"
        style={{
          display: "-webkit-box",
          WebkitBoxOrient: "vertical",
          WebkitLineClamp: 2,
          unicodeBidi: "plaintext",
        }}
        title={player.name}
      >
        {player.name}
      </p>
      <p className="mt-0.5 text-[10px] font-bold text-wc-fg3">{formatPosition(player.position)}</p>
      {player.shirt_number ? (
        <p className="mt-1 font-sans text-[10px] font-black tracking-normal text-wc-neon" dir="ltr">
          #{player.shirt_number}
        </p>
      ) : null}
      {eventBadges.length > 0 ? (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
          {eventBadges.map((badge) => (
            <span
              key={badge.key}
              className={`inline-flex h-7 min-w-7 items-center justify-center gap-1 rounded-full border px-2 text-[10px] font-black leading-none ${badge.className}`}
              title={badge.title}
              aria-label={badge.title}
              dir="ltr"
            >
              <EventBadgeSymbol kind={badge.kind} />
              {badge.count > 1 ? <span className="font-sans tracking-normal">×{badge.count}</span> : null}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );

  return player.isLocal === false ? content : (
    <PlayerLink player={player} className="block">
      {content}
    </PlayerLink>
  );
}

function getPlayerEventBadges(player: FormationPitchPlayer) {
  const badges: Array<{ key: string; kind: EventBadgeKind; count: number; title: string; className: string }> = [];
  const goals = readPositiveCount(player.match_goals);
  const assists = readPositiveCount(player.match_assists);
  const rawYellowCards = readPositiveCount(player.match_yellow_cards);
  const rawRedCards = readPositiveCount(player.match_red_cards);
  const redCards = rawRedCards > 0 || rawYellowCards >= 2 ? Math.max(1, rawRedCards) : 0;
  const yellowCards = redCards > 0 ? 0 : rawYellowCards;

  if (goals > 0) {
    badges.push({
      key: "goals",
      kind: "goal",
      count: goals,
      title: goals > 1 ? `${goals} שערים במשחק` : "שער במשחק",
      className: "border-wc-neon/45 bg-wc-neon/16 text-wc-neon shadow-[0_0_18px_rgba(95,255,123,0.18)]",
    });
  }

  if (assists > 0) {
    badges.push({
      key: "assists",
      kind: "assist",
      count: assists,
      title: assists > 1 ? `${assists} בישולים במשחק` : "בישול במשחק",
      className: "border-cyan-300/35 bg-cyan-300/13 text-cyan-100 shadow-[0_0_14px_rgba(103,232,249,0.12)]",
    });
  }

  if (yellowCards > 0) {
    badges.push({
      key: "yellow",
      kind: "yellow",
      count: yellowCards,
      title: yellowCards > 1 ? `${yellowCards} צהובים במשחק` : "כרטיס צהוב במשחק",
      className: "border-wc-amber/38 bg-wc-amber/13 text-wc-amber",
    });
  }

  if (redCards > 0) {
    badges.push({
      key: "red",
      kind: "red",
      count: redCards,
      title: redCards > 1 ? `${redCards} אדומים במשחק` : "כרטיס אדום במשחק",
      className: "border-wc-danger/38 bg-wc-danger/13 text-wc-danger",
    });
  }

  return badges;
}

type EventBadgeKind = "goal" | "assist" | "yellow" | "red";

function EventBadgeSymbol({ kind }: { kind: EventBadgeKind }) {
  if (kind === "goal") {
    return <span aria-hidden="true">⚽</span>;
  }

  if (kind === "assist") {
    return <span aria-hidden="true">👟</span>;
  }

  if (kind === "yellow") {
    return <span aria-hidden="true" className="h-3.5 w-2.5 rounded-[2px] bg-wc-amber shadow-[0_0_10px_rgba(255,199,77,0.35)]" />;
  }

  return <span aria-hidden="true" className="h-3.5 w-2.5 rounded-[2px] bg-wc-danger shadow-[0_0_10px_rgba(255,92,130,0.35)]" />;
}

function readPositiveCount(value: number | null | undefined) {
  const count = Number(value ?? 0);
  return Number.isFinite(count) && count > 0 ? Math.round(count) : 0;
}

function PlayerAvatar({ player, compact }: { player: FormationPitchPlayer; compact: boolean }) {
  const size = compact ? 42 : 48;

  return (
    <div
      className="relative mx-auto shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(95,255,123,0.16),rgba(111,60,255,0.24))]"
      style={{ width: size, height: size }}
    >
      {player.photo_url ? (
        <Image
          src={player.photo_url}
          alt={player.name}
          width={size}
          height={size}
          style={{ width: size, height: size }}
          className="h-full w-full object-cover"
          unoptimized
        />
      ) : (
        <span className="grid h-full w-full place-items-center font-sans text-base font-black tracking-normal text-wc-fg1">
          {getInitials(player.name)}
        </span>
      )}
    </div>
  );
}

function formatPosition(position: string | null | undefined) {
  if (!position) return "שחקן";
  const value = position.trim().toLowerCase();
  if (value === "g" || value === "gk" || value.includes("goal") || value.includes("keeper")) return "שוער";
  if (value === "d" || value.includes("def") || value.includes("back")) return "הגנה";
  if (value === "m" || value.includes("mid")) return "קישור";
  if (value === "f" || value.includes("att") || value.includes("for") || value.includes("wing") || value.includes("striker")) return "התקפה";
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
