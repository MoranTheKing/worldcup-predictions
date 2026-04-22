"use client";

import Image from "next/image";

export type OutrightChoiceBadgeProps = {
  kind: "winner" | "topScorer";
  label?: string;
  value: string | null;
  logoUrl?: string | null;
  locked?: boolean;
  hidden?: boolean;
  compact?: boolean;
};

export default function OutrightChoiceBadge({
  kind,
  label,
  value,
  logoUrl = null,
  locked = false,
  hidden = false,
  compact = false,
}: OutrightChoiceBadgeProps) {
  if (hidden) {
    return (
      <div
        className={`rounded-[1.1rem] border border-white/10 bg-white/5 ${
          compact ? "px-3 py-2" : "px-4 py-3"
        }`}
      >
        {label ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-wc-fg3">
            {label}
          </p>
        ) : null}
        <div className={`mt-2 flex items-center gap-2 ${compact ? "text-xs" : "text-sm"} font-bold text-wc-fg3`}>
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/8 text-sm">
            🔒
          </span>
          <span>Hidden</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-[1.2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${
        compact ? "px-3 py-2" : "px-4 py-3"
      }`}
    >
      {label ? (
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-wc-fg3">{label}</p>
      ) : null}
      <div className={`mt-2 flex items-center gap-2 ${compact ? "text-xs" : "text-sm"} font-bold text-wc-fg1`}>
        <ChoiceIcon kind={kind} logoUrl={logoUrl} />
        <span className="truncate">{value ?? "לא נבחר"}</span>
        {locked ? (
          <span className="ms-auto inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-white/8 px-1.5 text-[11px] text-wc-gold">
            🔒
          </span>
        ) : null}
      </div>
    </div>
  );
}

function ChoiceIcon({
  kind,
  logoUrl,
}: {
  kind: "winner" | "topScorer";
  logoUrl: string | null;
}) {
  if (kind === "winner" && logoUrl) {
    return (
      <Image
        src={logoUrl}
        alt=""
        width={22}
        height={16}
        className="h-4 w-[22px] flex-shrink-0 rounded-[4px] object-cover"
        unoptimized
      />
    );
  }

  if (kind === "winner") {
    return <span className="h-4 w-[22px] flex-shrink-0 rounded-[4px] bg-white/8" />;
  }

  return (
    <span className="inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white/8 text-wc-fg2">
      <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 fill-current" aria-hidden="true">
        <path d="M10 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm0 1.5c-3.05 0-5.75 1.54-6.77 3.86-.19.44.13.94.61.94h12.32c.48 0 .8-.5.61-.94C15.75 13.04 13.05 11.5 10 11.5Z" />
      </svg>
    </span>
  );
}
