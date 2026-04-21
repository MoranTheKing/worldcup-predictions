import Link from "next/link";

const HIGHLIGHTS = [
  "תצוגת טורניר חיה עם בתים ונוקאאוט",
  "ליגות פרטיות, רצפים ותגי הישג",
  "חוויית מובייל פרימיום ב-RTL מלא",
];

export default function Home() {
  return (
    <main className="wc-page">
      <div className="wc-shell flex min-h-screen items-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid w-full gap-6 lg:grid-cols-[1.12fr_0.88fr] lg:items-center">
          <section className="text-center lg:text-start">
            <div className="wc-badge mx-auto w-fit text-sm text-wc-fg2 lg:mx-0">
              <span className="text-base text-wc-neon">⚽</span>
              <span>World Cup 2026 Predictions PWA</span>
            </div>

            <h1 className="wc-display mt-6 text-5xl leading-none text-wc-fg1 sm:text-6xl lg:text-7xl">
              מונדיאל 2026
            </h1>
            <p className="mt-3 text-xl font-semibold text-wc-magenta sm:text-2xl">
              חוויית תחזיות יוקרתית, תחרותית וממכרת
            </p>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-wc-fg2 lg:mx-0">
              בנה ליגות, נחש תוצאות, רדוף אחרי רצפים חמים ועקוב אחרי טבלאות וטורניר בעיצוב
              פרימיום שמותאם לעברית ולמובייל מהשנייה הראשונה.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              <Link href="/login" className="wc-button-primary min-w-36 px-6 py-3.5 text-sm">
                התחברות
              </Link>
              <Link href="/signup" className="wc-button-secondary min-w-36 px-6 py-3.5 text-sm">
                הרשמה
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm text-wc-fg2 lg:justify-start">
              {HIGHLIGHTS.map((item) => (
                <div key={item} className="wc-badge">
                  <span className="text-wc-neon">•</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="wc-card relative overflow-hidden p-6 sm:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(111,60,255,0.26),_transparent_46%),radial-gradient(circle_at_bottom_left,_rgba(255,47,166,0.18),_transparent_34%)]" />
            <div className="relative">
              <div className="wc-kicker">Matchday Experience</div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="wc-panel p-5">
                  <p className="text-sm text-wc-fg2">שלב בתים</p>
                  <p className="wc-display mt-2 text-4xl text-wc-neon">12</p>
                  <p className="mt-2 text-sm text-wc-fg3">בתים צבעוניים עם דירוגים ברורים ועלייה חיה</p>
                </div>
                <div className="wc-panel p-5">
                  <p className="text-sm text-wc-fg2">נוקאאוט</p>
                  <p className="wc-display mt-2 text-4xl text-wc-magenta">32</p>
                  <p className="mt-2 text-sm text-wc-fg3">בראקט אופקי מרשים שמרגיש כמו אפליקציית ספורט מובילה</p>
                </div>
              </div>

              <div className="mt-4 wc-panel p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="text-start">
                    <p className="text-sm text-wc-fg2">סטטוס עיצוב</p>
                    <p className="mt-2 text-lg font-bold text-wc-fg1">
                      שכבת הבסיס מוכנה לשדרוג מלא של הדאשבורד
                    </p>
                  </div>
                  <div className="wc-display text-5xl text-wc-amber">26</div>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/8">
                  <div className="h-full w-2/3 rounded-full bg-[linear-gradient(90deg,var(--wc-neon),var(--wc-magenta))]" />
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
