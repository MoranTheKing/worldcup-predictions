export function SignedNumber({
  value,
  className = "",
}: {
  value: number;
  className?: string;
}) {
  const formatted = value > 0 ? `+${value}` : String(value);

  return (
    <span
      dir="ltr"
      className={`inline-block tabular-nums ${className}`}
      style={{ unicodeBidi: "isolate" }}
    >
      {formatted}
    </span>
  );
}

export function GoalsForAgainst({
  goalsFor,
  goalsAgainst,
  highlight = "none",
}: {
  goalsFor: number;
  goalsAgainst: number;
  highlight?: "for" | "against" | "none";
}) {
  return (
    <span className="inline-flex items-center justify-center gap-1.5 text-xs" dir="rtl">
      <span
        className={`rounded-full px-2 py-1 ${
          highlight === "for"
            ? "bg-[rgba(95,255,123,0.12)] text-wc-neon"
            : "bg-white/6 text-wc-fg2"
        }`}
      >
        <b className="font-black tabular-nums">{goalsFor}</b> בעד
      </span>
      <span
        className={`rounded-full px-2 py-1 ${
          highlight === "against"
            ? "bg-[rgba(255,92,130,0.12)] text-wc-danger"
            : "bg-white/6 text-wc-fg2"
        }`}
      >
        <b className="font-black tabular-nums">{goalsAgainst}</b> נגד
      </span>
    </span>
  );
}

export function RecordBreakdown({
  wins,
  draws,
  losses,
  compact = false,
}: {
  wins: number;
  draws: number;
  losses: number;
  compact?: boolean;
}) {
  return (
    <span className={`inline-grid grid-cols-3 overflow-hidden rounded-xl border border-white/10 bg-white/[0.035] text-center ${compact ? "text-[10px]" : "text-xs"}`}>
      <RecordCell label="נצחונות" value={wins} tone="win" compact={compact} />
      <RecordCell label="תיקו" value={draws} tone="draw" compact={compact} />
      <RecordCell label="הפסדים" value={losses} tone="loss" compact={compact} />
    </span>
  );
}

function RecordCell({
  label,
  value,
  tone,
  compact,
}: {
  label: string;
  value: number;
  tone: "win" | "draw" | "loss";
  compact: boolean;
}) {
  const toneClass = tone === "win"
    ? "text-wc-neon"
    : tone === "draw"
      ? "text-wc-amber"
      : "text-wc-danger";

  return (
    <span className="min-w-0 border-e border-white/10 px-2 py-1.5 last:border-e-0">
      <b className={`block font-sans font-black tracking-normal ${compact ? "text-sm" : "text-lg"} ${toneClass}`} dir="ltr">
        {value}
      </b>
      <span className="block truncate font-bold text-wc-fg3">{label}</span>
    </span>
  );
}
