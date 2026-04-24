const HTML = `<!doctype html>
<html lang="he" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>ניחושי מונדיאל 2026 - בקרוב</title>
    <meta
      name="description"
      content="ניחושי מונדיאל 2026 נמצא בתהליכי הקמה. בקרוב תוכלו להיכנס, לנחש ולהתחרות עם חברים."
    />
    <link rel="preconnect" href="https://res.cloudinary.com" />
    <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='16' fill='%2307111f'/%3E%3Ccircle cx='32' cy='32' r='23' fill='none' stroke='%235fff7b' stroke-width='5'/%3E%3Ctext x='32' y='41' text-anchor='middle' font-family='Arial,sans-serif' font-size='25' font-weight='900' fill='%235fff7b'%3E26%3C/text%3E%3C/svg%3E" />
    <style>
      :root {
        color-scheme: dark;
        --bg: #030711;
        --ink: #f8fbff;
        --muted: #b7c4d8;
        --quiet: #7f8da6;
        --glass: rgba(9, 21, 38, 0.72);
        --glass-strong: rgba(15, 31, 53, 0.88);
        --line: rgba(255, 255, 255, 0.13);
        --neon: #5fff7b;
        --mint: #25ffd0;
        --amber: #ffb649;
        --blue: #6ab7ff;
        --rose: #ff4f9a;
      }

      * {
        box-sizing: border-box;
      }

      html {
        min-height: 100%;
      }

      body {
        margin: 0;
        min-height: 100vh;
        overflow-x: hidden;
        color: var(--ink);
        font-family: "Segoe UI", Arial, sans-serif;
        direction: rtl;
        background:
          radial-gradient(circle at 10% 12%, rgba(95, 255, 123, 0.20), transparent 24rem),
          radial-gradient(circle at 86% 8%, rgba(255, 182, 73, 0.18), transparent 27rem),
          radial-gradient(circle at 64% 86%, rgba(106, 183, 255, 0.16), transparent 26rem),
          linear-gradient(145deg, #0a1d34 0%, var(--bg) 50%, #010309 100%);
      }

      body::before,
      body::after {
        content: "";
        position: fixed;
        inset: auto;
        z-index: 0;
        border-radius: 999px;
        pointer-events: none;
        filter: blur(24px);
        opacity: 0.72;
      }

      body::before {
        width: 32rem;
        height: 32rem;
        right: -14rem;
        top: -12rem;
        background: radial-gradient(circle, rgba(95, 255, 123, 0.16), transparent 68%);
      }

      body::after {
        width: 30rem;
        height: 30rem;
        left: -12rem;
        bottom: -14rem;
        background: radial-gradient(circle, rgba(255, 79, 154, 0.14), transparent 68%);
      }

      a {
        color: inherit;
      }

      .stadium-lines {
        position: fixed;
        inset: 0;
        z-index: 0;
        pointer-events: none;
        background-image:
          linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px);
        background-size: 64px 64px;
        mask-image: radial-gradient(circle at center, black 0%, transparent 74%);
      }

      main {
        position: relative;
        z-index: 1;
        display: grid;
        min-height: 100vh;
        place-items: center;
        padding: clamp(18px, 3vw, 42px);
      }

      .shell {
        width: min(1180px, 100%);
        display: grid;
        grid-template-columns: minmax(0, 1.07fr) minmax(320px, 0.93fr);
        gap: clamp(18px, 3vw, 34px);
        align-items: stretch;
      }

      .hero,
      .showcase {
        position: relative;
        overflow: hidden;
        border: 1px solid var(--line);
        border-radius: clamp(30px, 4vw, 46px);
        background:
          linear-gradient(145deg, rgba(255,255,255,0.10), rgba(255,255,255,0.025)),
          var(--glass);
        box-shadow:
          0 30px 100px rgba(0, 0, 0, 0.46),
          inset 0 1px 0 rgba(255,255,255,0.12);
        backdrop-filter: blur(24px) saturate(160%);
      }

      .hero {
        min-height: 660px;
        padding: clamp(28px, 5vw, 58px);
      }

      .hero::before {
        content: "";
        position: absolute;
        inset: -2px;
        z-index: -1;
        background:
          radial-gradient(circle at 18% 12%, rgba(95,255,123,.14), transparent 32%),
          radial-gradient(circle at 82% 10%, rgba(255,182,73,.11), transparent 30%);
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
        width: 34px;
        height: 34px;
        place-items: center;
        border-radius: 50%;
        color: #05120b;
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
        max-width: 790px;
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
        max-width: 680px;
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
        min-height: 50px;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        padding: 0 22px;
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

      .metric {
        border: 1px solid rgba(255,255,255,.10);
        border-radius: 24px;
        padding: 18px;
        background: rgba(255,255,255,.045);
      }

      .metric strong {
        display: block;
        color: var(--ink);
        font-size: 24px;
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
        border: 1px solid rgba(255,255,255,.10);
        border-radius: 22px;
        padding: 16px 18px;
        text-decoration: none;
        background: rgba(0,0,0,.14);
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
        min-height: 660px;
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
        width: 78%;
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
        border: 1px solid rgba(255,255,255,.08);
        border-radius: 18px;
        padding: 13px 14px;
        color: var(--muted);
        background: rgba(255,255,255,.035);
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

        .hero,
        .showcase {
          min-height: auto;
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
    <div class="stadium-lines" aria-hidden="true"></div>
    <main>
      <div class="shell">
        <section class="hero">
          <div class="topline">
            <div class="brand"><span class="brand-mark">26</span><span>cup26picks.com</span></div>
            <div class="status-pill">האתר בהרצה פנימית</div>
          </div>

          <h1>
            מונדיאל 2026
            <span class="gradient-text">מתחמם</span>
          </h1>

          <p class="lead">
            אנחנו בונים עכשיו את משחק הניחושים של החבורה: פרופילים, ליגות פרטיות,
            ניחושי משחקים, טבלת ניקוד וחוויה בעברית שנראית כמו מוצר אמיתי.
          </p>

          <div class="cta-row">
            <a class="button" href="mailto:support@cup26picks.com">רוצה עדכון כשנפתח?</a>
            <a class="ghost" href="mailto:admin@cup26picks.com">יצירת קשר טכני</a>
          </div>

          <div class="meta-grid" aria-label="מה נבנה עכשיו">
            <div class="metric"><strong>48</strong><span>נבחרות מוכנות לטורניר</span></div>
            <div class="metric"><strong>104</strong><span>משחקים לאורך כל המונדיאל</span></div>
            <div class="metric"><strong>RTL</strong><span>חוויה מלאה בעברית</span></div>
          </div>

          <div class="contact-strip">
            <a class="contact" href="mailto:support@cup26picks.com">
              <small>תמיכה</small>
              <span>support@cup26picks.com</span>
            </a>
            <a class="contact" href="mailto:admin@cup26picks.com">
              <small>ניהול ועדכונים</small>
              <span>admin@cup26picks.com</span>
            </a>
          </div>
        </section>

        <aside class="showcase">
          <div class="halo" aria-hidden="true"></div>
          <div class="logo-card" aria-label="Cup 26 Picks">
            <div class="logo-number">
              <strong>26</strong>
              <span>PICKS</span>
            </div>
          </div>

          <div class="progress-card">
            <div class="progress-head">
              <div>
                <h2>כמעט מוכנים לשריקת הפתיחה</h2>
                <p>הדומיין, המיילים והאבטחה כבר מחוברים. עכשיו אנחנו מסיימים בדיקות ופוליש לפני פתיחה מסודרת.</p>
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
