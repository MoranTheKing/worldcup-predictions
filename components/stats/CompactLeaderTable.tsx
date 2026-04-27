"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { getTeamPageHref } from "@/components/TeamLink";

export type CompactLeaderTeam = {
  id: string;
  name: string;
  name_he?: string | null;
  logo_url?: string | null;
};

export type CompactLeaderRow = {
  id: string;
  title: string;
  subtitle?: string | null;
  href?: string | null;
  imageUrl?: string | null;
  imageAlt?: string;
  team?: CompactLeaderTeam | null;
  metricLabel: string;
  metricValue: string;
  metricTone?: "default" | "green" | "amber" | "red" | "cyan";
};

export default function CompactLeaderTable({
  title,
  eyebrow,
  rows,
  emptyTitle,
  emptyDescription,
}: {
  title: string;
  eyebrow: string;
  rows: CompactLeaderRow[];
  emptyTitle: string;
  emptyDescription: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const visibleRows = useMemo(() => rows.slice(0, expanded ? 10 : 3), [expanded, rows]);
  const canExpand = rows.length > 3;

  return (
    <section className="overflow-hidden rounded-[1.55rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.025))] shadow-[0_18px_46px_rgba(0,0,0,0.22)]">
      <div className="flex items-center justify-between gap-3 border-b border-white/8 bg-white/[0.025] px-4 py-3">
        <div className="min-w-0">
          <p className="wc-kicker text-[0.64rem]">{eyebrow}</p>
          <h2 className="mt-1 truncate font-sans text-xl font-black tracking-normal text-wc-fg1">
            {title}
          </h2>
        </div>
        <span className="shrink-0 rounded-full border border-white/10 bg-white/8 px-2.5 py-1 text-[10px] font-black text-wc-fg3">
          {expanded ? "TOP 10" : "TOP 3"}
        </span>
      </div>

      {visibleRows.length > 0 ? (
        <ol className="divide-y divide-white/7">
          {visibleRows.map((row, index) => (
            <li key={row.id}>
              <LeaderRow row={row} rank={index + 1} />
            </li>
          ))}
        </ol>
      ) : (
        <div className="m-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.035] p-4">
          <p className="text-sm font-black text-wc-fg1">{emptyTitle}</p>
          <p className="mt-1 text-xs leading-6 text-wc-fg3">{emptyDescription}</p>
        </div>
      )}

      {canExpand ? (
        <div className="border-t border-white/8 p-3">
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className="w-full rounded-2xl border border-wc-neon/25 bg-[rgba(95,255,123,0.09)] px-4 py-2.5 text-xs font-black text-wc-neon transition hover:border-wc-neon/45 hover:bg-[rgba(95,255,123,0.15)]"
          >
            {expanded ? "הצג פחות" : "עוד - Top 10"}
          </button>
        </div>
      ) : null}
    </section>
  );
}

function LeaderRow({ row, rank }: { row: CompactLeaderRow; rank: number }) {
  return (
    <div className="grid grid-cols-[2.2rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
      <div className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/8 text-sm font-black text-wc-fg2">
        {rank}
      </div>

      <div className="flex min-w-0 items-center gap-3">
        {row.href ? (
          <Link href={row.href} className="shrink-0 rounded-2xl transition hover:opacity-80">
            <LeaderImage row={row} />
          </Link>
        ) : (
          <LeaderImage row={row} />
        )}
        <div className="min-w-0">
          {row.href ? (
            <Link
              href={row.href}
              className="block truncate text-sm font-black text-wc-fg1 transition hover:text-wc-neon"
            >
              {row.title}
            </Link>
          ) : (
            <div className="truncate text-sm font-black text-wc-fg1">{row.title}</div>
          )}
          <div className="mt-1 flex min-w-0 items-center gap-2 text-[11px] font-semibold text-wc-fg3">
            {row.team ? <TeamChip team={row.team} /> : null}
            {row.subtitle ? <span className="truncate">{row.subtitle}</span> : null}
          </div>
        </div>
      </div>

      <div className={`rounded-2xl border px-3 py-2 text-center ${getMetricClass(row.metricTone)}`}>
        <div className="text-[10px] font-bold uppercase tracking-[0.12em] opacity-80">
          {row.metricLabel}
        </div>
        <div className="mt-0.5 font-sans text-2xl font-black tracking-normal" dir="ltr">
          {row.metricValue}
        </div>
      </div>
    </div>
  );
}

function LeaderImage({ row }: { row: CompactLeaderRow }) {
  const label = row.imageAlt ?? row.title;

  return (
    <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-black/22">
      {row.imageUrl ? (
        <Image
          src={row.imageUrl}
          alt={label}
          width={48}
          height={48}
          className="h-full w-full object-cover"
          style={{ width: 48, height: 48 }}
          unoptimized
        />
      ) : (
        <span className="font-sans text-xl font-black text-wc-fg2">{label.slice(0, 1)}</span>
      )}
    </div>
  );
}

function TeamChip({ team }: { team: CompactLeaderTeam }) {
  const label = team.name_he ?? team.name;

  return (
    <Link
      href={getTeamPageHref(team.id)}
      className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.07] px-2 py-1 transition hover:border-wc-neon/35 hover:text-wc-neon"
    >
      <span className="grid h-4 w-6 shrink-0 place-items-center overflow-hidden rounded bg-white/10">
        {team.logo_url ? (
          <Image
            src={team.logo_url}
            alt={label}
            width={24}
            height={16}
            className="h-full w-full object-cover"
            style={{ width: 24, height: 16 }}
            unoptimized
          />
        ) : (
          <span className="text-[9px] font-black">{label.slice(0, 1)}</span>
        )}
      </span>
      <span className="truncate">{label}</span>
    </Link>
  );
}

function getMetricClass(tone: CompactLeaderRow["metricTone"]) {
  if (tone === "green") {
    return "border-wc-neon/25 bg-[rgba(95,255,123,0.1)] text-wc-neon";
  }
  if (tone === "amber") {
    return "border-wc-amber/25 bg-[rgba(245,197,24,0.1)] text-wc-amber";
  }
  if (tone === "red") {
    return "border-wc-danger/25 bg-[rgba(255,92,130,0.1)] text-wc-danger";
  }
  if (tone === "cyan") {
    return "border-cyan-300/25 bg-cyan-300/10 text-cyan-200";
  }
  return "border-white/10 bg-white/8 text-wc-fg1";
}
