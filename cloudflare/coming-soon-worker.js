const DOMAIN = "moran65.com";
const SUPPORT_EMAIL = "support@moran65.com";
const ADMIN_EMAIL = "admin@moran65.com";

const favicon = encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="16" fill="#07111f"/>
  <path d="M12 20h40v26H12z" fill="none" stroke="#5fff7b" stroke-width="4"/>
  <path d="M32 20v26M12 33h40" stroke="#ffffff" stroke-width="2" opacity=".18"/>
  <text x="32" y="40" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-size="23" font-weight="900" fill="#5fff7b">65</text>
</svg>
`);

const HTML = `<!doctype html>
<html lang="he" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Moran 65 - ניחושי מונדיאל 2026</title>
    <meta
      name="description"
      content="Moran 65 הוא משחק ניחושי מונדיאל 2026 בעברית. האתר נמצא בתהליכי הקמה וייפתח בקרוב."
    />
    <link rel="icon" href="data:image/svg+xml,${favicon}" />
    <style>
      :root {
        color-scheme: dark;
        --bg: #020711;
        --card: rgba(10, 24, 42, 0.72);
        --card-strong: rgba(8, 19, 34, 0.78);
        --line: rgba(255, 255, 255, 0.13);
        --ink: #f8fbff;
        --muted: #b7c4d8;
        --quiet: #7f8da6;
        --neon: #5fff7b;
        --mint: #28ffcf;
        --amber: #ffb649;
      }

      * {
        box-sizing: border-box;
      }

      html {
        min-height: 100%;
      }

      body {
        min-height: 100vh;
        margin: 0;
        overflow-x: hidden;
        background:
          radial-gradient(circle at 12% 12%, rgba(95, 255, 123, 0.22), transparent 24rem),
          radial-gradient(circle at 88% 8%, rgba(255, 182, 73, 0.18), transparent 28rem),
          radial-gradient(circle at 62% 88%, rgba(40, 255, 207, 0.13), transparent 24rem),
          linear-gradient(145deg, #0a1d34 0%, var(--bg) 52%, #010309 100%);
        color: var(--ink);
        direction: rtl;
        font-family: "Segoe UI", Arial, sans-serif;
      }

      body::before {
        content: "";
        position: fixed;
        inset: 0;
        pointer-events: none;
        background-image:
          linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
        background-size: 72px 72px;
        opacity: 0.45;
        mask-image: radial-gradient(circle at center, black, transparent 74%);
      }

      a {
        color: inherit;
      }

      main {
        position: relative;
        z-index: 1;
        min-height: 100vh;
        padding: clamp(18px, 3vw, 42px);
      }

      .shell {
        display: grid;
        width: min(1240px, 100%);
        min-height: calc(100vh - clamp(36px, 6vw, 84px));
        margin: 0 auto;
        grid-template-columns: minmax(0, 1.08fr) minmax(320px, 0.92fr);
        gap: clamp(18px, 3vw, 34px);
        align-items: center;
      }

      .hero,
      .showcase {
        position: relative;
        overflow: hidden;
        border: 1px solid var(--line);
        border-radius: clamp(30px, 4vw, 46px);
        background:
          linear-gradient(145deg, rgba(255,255,255,0.10), rgba(255,255,255,0.025)),
          var(--card);
        box-shadow:
          0 30px 100px rgba(0, 0, 0, 0.46),
          inset 0 1px 0 rgba(255,255,255,0.12);
        backdrop-filter: blur(24px) saturate(160%);
      }

      .hero {
        padding: clamp(28px, 5vw, 58px);
      }

      .topline {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }

      .brand {
        display: inline-flex;
        align-items: center;
        gap: 12px;
        border: 1px solid rgba(95,255,123,.30);
        border-radius: 999px;
        padding: 10px 16px;
        background: rgba(95,255,123,.08);
        color: var(--neon);
        font-weight: 900;
      }

      .brand-mark {
        display: grid;
        width: 38px;
        height: 38px;
        place-items: center;
        border-radius: 50%;
        color: #041008;
        background: linear-gradient(135deg, var(--neon), var(--mint));
        font-weight: 1000;
      }

      .status-pill {
        border: 1px solid rgba(255,182,73,.28);
        border-radius: 999px;
        padding: 9px 14px;
        background: rgba(255,182,73,.10);
        color: var(--amber);
        font-size: 13px;
        font-weight: 900;
        white-space: nowrap;
      }

      h1 {
        max-width: 820px;
        margin: 54px 0 0;
        font-size: clamp(72px, 12vw, 142px);
        line-height: 0.86;
        letter-spacing: -0.07em;
      }

      .gradient-text {
        display: block;
        width: fit-content;
        background: linear-gradient(90deg, var(--neon), var(--mint), var(--amber));
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
      }

      .lead {
        max-width: 700px;
        margin: 26px 0 0;
        color: var(--muted);
        font-size: clamp(18px, 2.2vw, 24px);
        line-height: 1.9;
      }

      .cta-row {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 32px;
      }

      .button,
      .ghost {
        display: inline-flex;
        min-height: 52px;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        padding: 0 24px;
        text-decoration: none;
        font-weight: 900;
      }

      .button {
        color: #041008;
        background: linear-gradient(135deg, var(--neon), var(--mint));
        box-shadow: 0 0 38px rgba(95,255,123,.18);
      }

      .ghost {
        border: 1px solid rgba(255,255,255,.12);
        color: var(--muted);
        background: rgba(255,255,255,.05);
      }

      .meta-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
        margin-top: 44px;
      }

      .metric,
      .contact,
      .feature {
        border: 1px solid rgba(255,255,255,.10);
        background: rgba(255,255,255,.045);
      }

      .metric {
        border-radius: 24px;
        padding: 18px;
      }

      .metric strong {
        display: block;
        color: var(--ink);
        font-size: 28px;
      }

      .metric span {
        display: block;
        margin-top: 5px;
        color: var(--quiet);
        font-size: 13px;
        line-height: 1.5;
      }

      .contact-strip {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
        margin-top: 18px;
      }

      .contact {
        border-radius: 22px;
        padding: 16px 18px;
        text-decoration: none;
      }

      .contact small {
        display: block;
        color: var(--quiet);
        font-weight: 900;
      }

      .contact span {
        display: block;
        margin-top: 6px;
        direction: ltr;
        text-align: right;
        color: var(--ink);
      }

      .showcase {
        padding: clamp(26px, 4vw, 42px);
      }

      .halo {
        position: absolute;
        width: 26rem;
        height: 26rem;
        left: 50%;
        top: 2rem;
        transform: translateX(-50%);
        border-radius: 999px;
        background:
          radial-gradient(circle, rgba(95,255,123,.20), transparent 58%),
          radial-gradient(circle, rgba(37,255,208,.12), transparent 72%);
        filter: blur(18px);
      }

      .logo-card {
        position: relative;
        display: grid;
        width: min(100%, 360px);
        aspect-ratio: 1;
        margin: 0 auto;
        place-items: center;
        border: 1px solid rgba(95,255,123,.22);
        border-radius: 46px;
        background:
          linear-gradient(150deg, rgba(95,255,123,.14), rgba(255,255,255,.035)),
          #07111f;
        box-shadow: 0 28px 90px rgba(0,0,0,.38), 0 0 80px rgba(95,255,123,.13);
      }

      .logo-card::before {
        content: "";
        position: absolute;
        inset: 28px;
        border-radius: 36px;
        border: 1px dashed rgba(255,255,255,.16);
      }

      .logo-number {
        position: relative;
        z-index: 1;
        display: grid;
        place-items: center;
        text-align: center;
      }

      .logo-number strong {
        color: var(--neon);
        font-size: clamp(112px, 16vw, 158px);
        line-height: .82;
        letter-spacing: -0.08em;
        text-shadow: 0 0 40px rgba(95,255,123,.20);
      }

      .logo-number span {
        margin-top: 8px;
        color: var(--muted);
        font-size: 14px;
        font-weight: 1000;
        letter-spacing: .38em;
      }

      .progress-card {
        position: relative;
        margin-top: 24px;
        border: 1px solid rgba(255,255,255,.10);
        border-radius: 30px;
        padding: 24px;
        background: rgba(0,0,0,.18);
      }

      .progress-head {
        display: flex;
        align-items: start;
        justify-content: space-between;
        gap: 18px;
      }

      .progress-card h2 {
        margin: 0;
        font-size: 28px;
      }

      .progress-card p {
        margin: 8px 0 0;
        color: var(--muted);
        line-height: 1.8;
      }

      .beta {
        flex: 0 0 auto;
        border: 1px solid rgba(255,182,73,.34);
        border-radius: 999px;
        padding: 7px 12px;
        color: var(--amber);
        background: rgba(255,182,73,.10);
        font-weight: 1000;
      }

      .bar {
        height: 14px;
        margin-top: 22px;
        overflow: hidden;
        border-radius: 999px;
        background: rgba(255,255,255,.10);
      }

      .fill {
        width: 82%;
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, var(--neon), var(--mint), var(--amber));
        box-shadow: 0 0 28px rgba(95,255,123,.24);
      }

      .feature-list {
        display: grid;
        gap: 10px;
        margin-top: 18px;
      }

      .feature {
        display: flex;
        align-items: center;
        gap: 12px;
        border-radius: 18px;
        padding: 13px 14px;
        color: var(--muted);
      }

      .check {
        display: grid;
        width: 26px;
        height: 26px;
        flex: 0 0 auto;
        place-items: center;
        border-radius: 50%;
        color: #041008;
        background: var(--neon);
        font-weight: 1000;
      }

      @media (prefers-reduced-motion: no-preference) {
        .logo-card {
          animation: float 5s ease-in-out infinite;
        }

        .fill {
          animation: shimmer 4s ease-in-out infinite;
          background-size: 180% 100%;
        }
      }

      @keyframes float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-10px); }
      }

      @keyframes shimmer {
        0%, 100% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
      }

      @media (max-width: 940px) {
        .shell {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 640px) {
        main {
          padding: 14px;
        }

        .topline,
        .progress-head {
          align-items: stretch;
          flex-direction: column;
        }

        .meta-grid,
        .contact-strip {
          grid-template-columns: 1fr;
        }

        .hero,
        .showcase {
          border-radius: 28px;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <div class="shell">
        <section class="hero">
          <div class="topline">
            <div class="brand"><span class="brand-mark">M65</span><span>${DOMAIN}</span></div>
            <div class="status-pill">לפני שריקת הפתיחה</div>
          </div>

          <h1>
            מונדיאל 2026
            <span class="gradient-text">מתחיל כאן</span>
          </h1>

          <p class="lead">
            אנחנו מכינים את משחק הניחושים של החבורה: הרשמה מאובטחת, פרופיל אישי,
            ליגות פרטיות, ניחושי משחקים, טבלת ניקוד וחוויית טורניר חיה בעברית מלאה.
          </p>

          <div class="cta-row">
            <a class="button" href="mailto:${SUPPORT_EMAIL}">רוצה עדכון כשנפתח?</a>
            <a class="ghost" href="mailto:${ADMIN_EMAIL}">יצירת קשר טכני</a>
          </div>

          <div class="meta-grid" aria-label="מה נבנה עכשיו">
            <div class="metric"><strong>48</strong><span>נבחרות בטורניר</span></div>
            <div class="metric"><strong>104</strong><span>משחקים עד הגמר</span></div>
            <div class="metric"><strong>RTL</strong><span>חוויה עברית מלאה</span></div>
          </div>

          <div class="contact-strip">
            <a class="contact" href="mailto:${SUPPORT_EMAIL}">
              <small>תמיכה</small>
              <span>${SUPPORT_EMAIL}</span>
            </a>
            <a class="contact" href="mailto:${ADMIN_EMAIL}">
              <small>ניהול ועדכונים</small>
              <span>${ADMIN_EMAIL}</span>
            </a>
          </div>
        </section>

        <aside class="showcase">
          <div class="halo" aria-hidden="true"></div>
          <div class="logo-card" aria-label="Moran 65">
            <div class="logo-number">
              <strong>65</strong>
              <span>MORAN</span>
            </div>
          </div>

          <div class="progress-card">
            <div class="progress-head">
              <div>
                <h2>כמעט מוכנים לעלות לאוויר</h2>
                <p>הדומיין, המיילים והאבטחה מתחברים עכשיו. נשארים בדיקות, פוליש אחרון והעלאה מסודרת.</p>
              </div>
              <div class="beta">Beta</div>
            </div>
            <div class="bar" aria-hidden="true"><div class="fill"></div></div>

            <div class="feature-list">
              <div class="feature"><span class="check">✓</span><span>הרשמה עם קוד אימות מאובטח במייל</span></div>
              <div class="feature"><span class="check">✓</span><span>כינוי ייחודי ותמונת פרופיל אישית</span></div>
              <div class="feature"><span class="check">✓</span><span>ליגות פרטיות והשוואה מול חברים</span></div>
              <div class="feature"><span class="check">✓</span><span>דף זמני חי עד העלייה הרשמית</span></div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  </body>
</html>`;

const worker = {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.protocol === "http:") {
      url.protocol = "https:";
      return Response.redirect(url.toString(), 301);
    }

    return new Response(HTML, {
      headers: {
        "content-type": "text/html;charset=UTF-8",
        "cache-control": "public, max-age=60",
        "x-robots-tag": "noindex, nofollow",
      },
    });
  },
};

export default worker;
