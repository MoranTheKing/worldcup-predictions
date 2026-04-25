import { headers } from "next/headers";
import Link from "next/link";

const PUBLIC_DOMAIN_HOSTS = new Set(["moran65.com", "www.moran65.com"]);

const PUBLIC_DOMAIN = "moran65.com";
const SUPPORT_EMAIL = "support@moran65.com";
const ADMIN_EMAIL = "admin@moran65.com";

const APP_HIGHLIGHTS = [
  "טורניר חי עם בתים, נוקאאוט ופודיום",
  "ליגות פרטיות ותחרות מול חברים",
  "חוויה עברית מלאה למובייל ולדסקטופ",
];

const LANDING_FEATURES = [
  "ניחושי משחקים עם ניקוד ברור",
  "בחירת זוכה, מלך שערים ופרופיל אישי",
  "ליגות פרטיות לחברים ומשפחה",
  "תוצאות וטבלאות בזמן אמת בהמשך",
];

const LANDING_METRICS = [
  { value: "48", label: "נבחרות בטורניר" },
  { value: "104", label: "משחקים עד הגמר" },
  { value: "RTL", label: "עברית מלאה" },
];

export default async function Home() {
  const requestHeaders = await headers();
  const hostname = requestHeaders.get("host")?.split(":")[0]?.toLowerCase() ?? "";

  if (PUBLIC_DOMAIN_HOSTS.has(hostname)) {
    return <PublicLandingHome />;
  }

  return <AppHome />;
}

