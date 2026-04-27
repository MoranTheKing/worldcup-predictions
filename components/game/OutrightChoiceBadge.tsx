"use client";

import Image from "next/image";
import TeamLink from "@/components/TeamLink";

export type OutrightChoiceBadgeProps = {
  kind: "winner" | "topScorer";
  label?: string;
  value: string | null;
  teamId?: string | null;
  logoUrl?: string | null;
  locked?: boolean;
  hidden?: boolean;
  compact?: boolean;
  size?: "default" | "hero";
};

export default function OutrightChoiceBadge({
  kind,
  label,
  value,
  teamId = null,
  logoUrl = null,
  locked = false,
  hidden = false,
  compact = false,
  size = "default",
}: OutrightChoiceBadgeProps) {
  const hero = size === "hero";
  const shellClassName = compact
    ? "px-3 py-2"
    : hero
      ? "px-4 py-4"
      : "px-4 py-3";
  const rowClassName = compact ? "text-xs" : hero ? "text-lg" : "text-sm";

  if (hidden) {
    return (
      <div className={`rounded-[1.1rem] border border-white/10 bg-white/5 ${shellClassName}`}>
        {label ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-wc-fg3">
            {label}
          </p>
        ) : null}
        <div className={`mt-2 flex items-center gap-2 font-bold text-wc-fg3 ${rowClassName}`}>
          <span
            className={`inline-flex items-center justify-center rounded-full bg-white/8 ${
              hero ? "h-8 w-8 text-base" : "h-7 w-7 text-sm"
            }`}
          >
            🔒
          </span>
          <span>Hidden</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-[1.2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${shellClassName}`}
    >
      {label ? (
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-wc-fg3">{label}</p>
      ) : null}
      {kind === "winner" && teamId && value ? (
        <TeamLink
          team={{ id: teamId, name: value, name_he: value, logo_url: logoUrl }}
          className={`mt-2 flex items-center gap-2 font-bold text-wc-fg1 transition hover:text-wc-neon ${rowClassName}`}
          onClick={(event) => event.stopPropagation()}
        >
          <ChoiceIcon kind={kind} logoUrl={logoUrl} size={size} compact={compact} />
          <span className="truncate">{value}</span>
          <LockIcon locked={locked} compact={compact} hero={hero} />
        </TeamLink>
      ) : (
        <div className={`mt-2 flex items-center gap-2 font-bold text-wc-fg1 ${rowClassName}`}>
          <ChoiceIcon kind={kind} logoUrl={logoUrl} size={size} compact={compact} />
          <span className="truncate">{value ?? "לא נבחר"}</span>
          <LockIcon locked={locked} compact={compact} hero={hero} />
        </div>
      )}
    </div>
  );
}

function LockIcon({
  locked,
  compact,
  hero,
}: {
  locked: boolean;
  compact: boolean;
  hero: boolean;
}) {
  if (!locked) return null;

  return (
    <span
      className={`ms-auto inline-flex items-center justify-center rounded-full bg-white/8 px-1.5 text-wc-gold ${
        compact ? "h-6 min-w-6 text-[11px]" : hero ? "h-8 min-w-8 text-sm" : "h-6 min-w-6 text-[11px]"
      }`}
    >
      🔒
    </span>
  );
}

function ChoiceIcon({
  kind,
  logoUrl,
  size,
  compact,
}: {
  kind: "winner" | "topScorer";
  logoUrl: string | null;
  size: "default" | "hero";
  compact: boolean;
}) {
  const hero = size === "hero";

  if (kind === "winner" && logoUrl) {
    return (
      <Image
        src={logoUrl}
        alt=""
        width={hero ? 40 : 22}
        height={hero ? 28 : 16}
        className={`flex-shrink-0 rounded-[4px] object-cover ${
          hero ? "h-7 w-10" : "h-4 w-[22px]"
        }`}
        style={{ height: hero ? 28 : 16, width: hero ? 40 : 22 }}
        unoptimized
      />
    );
  }

  if (kind === "winner") {
    return (
      <span
        className={`flex-shrink-0 rounded-[4px] bg-white/8 ${
          hero ? "h-7 w-10" : "h-4 w-[22px]"
        }`}
      />
    );
  }

  return (
    <span
      className={`inline-flex flex-shrink-0 items-center justify-center rounded-full bg-white/8 text-wc-fg2 ${
        compact ? "h-6 w-6" : hero ? "h-10 w-10" : "h-6 w-6"
      }`}
    >
      <svg
        viewBox="0 0 20 20"
        className={`${hero ? "h-5 w-5" : "h-3.5 w-3.5"} fill-current`}
        aria-hidden="true"
      >
        <path d="M10 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm0 1.5c-3.05 0-5.75 1.54-6.77 3.86-.19.44.13.94.61.94h12.32c.48 0 .8-.5.61-.94C15.75 13.04 13.05 11.5 10 11.5Z" />
      </svg>
    </span>
  );
}
