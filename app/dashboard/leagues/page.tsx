// /dashboard/leagues — League management (placeholder)
// Pure server component — no event handlers

export default function LeaguesPage() {
  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <div className="mb-6">
        <h1
          className="text-2xl md:text-3xl font-black"
          style={{ fontFamily: "var(--font-display)", color: "var(--wc-fg1)" }}
        >
          הליגות שלי
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--wc-fg2)" }}>
          התחרה מול חברים בליגות פרטיות
        </p>
      </div>

      {/* Action cards — no JS hover, pure CSS via style tag */}
      <style>{`
        .league-card {
          background: var(--wc-surface);
          border: 1px solid var(--wc-border);
          border-radius: 16px;
          padding: 20px;
          display: flex;
          align-items: flex-start;
          gap: 16px;
          text-align: right;
          transition: border-color 150ms, background 150ms;
          cursor: pointer;
          width: 100%;
        }
        .league-card:hover {
          background: var(--wc-raised);
          border-color: var(--wc-neon);
        }
      `}</style>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {[
          { icon: "➕", title: "יצירת ליגה חדשה", sub: "קבל קוד הצטרפות ייחודי לשתף עם חברים" },
          { icon: "🔑", title: "הצטרפות לליגה",   sub: "הזן קוד הצטרפות שקיבלת מחבר" },
        ].map(({ icon, title, sub }) => (
          <button key={title} className="league-card">
            <span className="text-3xl mt-0.5">{icon}</span>
            <div>
              <p className="text-sm font-bold" style={{ color: "var(--wc-fg1)" }}>{title}</p>
              <p className="text-xs mt-1" style={{ color: "var(--wc-fg2)" }}>{sub}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Empty state */}
      <div
        className="rounded-2xl p-10 flex flex-col items-center gap-3 text-center"
        style={{ background: "var(--wc-surface)", border: "1.5px dashed var(--wc-border)" }}
      >
        <span className="text-5xl">🏅</span>
        <p className="text-base font-semibold" style={{ color: "var(--wc-fg2)" }}>
          עדיין לא הצטרפת לאף ליגה
        </p>
        <p className="text-sm max-w-sm" style={{ color: "var(--wc-fg3)" }}>
          הניחושים שלך חלים על כל הליגות שאתה חבר בהן — מנחש פעם אחת, מתחרה בכולן
        </p>
      </div>
    </div>
  );
}
