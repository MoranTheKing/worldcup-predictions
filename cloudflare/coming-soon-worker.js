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
    <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='16' fill='%2307111f'/%3E%3Ccircle cx='32' cy='32' r='23' fill='none' stroke='%235fff7b' stroke-width='5'/%3E%3Ctext x='32' y='41' text-anchor='middle' font-family='Arial,sans-serif' font-size='25' font-weight='900' fill='%235fff7b'%3E26%3C/text%3E%3C/svg%3E" />
    <style>
      :root {
        color-scheme: dark;
        --bg: #06101d;
        --panel: rgba(16, 28, 47, 0.84);
        --panel-strong: rgba(20, 35, 58, 0.92);
        --border: rgba(255, 255, 255, 0.12);
        --text: #f8fbff;
        --muted: #aebbd1;
        --quiet: #7f8da6;
        --neon: #5fff7b;
        --cyan: #28ffcf;
        --amber: #ffb649;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        background:
          radial-gradient(circle at 14% 18%, rgba(95, 255, 123, 0.16), transparent 28rem),
          radial-gradient(circle at 86% 10%, rgba(255, 182, 73, 0.13), transparent 26rem),
          linear-gradient(145deg, #09182a 0%, var(--bg) 48%, #02050c 100%);
        color: var(--text);
        font-family: "Segoe UI", Arial, sans-serif;
        direction: rtl;
      }

      main {
        display: grid;
        min-height: 100vh;
        place-items: center;
        padding: 28px;
      }

      .shell {
        width: min(1040px, 100%);
        display: grid;
        grid-template-columns: 1.08fr 0.92fr;
        gap: 28px;
        align-items: center;
      }

      .hero,
      .card {
        border: 1px solid var(--border);
        border-radius: 34px;
        background: linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02)), var(--panel);
        box-shadow: 0 26px 86px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.08);
        backdrop-filter: blur(20px);
      }

      .hero {
        padding: clamp(28px, 5vw, 54px);
      }

      .badge {
        display: inline-flex;
        gap: 10px;
        align-items: center;
        border: 1px solid rgba(95,255,123,0.32);
        border-radius: 999px;
        padding: 9px 15px;
        background: rgba(95,255,123,0.08);
        color: var(--neon);
        font-weight: 800;
      }

      h1 {
        margin: 26px 0 0;
        font-size: clamp(58px, 10vw, 118px);
        line-height: 0.9;
        letter-spacing: -0.04em;
      }

      .lead {
        margin: 18px 0 0;
        color: var(--neon);
        font-size: clamp(22px, 3.4vw, 34px);
        font-weight: 900;
      }

      .copy {
        max-width: 620px;
        margin: 18px 0 0;
        color: var(--muted);
        font-size: 17px;
        line-height: 1.9;
      }

      .links {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
        margin-top: 28px;
      }

      .link {
        display: block;
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 20px;
        padding: 16px 18px;
        color: inherit;
        text-decoration: none;
        background: rgba(255,255,255,0.045);
      }

      .link small {
        display: block;
        color: var(--quiet);
        font-weight: 800;
        letter-spacing: 0.08em;
      }

      .link span {
        display: block;
        margin-top: 5px;
        direction: ltr;
        text-align: right;
      }

      .card {
        padding: clamp(24px, 4vw, 40px);
        overflow: hidden;
        position: relative;
      }

      .logo {
        width: 144px;
        height: 144px;
        margin: 0 auto;
        display: grid;
        place-items: center;
        border: 1px solid rgba(95,255,123,0.34);
        border-radius: 42px;
        background: #07111f;
        box-shadow: 0 0 70px rgba(95,255,123,0.16);
      }

      .logo strong {
        display: block;
        color: var(--neon);
        font-size: 78px;
        line-height: 0.9;
        letter-spacing: -0.08em;
      }

      .logo span {
        display: block;
        color: var(--muted);
        font-size: 12px;
        font-weight: 900;
        letter-spacing: 0.28em;
        text-align: center;
      }

      .status {
        margin-top: 28px;
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 26px;
        padding: 22px;
        background: rgba(0,0,0,0.18);
      }

      .status-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }

      .status h2 {
        margin: 0;
        font-size: 24px;
      }

      .status p {
        margin: 8px 0 0;
        color: var(--muted);
        line-height: 1.8;
      }

      .pill {
        flex: 0 0 auto;
        border: 1px solid rgba(255,182,73,0.36);
        border-radius: 999px;
        padding: 7px 12px;
        color: var(--amber);
        background: rgba(255,182,73,0.1);
        font-weight: 900;
      }

      .bar {
        height: 12px;
        margin-top: 18px;
        border-radius: 999px;
        overflow: hidden;
        background: rgba(255,255,255,0.1);
      }

      .fill {
        width: 78%;
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, var(--neon), var(--cyan), var(--amber));
      }

      @media (max-width: 860px) {
        main {
          padding: 18px;
        }

        .shell {
          grid-template-columns: 1fr;
        }

        .links {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <div class="shell">
        <section class="hero">
          <div class="badge"><span>26</span><span>cup26picks.com</span></div>
          <h1>בקרוב מאוד</h1>
          <p class="lead">ניחושי מונדיאל 2026 נבנה עכשיו מאחורי הקלעים.</p>
          <p class="copy">
            האתר נמצא בתהליכי הקמה, חיבור דומיין, אימות מיילים ושיוף אחרון של חוויית המשחק.
            אנחנו מכינים מקום נקי, מהיר ונעים שבו כל החברים יוכלו להיכנס, לנחש,
            להתחרות ולעקוב אחרי הטבלה בזמן אמת.
          </p>

          <div class="links">
            <a class="link" href="mailto:support@cup26picks.com">
              <small>תמיכה</small>
              <span>support@cup26picks.com</span>
            </a>
            <a class="link" href="mailto:admin@cup26picks.com">
              <small>עדכונים טכניים</small>
              <span>admin@cup26picks.com</span>
            </a>
          </div>
        </section>

        <aside class="card">
          <div class="logo" aria-label="Cup 26 Picks">
            <div>
              <strong>26</strong>
              <span>PICKS</span>
            </div>
          </div>

          <div class="status">
            <div class="status-row">
              <div>
                <h2>הבסיס כבר חי</h2>
                <p>הדומיין והמיילים מחוברים. עכשיו נשארים בדיקות, פוליש והעלאה מסודרת לאוויר.</p>
              </div>
              <div class="pill">Beta</div>
            </div>
            <div class="bar" aria-hidden="true"><div class="fill"></div></div>
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
