// /dashboard — Matches tab
// Placeholder until match data is synced from api-football.com

export default function DashboardPage() {
  return (
    <div className="p-4 md:p-8 max-w-5xl">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-zinc-50">משחקים</h1>
        <p className="text-sm text-zinc-500 mt-0.5">ניחש תוצאות ואסוף נקודות</p>
      </div>

      {/* Scoring info card */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 md:p-5 mb-6">
        <p className="text-sm font-bold text-amber-800 dark:text-amber-400 mb-2">שיטת הניקוד</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-amber-700 dark:text-amber-400">
          <span>✓ תוצאה נכונה: 2–10 נקודות (לפי שלב)</span>
          <span>✓ תוצאה מדויקת: 5–20 נקודות</span>
          <span>✓ ג׳וקר: ×3 על תוצאה מדויקת</span>
          <span>✓ מכפיל הפתעה: עד ×2 לפי מסלול</span>
        </div>
      </div>

      {/* Placeholder skeleton cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 flex flex-col gap-3 animate-pulse"
          >
            <div className="flex items-center justify-between">
              <div className="h-3 w-20 bg-zinc-100 dark:bg-zinc-800 rounded" />
              <div className="h-3 w-12 bg-zinc-100 dark:bg-zinc-800 rounded" />
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1">
                <div className="w-7 h-5 bg-zinc-100 dark:bg-zinc-800 rounded" />
                <div className="h-3 w-16 bg-zinc-100 dark:bg-zinc-800 rounded" />
              </div>
              <div className="text-xs font-bold text-zinc-200 dark:text-zinc-700">vs</div>
              <div className="flex items-center gap-2 flex-1 justify-end">
                <div className="h-3 w-16 bg-zinc-100 dark:bg-zinc-800 rounded" />
                <div className="w-7 h-5 bg-zinc-100 dark:bg-zinc-800 rounded" />
              </div>
            </div>
            <div className="h-8 bg-zinc-50 dark:bg-zinc-800 rounded-xl" />
          </div>
        ))}
      </div>

      <p className="text-xs text-zinc-400 text-center">
        משחקים יסונכרנו מ-api-football.com עם פתיחת הטורניר — 11 ביוני 2026
      </p>
    </div>
  );
}