function AppHome() {
  return (
    <main className="wc-page">
      <div className="wc-shell flex min-h-screen items-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid w-full gap-6 lg:grid-cols-[1.12fr_0.88fr] lg:items-center">
          <section className="text-center lg:text-start">
            <div className="wc-badge mx-auto w-fit text-sm text-wc-fg2 lg:mx-0">
              <span className="text-base text-wc-neon">65</span>
              <span>World Cup 2026 Predictions</span>
            </div>

            <h1 className="wc-display mt-6 text-5xl leading-none text-wc-fg1 sm:text-6xl lg:text-7xl">
              מונדיאל 2026
            </h1>
            <p className="mt-3 text-xl font-semibold text-wc-magenta sm:text-2xl">
              חוויית תחזיות תחרותית, עברית וממכרת
            </p>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-wc-fg2 lg:mx-0">
              בנה ליגות, נחש תוצאות, רדוף אחרי רצפים חמים ועקוב אחרי טבלאות וטורניר בעיצוב
              שמותאם לעברית ולמובייל מהשנייה הראשונה.
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
              {APP_HIGHLIGHTS.map((item) => (
                <div key={item} className="wc-badge">
                  <span className="text-wc-neon">•</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="wc-card relative overflow-hidden p-6 sm:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(95,255,123,0.18),_transparent_44%),radial-gradient(circle_at_bottom_left,_rgba(255,182,73,0.16),_transparent_34%)]" />
            <div className="relative">
              <div className="wc-kicker">Matchday Experience</div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="wc-panel p-5">
                  <p className="text-sm text-wc-fg2">שלב בתים</p>
                  <p className="wc-display mt-2 text-4xl text-wc-neon">12</p>
                  <p className="mt-2 text-sm text-wc-fg3">בתים צבעוניים עם דירוגים ועלייה חיה</p>
                </div>
                <div className="wc-panel p-5">
                  <p className="text-sm text-wc-fg2">נוקאאוט</p>
                  <p className="wc-display mt-2 text-4xl text-wc-magenta">32</p>
                  <p className="mt-2 text-sm text-wc-fg3">בראקט רחב שמרגיש כמו אפליקציית ספורט אמיתית</p>
                </div>
              </div>

              <div className="mt-4 wc-panel p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="text-start">
                    <p className="text-sm text-wc-fg2">סטטוס מוצר</p>
                    <p className="mt-2 text-lg font-bold text-wc-fg1">
                      שכבת הבסיס מוכנה לשדרוגי לייב וסנכרון מלא
                    </p>
                  </div>
                  <div className="wc-display text-5xl text-wc-amber">65</div>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/8">
                  <div className="h-full w-2/3 rounded-full bg-[linear-gradient(90deg,var(--wc-neon),var(--wc-amber))]" />
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function PublicLandingHome() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#020711] text-wc-fg1">
      <section className="relative min-h-screen px-4 py-6 sm:px-6 lg:px-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,rgba(95,255,123,0.22),transparent_24rem),radial-gradient(circle_at_88%_8%,rgba(255,182,73,0.18),transparent_28rem),radial-gradient(circle_at_62%_88%,rgba(40,255,207,0.13),transparent_24rem)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:72px_72px] opacity-45 [mask-image:radial-gradient(circle_at_center,black,transparent_74%)]" />

        <div className="relative mx-auto grid min-h-[calc(100vh-3rem)] max-w-7xl items-center gap-5 lg:grid-cols-[1.08fr_0.92fr]">
          <section className="overflow-hidden rounded-[2.2rem] border border-white/12 bg-[rgba(10,24,42,0.72)] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.46)] backdrop-blur-2xl sm:p-9 lg:p-12">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex items-center gap-3 rounded-full border border-wc-neon/30 bg-wc-neon/8 px-4 py-2 text-sm font-black text-wc-neon">
                <span className="grid size-9 place-items-center rounded-full bg-[linear-gradient(135deg,var(--wc-neon),#28ffcf)] text-[#041009]">
                  M65
                </span>
                <span dir="ltr">{PUBLIC_DOMAIN}</span>
              </div>
              <span className="rounded-full border border-wc-amber/30 bg-wc-amber/10 px-4 py-2 text-sm font-black text-wc-amber">
                לפני שריקת הפתיחה
              </span>
            </div>

            <h1 className="wc-display mt-10 max-w-4xl text-6xl leading-[0.88] text-wc-fg1 sm:text-7xl lg:text-8xl">
              מונדיאל 2026
              <span className="block bg-[linear-gradient(90deg,var(--wc-neon),#28ffcf,var(--wc-amber))] bg-clip-text text-transparent">
                מתחיל כאן
              </span>
            </h1>

            <p className="mt-7 max-w-3xl text-lg leading-9 text-wc-fg2 sm:text-xl">
              אנחנו מכינים את משחק הניחושים של החבורה: הרשמה מאובטחת, פרופיל אישי, ליגות
              פרטיות, ניחושי משחקים, טבלת ניקוד וחוויית טורניר חיה בעברית מלאה.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a href={`mailto:${SUPPORT_EMAIL}`} className="wc-button-primary px-7 py-3.5 text-sm">
                רוצה עדכון כשנפתח?
              </a>
              <a href={`mailto:${ADMIN_EMAIL}`} className="wc-button-secondary px-7 py-3.5 text-sm">
                יצירת קשר טכני
              </a>
              <Link href="/game" className="wc-button-ghost px-6 py-3.5 text-sm">
                כניסה לאפליקציה
              </Link>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {LANDING_METRICS.map((metric) => (
                <div key={metric.value} className="rounded-3xl border border-white/10 bg-white/[0.045] p-5">
                  <strong className="wc-display block text-4xl text-wc-fg1">{metric.value}</strong>
                  <span className="mt-2 block text-sm leading-6 text-wc-fg3">{metric.label}</span>
                </div>
              ))}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <ContactCard label="תמיכה" value={SUPPORT_EMAIL} />
              <ContactCard label="ניהול ועדכונים" value={ADMIN_EMAIL} />
            </div>
          </section>

          <aside className="relative overflow-hidden rounded-[2.2rem] border border-white/12 bg-[rgba(8,19,34,0.74)] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.44)] backdrop-blur-2xl sm:p-9">
            <div className="absolute left-1/2 top-8 size-96 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(95,255,123,0.20),transparent_62%)] blur-2xl" />
            <div className="relative mx-auto grid aspect-square max-w-[360px] place-items-center rounded-[2.4rem] border border-wc-neon/25 bg-[#07111f] shadow-[0_0_80px_rgba(95,255,123,0.14)]">
              <div className="absolute inset-7 rounded-[1.8rem] border border-dashed border-white/15" />
              <div className="text-center">
                <div className="wc-display text-[8.5rem] leading-none tracking-[-0.09em] text-wc-neon drop-shadow-[0_0_34px_rgba(95,255,123,0.25)]">
                  65
                </div>
                <div className="-mt-2 text-xs font-black tracking-[0.45em] text-wc-fg2">MORAN</div>
              </div>
            </div>

            <div className="relative mt-6 rounded-[1.9rem] border border-white/10 bg-black/20 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-black text-wc-neon">סטטוס הקמה</p>
                  <h2 className="mt-2 text-3xl font-black text-wc-fg1">כמעט מוכנים לעלות לאוויר</h2>
                </div>
                <span className="rounded-full border border-wc-amber/30 bg-wc-amber/10 px-3 py-1 text-sm font-black text-wc-amber">
                  Beta
                </span>
              </div>

              <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-[82%] rounded-full bg-[linear-gradient(90deg,var(--wc-neon),#28ffcf,var(--wc-amber))] shadow-[0_0_28px_rgba(95,255,123,0.24)]" />
              </div>

              <div className="mt-5 grid gap-3">
                {LANDING_FEATURES.map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.035] p-4 text-sm font-semibold text-wc-fg2"
                  >
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-wc-neon text-xs font-black text-[#041009]">
                      ✓
                    </span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

function ContactCard({ label, value }: { label: string; value: string }) {
  return (
    <a
      href={`mailto:${value}`}
      className="rounded-3xl border border-white/10 bg-black/15 p-5 text-start transition hover:border-wc-neon/35 hover:bg-white/6"
    >
      <span className="block text-xs font-black uppercase tracking-[0.22em] text-wc-fg3">{label}</span>
      <span dir="ltr" className="mt-2 block text-wc-fg1">
        {value}
      </span>
    </a>
  );
}
