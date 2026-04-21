export default function DashboardPage() {
  return (
    <div className="wc-shell px-4 py-4 md:px-6 md:py-6">
      <section className="wc-card overflow-hidden p-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="text-start">
            <p className="wc-kicker">Match Center</p>
            <h1 className="wc-display mt-3 text-5xl text-wc-fg1">משחקים</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-wc-fg2">
              מסך המשחקים יקבל בהמשך לוח חי, כרטיסי תחזית ושכבת gamification מלאה. כרגע חיזקתי
              את מבנה ה-shell והוויזואל הבסיסי כדי שהמשך הבנייה יהיה עקבי.
            </p>
          </div>

          <div className="grid gap-3 text-start sm:grid-cols-2">
            <div className="wc-panel p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-wc-fg3">שלב ראשון</p>
              <p className="mt-3 text-sm font-bold text-wc-fg1">כרטיסי משחק חיים</p>
            </div>
            <div className="wc-panel p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-wc-fg3">תגמול</p>
              <p className="mt-3 text-sm font-bold text-wc-fg1">ניקוד, ג׳וקר ומכפיל הפתעה</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-[1.75rem] border border-[rgba(255,182,73,0.2)] bg-[linear-gradient(135deg,rgba(255,182,73,0.14),rgba(111,60,255,0.08))] p-5">
        <p className="text-sm font-bold text-wc-amber">שיטת הניקוד</p>
        <div className="mt-3 grid gap-2 text-sm text-[rgba(255,182,73,0.92)] sm:grid-cols-2">
          <span>תוצאה נכונה: 2–10 נקודות לפי שלב</span>
          <span>תוצאה מדויקת: 5–20 נקודות</span>
          <span>ג׳וקר: כפול 3 על תוצאה מדויקת</span>
          <span>מכפיל הפתעה: עד כפול 2 לפי מסלול</span>
        </div>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="wc-card flex animate-pulse flex-col gap-4 p-5">
            <div className="flex items-center justify-between">
              <div className="h-3 w-24 rounded-full bg-white/10" />
              <div className="h-3 w-12 rounded-full bg-white/10" />
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-1 items-center gap-2">
                <div className="h-5 w-8 rounded-md bg-white/10" />
                <div className="h-3 w-16 rounded-full bg-white/10" />
              </div>
              <div className="wc-display text-xl text-wc-fg3">VS</div>
              <div className="flex flex-1 items-center justify-end gap-2">
                <div className="h-3 w-16 rounded-full bg-white/10" />
                <div className="h-5 w-8 rounded-md bg-white/10" />
              </div>
            </div>
            <div className="h-11 rounded-2xl bg-white/10" />
          </div>
        ))}
      </section>

      <p className="mt-6 text-center text-xs text-wc-fg3">
        המשחקים יסונכרנו מ-api-football.com עם פתיחת הטורניר ב-11 ביוני 2026
      </p>
    </div>
  );
}
