export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <main className="flex flex-col items-center gap-6 text-center px-6">
        <div className="text-6xl">⚽</div>
        <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-50">
          תחזיות מונדיאל 2026
        </h1>
        <p className="text-lg text-zinc-500 dark:text-zinc-400 max-w-sm">
          נבנה בקרוב — התחבר כדי להתחיל לתזמן תחזיות
        </p>
        <div className="flex gap-3 mt-4">
          <a
            href="/login"
            className="px-6 py-3 rounded-full bg-zinc-900 text-white font-medium hover:bg-zinc-700 transition-colors dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            התחברות
          </a>
          <a
            href="/signup"
            className="px-6 py-3 rounded-full border border-zinc-300 font-medium hover:bg-zinc-100 transition-colors dark:border-zinc-700 dark:hover:bg-zinc-800 dark:text-zinc-50"
          >
            הרשמה
          </a>
        </div>
      </main>
    </div>
  );
}
