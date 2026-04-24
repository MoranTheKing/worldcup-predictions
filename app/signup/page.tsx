"use client";

import { createClient } from "@/lib/supabase/client";
import { getSafeRedirectPath } from "@/lib/security/safe-redirect";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

const CODE_LENGTH = 6;

type SignupError = {
  code?: string;
  message?: string;
  status?: number;
};

export default function SignupPage() {
  const searchParams = useSearchParams();
  const supabase = createClient();
  const nextPath = getSafeRedirectPath(searchParams.get("next"));
  const loginHref =
    nextPath === "/dashboard" ? "/login" : `/login?next=${encodeURIComponent(nextPath)}`;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);

    const normalizedEmail = email.trim().toLowerCase();

    const { data, error: authError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      },
    });

    if (authError) {
      setError(getSignupErrorMessage(authError));
    } else if (data.session) {
      window.location.assign(`/onboarding?next=${encodeURIComponent(nextPath)}`);
    } else if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      setError("האימייל הזה כבר רשום ומאומת. אפשר להתחבר במקום, או להשתמש בכתובת אחרת להרשמה.");
    } else {
      setPendingEmail(normalizedEmail);
      setVerificationCode("");
      setNotice("שלחנו לך קוד אימות בן 6 ספרות. הוא מחכה באימייל.");
    }

    setLoading(false);
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!pendingEmail || verificationCode.length !== CODE_LENGTH) {
      setError("צריך להזין את כל 6 הספרות של קוד האימות.");
      return;
    }

    setLoading(true);
    setError(null);
    setNotice(null);

    const { error: authError } = await supabase.auth.verifyOtp({
      email: pendingEmail,
      token: verificationCode,
      type: "email",
    });

    if (authError) {
      setError("הקוד לא תקין או שפג תוקף. בדוק את המייל ונסה שוב.");
      setLoading(false);
      return;
    }

    window.location.assign(`/onboarding?next=${encodeURIComponent(nextPath)}`);
  }

  async function handleResendCode() {
    if (!pendingEmail) {
      return;
    }

    setLoading(true);
    setError(null);
    setNotice(null);

    const { error: authError } = await supabase.auth.resend({
      type: "signup",
      email: pendingEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      },
    });

    if (authError) {
      setError(getSignupErrorMessage(authError));
    } else {
      setNotice("שלחנו קוד חדש אם הכתובת עדיין ממתינה לאימות. אם הוא לא מופיע, בדוק גם קידומי מכירות או ספאם; אם הכתובת כבר רשומה ומאומתת, צריך להתחבר במקום.");
    }

    setLoading(false);
  }

  async function handleGoogleLogin() {
    setLoading(true);
    setError(null);
    setNotice(null);

    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      },
    });

    if (authError) {
      setError("שגיאה בהתחברות עם Google");
      setLoading(false);
    }
  }

  if (pendingEmail) {
    return (
      <main className="wc-page flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-7 text-center">
            <div className="wc-badge mx-auto w-fit text-sm text-wc-fg2">
              <span className="text-wc-neon">✦</span>
              <span>אימות מהיר ובטוח</span>
            </div>
            <div className="mt-5 text-5xl">📨</div>
            <h1 className="wc-display mt-4 text-5xl text-wc-fg1">הקוד בדרך אליך</h1>
            <p className="mt-3 text-sm leading-7 text-wc-fg2">
              שלחנו קוד אימות ל־<span dir="ltr" className="font-semibold text-wc-fg1">{pendingEmail}</span>.
              הזן אותו כאן, ונמשיך ישר לבחירת הפרופיל שלך.
            </p>
          </div>

          <div className="wc-glass rounded-[2rem] p-6 text-center sm:p-8">
            <form onSubmit={handleVerifyCode} className="flex flex-col gap-4">
              <label htmlFor="verification-code" className="text-sm font-semibold text-wc-fg2">
                קוד אימות בן 6 ספרות
              </label>
              <input
                id="verification-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                dir="ltr"
                maxLength={CODE_LENGTH}
                value={verificationCode}
                onChange={(event) =>
                  setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH))
                }
                className="wc-input text-center text-2xl font-black tracking-[0.45em] text-wc-fg1"
                placeholder="000000"
                required
              />

              {notice && (
                <p className="rounded-2xl border border-wc-neon/25 bg-wc-neon/10 px-4 py-3 text-center text-sm text-wc-neon">
                  {notice}
                </p>
              )}

              {error && (
                <p className="rounded-2xl bg-[color:var(--wc-danger-bg)] px-4 py-3 text-center text-sm text-wc-danger">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || verificationCode.length !== CODE_LENGTH}
                className="wc-button-primary mt-1 w-full px-4 py-3.5 text-sm disabled:opacity-50"
              >
                {loading ? "בודק את הקוד..." : "אמת קוד והמשך"}
              </button>
            </form>

            <div className="mt-5 flex flex-col items-center justify-center gap-3 text-sm text-wc-fg3 sm:flex-row">
              <button
                type="button"
                onClick={handleResendCode}
                disabled={loading}
                className="font-semibold text-wc-neon underline underline-offset-4 disabled:opacity-50"
              >
                שלח קוד חדש
              </button>
              <span className="hidden h-1 w-1 rounded-full bg-white/25 sm:block" />
              <button
                type="button"
                onClick={() => {
                  setPendingEmail(null);
                  setVerificationCode("");
                  setError(null);
                  setNotice(null);
                }}
                className="font-semibold text-wc-fg2 underline underline-offset-4"
              >
                החלפת אימייל
              </button>
            </div>
        </div>
        </div>
      </main>
    );
  }

  return (
    <main className="wc-page flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="wc-badge mx-auto w-fit text-sm text-wc-fg2">
            <span className="text-wc-neon">✦</span>
            <span>פתיחת חשבון חדש</span>
          </div>
          <div className="mt-5 text-5xl">🏆</div>
          <h1 className="wc-display mt-4 text-5xl text-wc-fg1">הרשמה</h1>
          <p className="mt-3 text-sm leading-7 text-wc-fg2">
            פותחים חשבון, מקבלים קוד קצר במייל, ואז בוחרים כינוי ותמונה לפני הכניסה למשחק.
          </p>
        </div>

        <div className="wc-glass rounded-[2rem] p-6 sm:p-8">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="wc-button-secondary flex w-full items-center justify-center gap-3 rounded-2xl px-4 py-3.5 text-sm disabled:opacity-50"
          >
            <GoogleIcon />
            המשך עם Google
          </button>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs text-wc-fg3">או</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <form onSubmit={handleSignup} className="flex flex-col gap-3">
            <input
              type="email"
              placeholder="אימייל"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="wc-input text-start"
            />
            <input
              type="password"
              placeholder="סיסמה (לפחות 6 תווים)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="wc-input text-start"
            />

            {error && (
              <p className="rounded-2xl bg-[color:var(--wc-danger-bg)] px-4 py-3 text-center text-sm text-wc-danger">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="wc-button-primary mt-2 w-full px-4 py-3.5 text-sm disabled:opacity-50"
            >
              {loading ? "שולח קוד..." : "הרשמה וקבלת קוד"}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-wc-fg3">
          יש לך חשבון?{" "}
          <Link href={loginHref} className="font-semibold text-wc-neon underline underline-offset-4">
            התחברות
          </Link>
        </p>
      </div>
    </main>
  );
}

function getSignupErrorMessage(error: SignupError) {
  const message = (error.message ?? "").toLowerCase();

  if (
    error.code === "over_email_send_rate_limit" ||
    message.includes("email rate limit") ||
    message.includes("rate limit exceeded")
  ) {
    return "Supabase מגביל כרגע שליחת מיילים. חכה קצת ונסה שוב, או נגדיר Custom SMTP כדי להסיר את המגבלה הנמוכה של סביבת הפיתוח.";
  }

  if (
    error.status === 429 ||
    error.code === "over_request_rate_limit" ||
    message.includes("only request this after") ||
    message.includes("too many requests")
  ) {
    return "שלחנו קוד ממש עכשיו. מטעמי אבטחה צריך להמתין בערך דקה לפני שמבקשים קוד נוסף או נרשמים שוב.";
  }

  if (message.includes("user already registered")) {
    return "האימייל הזה כבר רשום. אפשר להתחבר במקום.";
  }

  if (message.includes("invalid email")) {
    return "כתובת האימייל לא נראית תקינה.";
  }

  if (message.includes("password")) {
    return "הסיסמה לא עומדת בדרישות. נסה סיסמה ארוכה יותר.";
  }

  if (message.includes("signup") && message.includes("disabled")) {
    return "הרשמה במייל כבויה כרגע בהגדרות Supabase.";
  }

  return "לא הצלחנו לפתוח חשבון כרגע. בדוק את הפרטים ונסה שוב.";
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853" />
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335" />
    </svg>
  );
}
