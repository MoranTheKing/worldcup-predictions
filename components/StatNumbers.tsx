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
        <b className="font-black tabular-nums">{goalsFor}</b> זכות
      </span>
      <span
        className={`rounded-full px-2 py-1 ${
          highlight === "against"
            ? "bg-[rgba(255,92,130,0.12)] text-wc-danger"
            : "bg-white/6 text-wc-fg2"
        }`}
      >
        <b className="font-black tabular-nums">{goalsAgainst}</b> חובה
      </span>
    </span>
  );
}
