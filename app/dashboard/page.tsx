// /dashboard — Matches tab (placeholder until api-football.com sync)

export default function DashboardPage() {
  return (
    <div className="p-4 md:p-8 max-w-5xl">

      {/* Header */}
      <div className="mb-6">
        <h1
          className="text-2xl md:text-3xl font-black"
          style={{ fontFamily: "var(--font-display)", color: "var(--wc-fg1)" }}
        >
          משחקים
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--wc-fg2)" }}>
          ניחש תוצאות ואסוף נקודות
        </p>
      </div>

      {/* Scoring info */}
      <div
        className="rounded-2xl p-4 md:p-5 mb-6"
        style={{
          background: "var(--wc-gold-bg)",
          border: "1px solid rgba(245,197,24,0.2)",
        }}
      >
        <p className="text-sm font-bold mb-2" style={{ color: "var(--wc-gold)" }}>
          שיטת הניקוד
        </p>
        <div
          className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs"
          style={{ color: "rgba(245,197,24,0.8)" }}
        >
          <span>✓ תוצאה נכונה: 2–10 נקודות (לפי שלב)</span>
          <span>✓ תוצאה מדויקת: 5–20 נקודות</span>
          <span>✓ ג׳וקר: ×3 על תוצאה מדויקת</span>
          <span>✓ מכפיל הפתעה: עד ×2 לפי מסלול</span>
        </div>
      </div>

      {/* Skeleton match cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl p-4 flex flex-col gap-3 animate-pulse"
            style={{ background: "var(--wc-surface)", border: "1px solid var(--wc-border)" }}
          >
            <div className="flex items-center justify-between">
              <div className="h-3 w-20 rounded" style={{ background: "var(--wc-raised)" }} />
              <div className="h-3 w-12 rounded" style={{ background: "var(--wc-raised)" }} />
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1">
                <div className="w-7 h-5 rounded" style={{ background: "var(--wc-raised)" }} />
                <div className="h-3 w-16 rounded" style={{ background: "var(--wc-raised)" }} />
              </div>
              <div className="text-xs font-bold" style={{ color: "var(--wc-fg3)" }}>vs</div>
              <div className="flex items-center gap-2 flex-1 justify-end">
                <div className="h-3 w-16 rounded" style={{ background: "var(--wc-raised)" }} />
                <div className="w-7 h-5 rounded" style={{ background: "var(--wc-raised)" }} />
              </div>
            </div>
            <div className="h-8 rounded-xl" style={{ background: "var(--wc-raised)" }} />
          </div>
        ))}
      </div>

      <p className="text-xs text-center" style={{ color: "var(--wc-fg3)" }}>
        משחקים יסונכרנו מ-api-football.com עם פתיחת הטורניר — 11 ביוני 2026
      </p>
    </div>
  );
}
