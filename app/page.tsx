import { headers } from "next/headers";
import Link from "next/link";

const PUBLIC_DOMAIN_HOSTS = new Set(["cup26picks.com", "www.cup26picks.com"]);

const HIGHLIGHTS = [
  "תצוגת טורניר חיה עם בתים ונוקאאוט",
  "ליגות פרטיות, רצפים ותגי הישג",
  "חוויית מובייל פרימיום ב-RTL מלא",
];

const BUILD_ITEMS = [
  "הרשמה מאובטחת עם קוד חד-פעמי במייל",
  "פרופיל שחקן עם כינוי ייחודי ותמונה אישית",
  "ניחושי משחקים, זוכה הטורניר ומלך שערים",
  "ליגות פרטיות, השוואה מול חברים וטבלת ניקוד",
];

const CONTACTS = [
  { label: "תמיכה", value: "support@cup26picks.com" },
  { label: "עדכונים טכניים", value: "admin@cup26picks.com" },
];

export default async function Home() {
  const requestHeaders = await headers();
  const hostname = requestHeaders.get("host")?.split(":")[0]?.toLowerCase() ?? "";

  if (PUBLIC_DOMAIN_HOSTS.has(hostname)) {
    return <ComingSoonHome />;
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
              <span className="text-base text-wc-neon">26</span>
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

function ComingSoonHome() {
  return (
    <main className="wc-page overflow-hidden">
      <section className="wc-shell flex min-h-[calc(100vh-73px)] items-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid w-full gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="text-center lg:text-start">
            <div className="wc-badge mx-auto w-fit border-wc-neon/25 bg-wc-neon/8 text-sm font-bold text-wc-neon lg:mx-0">
              <span aria-hidden="true">26</span>
              <span>cup26picks.com</span>
            </div>

            <h1 className="wc-display mt-7 text-6xl leading-none text-wc-fg1 sm:text-7xl lg:text-8xl">
              בקרוב מאוד
            </h1>

            <p className="mt-4 text-2xl font-black text-wc-neon sm:text-3xl">
              ניחושי מונדיאל 2026 נבנה עכשיו מאחורי הקלעים.
            </p>

            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-wc-fg2 lg:mx-0">
              האתר נמצא בתהליכי הקמה, חיבור דומיין, אימות מיילים ושיוף אחרון
              של חוויית המשחק. אנחנו מכינים מקום נקי, מהיר ונעים שבו כל החברים
              יוכלו להיכנס, לנחש, להתחרות ולעקוב אחרי הטבלה בזמן אמת.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              <Link href="/signup" className="wc-button-primary min-w-40 px-7 py-3.5 text-sm">
                הרשמה לבדיקה
              </Link>
              <Link href="/login" className="wc-button-secondary min-w-40 px-7 py-3.5 text-sm">
                כניסת בודקים
              </Link>
              <Link href="/game" className="wc-button-ghost px-5 py-3 text-sm">
                מעבר לאפליקציה
              </Link>
            </div>

            <div className="mt-8 grid gap-3 text-sm text-wc-fg2 sm:grid-cols-2 lg:max-w-xl">
              {CONTACTS.map((contact) => (
                <a
                  key={contact.value}
                  href={`mailto:${contact.value}`}
                  className="wc-panel block p-4 text-start transition hover:border-wc-neon/35 hover:bg-white/6"
                >
                  <span className="block text-xs font-bold uppercase tracking-[0.22em] text-wc-fg3">
                    {contact.label}
                  </span>
                  <span dir="ltr" className="mt-1 block text-wc-fg1">
                    {contact.value}
                  </span>
                </a>
              ))}
            </div>
          </div>

          <div className="wc-card relative overflow-hidden p-6 sm:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_10%,rgba(95,255,123,0.18),transparent_32%),radial-gradient(circle_at_85%_15%,rgba(255,182,73,0.16),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.07),transparent_45%)]" />
            <div className="relative">
              <div className="mx-auto flex size-28 items-center justify-center rounded-[2.1rem] border border-wc-neon/30 bg-[#06111f] shadow-[0_0_55px_rgba(95,255,123,0.18)] sm:size-32">
                <div className="text-center">
                  <div className="wc-display text-6xl leading-none text-wc-neon sm:text-7xl">26</div>
                  <div className="-mt-1 text-xs font-black tracking-[0.28em] text-wc-fg2">PICKS</div>
                </div>
              </div>

              <div className="mt-8 rounded-[1.8rem] border border-white/10 bg-black/18 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-wc-neon">סטטוס הקמה</p>
                    <p className="mt-1 text-2xl font-black text-wc-fg1">הבסיס כבר חי</p>
                  </div>
                  <div className="rounded-full border border-wc-amber/30 bg-wc-amber/10 px-3 py-1 text-sm font-black text-wc-amber">
                    Beta
                  </div>
                </div>

                <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-[78%] rounded-full bg-[linear-gradient(90deg,var(--wc-neon),#28ffcf,var(--wc-amber))]" />
                </div>

                <p className="mt-3 text-sm leading-7 text-wc-fg2">
                  הדומיין והמיילים כבר מחוברים. עכשיו נשארים עוד בדיקות, פוליש
                  אחרון והעלאה מסודרת לאוויר.
                </p>
              </div>

              <div className="mt-5 grid gap-3">
                {BUILD_ITEMS.map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.035] p-4 text-sm font-semibold text-wc-fg2"
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-wc-neon text-xs font-black text-[var(--wc-text-inverse)]">
                      ✓
                    </span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
