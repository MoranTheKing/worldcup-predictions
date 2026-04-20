// /dashboard/leagues — League management (create + join)

export default function LeaguesPage() {
  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-zinc-50">הליגות שלי</h1>
        <p className="text-sm text-zinc-500 mt-0.5">התחרה מול חברים בליגות פרטיות</p>
      </div>

      {/* Action cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <button className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 px-5 py-5 flex items-start gap-4 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-right">
          <span className="text-3xl mt-0.5">➕</span>
          <div>
            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50">יצירת ליגה חדשה</p>
            <p className="text-xs text-zinc-500 mt-1">קבל קוד הצטרפות ייחודי לשתף עם חברים</p>
          </div>
        </button>
        <button className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 px-5 py-5 flex items-start gap-4 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-right">
          <span className="text-3xl mt-0.5">🔑</span>
          <div>
            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50">הצטרפות לליגה</p>
            <p className="text-xs text-zinc-500 mt-1">הזן קוד הצטרפות שקיבלת מחבר</p>
          </div>
        </button>
      </div>

      {/* Empty state */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 p-10 flex flex-col items-center gap-3 text-center">
        <span className="text-5xl">🏅</span>
        <p className="text-base font-semibold text-zinc-700 dark:text-zinc-300">עדיין לא הצטרפת לאף ליגה</p>
        <p className="text-sm text-zinc-400 max-w-sm">
          הניחושים שלך חלים על כל הליגות שאתה חבר בהן — מנחש פעם אחת, מתחרה בכולן
        </p>
      </div>
    </div>
  );
}
