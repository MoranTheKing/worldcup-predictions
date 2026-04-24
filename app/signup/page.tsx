"use client";

import { createClient } from "@/lib/supabase/client";
import {
  PASSWORD_MIN_LENGTH,
  evaluatePasswordPolicy,
  getPasswordPolicyError,
} from "@/lib/security/password-policy";
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
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const passwordPolicy = evaluatePasswordPolicy(password, email.trim().toLowerCase());
  const hasPasswordConfirmation = passwordConfirmation.length > 0;
  const passwordConfirmationMatches = password === passwordConfirmation;

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);

    const normalizedEmail = email.trim().toLowerCase();
    const passwordPolicyError = getPasswordPolicyError(password, normalizedEmail);

    if (!passwordConfirmationMatches) {
      setError("אימות הסיסמה לא תואם לסיסמה שבחרת. כתוב את אותה סיסמה בשני השדות.");
      setLoading(false);
      return;
    }

    if (passwordPolicyError) {
      setError(passwordPolicyError);
      setLoading(false);
      return;
    }

    const { data, error: authError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      },
    });

    if (authError && isExistingAccountSignupResponse(authError)) {
      setPendingEmail(normalizedEmail);
      setVerificationCode("");
      setNotice("אם אפשר להמשיך עם הרשמה לכתובת הזו, שלחנו קוד אימות בן 6 ספרות לאימייל.");
    } else if (authError) {
      setError(getSignupErrorMessage(authError));
    } else if (data.session) {
      window.location.assign(`/onboarding?next=${encodeURIComponent(nextPath)}`);
    } else {
      setPendingEmail(normalizedEmail);
      setVerificationCode("");
      setNotice("אם אפשר להמשיך עם הרשמה לכתובת הזו, שלחנו קוד אימות בן 6 ספרות לאימייל.");
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
      setError("אם קיבלת קוד, הוא לא תקין או שפג תוקף. אפשר לבקש קוד חדש או להתחבר אם כבר יש לך חשבון.");
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
      setNotice("אם הכתובת עדיין ממתינה לאימות, שלחנו קוד חדש. אם כבר יש לך חשבון, אפשר להתחבר במקום.");
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
            <h1 className="wc-display mt-4 text-5xl text-wc-fg1">בדיקת אימייל</h1>
            <p className="mt-3 text-sm leading-7 text-wc-fg2">
              אם אפשר להמשיך בהרשמה ל־<span dir="ltr" className="font-semibold text-wc-fg1">{pendingEmail}</span>,
              קוד בן 6 ספרות מחכה באימייל. אם כבר יש לך חשבון, אפשר להתחבר מיד בלי לחכות לקוד חדש.
            </p>
          </div>

          <div className="wc-glass rounded-[2rem] p-6 text-center sm:p-8">
            <div className="mb-5 rounded-[1.5rem] border border-white/10 bg-white/[0.045] px-4 py-4 text-start">
              <p className="text-sm font-black text-wc-fg1">יש לך כבר חשבון?</p>
              <p className="mt-1 text-xs leading-5 text-wc-fg3">
                מטעמי אבטחה אנחנו לא אומרים אם כתובת כבר רשומה. אם נרשמת בעבר, התחברות היא הדרך הכי מהירה להמשיך.
              </p>
              <Link
                href={loginHref}
                className="wc-button-secondary mt-4 block rounded-2xl px-4 py-3 text-center text-sm"
              >
                התחברות לחשבון קיים
              </Link>
            </div>

            <form onSubmit={handleVerifyCode} className="flex flex-col gap-4">
              <label htmlFor="verification-code" className="text-sm font-semibold text-wc-fg2">
                יש לך קוד? הזן כאן 6 ספרות
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
              placeholder={`סיסמה חזקה (${PASSWORD_MIN_LENGTH}+ תווים)`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={PASSWORD_MIN_LENGTH}
              autoComplete="new-password"
              className="wc-input text-start"
            />
            <input
              type="password"
              placeholder="אימות סיסמה"
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              required
              minLength={PASSWORD_MIN_LENGTH}
              autoComplete="new-password"
              className="wc-input text-start"
            />
            {hasPasswordConfirmation && (
              <p
                className={[
                  "rounded-2xl px-4 py-2 text-sm font-semibold",
                  passwordConfirmationMatches
                    ? "border border-wc-neon/25 bg-wc-neon/10 text-wc-neon"
                    : "bg-[color:var(--wc-danger-bg)] text-wc-danger",
                ].join(" ")}
              >
                {passwordConfirmationMatches
                  ? "הסיסמאות תואמות"
                  : "הסיסמאות לא תואמות עדיין"}
              </p>
            )}
            <PasswordStrengthPanel policy={passwordPolicy} password={password} />

            {error && (
              <p className="rounded-2xl bg-[color:var(--wc-danger-bg)] px-4 py-3 text-center text-sm text-wc-danger">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !passwordPolicy.passed || !passwordConfirmationMatches}
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

  if (message.includes("invalid email")) {
    return "כתובת האימייל לא נראית תקינה.";
  }

  if (
    error.code === "weak_password" ||
    message.includes("weak password") ||
    message.includes("password")
  ) {
    return "הסיסמה לא עומדת בדרישות האבטחה. בחר סיסמה של לפחות 10 תווים עם אות גדולה, אות קטנה, מספר וסימן מיוחד.";
  }

  if (message.includes("signup") && message.includes("disabled")) {
    return "הרשמה במייל כבויה כרגע בהגדרות Supabase.";
  }

  return "לא הצלחנו לפתוח חשבון כרגע. בדוק את הפרטים ונסה שוב.";
}

function isExistingAccountSignupResponse(error: SignupError) {
  const message = (error.message ?? "").toLowerCase();

  return (
    error.code === "user_already_exists" ||
    error.code === "user_already_registered" ||
    message.includes("user already registered") ||
    message.includes("already registered") ||
    message.includes("already been registered")
  );
}

function PasswordStrengthPanel({
  policy,
  password,
}: {
  policy: ReturnType<typeof evaluatePasswordPolicy>;
  password: string;
}) {
  const progressPercent = Math.max(8, Math.round((policy.score / policy.requirements.length) * 100));

  return (
    <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.045] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black text-wc-fg1">כספת הסיסמה</p>
          <p className="mt-1 text-xs leading-5 text-wc-fg3">
            נבנה סיסמה שלא נשברת מ-123456 ודברים מביכים כאלה.
          </p>
        </div>
        <span
          className={[
            "rounded-full px-3 py-1 text-xs font-black",
            policy.passed
              ? "bg-wc-neon/15 text-wc-neon"
              : password
                ? "bg-amber-400/15 text-amber-200"
                : "bg-white/10 text-wc-fg3",
          ].join(" ")}
        >
          {password ? policy.label : "עוד לא התחלת"}
        </span>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
        <div
          className={[
            "h-full rounded-full transition-all duration-300",
            policy.passed
              ? "bg-wc-neon"
              : policy.score >= 4
                ? "bg-amber-300"
                : "bg-[color:var(--wc-danger)]",
          ].join(" ")}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <ul className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
        {policy.requirements.map((requirement) => (
          <li
            key={requirement.id}
            className={[
              "flex items-center gap-2 rounded-2xl px-3 py-2 transition-colors",
              requirement.passed
                ? "bg-wc-neon/10 text-wc-neon"
                : "bg-white/[0.035] text-wc-fg3",
            ].join(" ")}
          >
            <span
              className={[
                "grid h-5 w-5 shrink-0 place-items-center rounded-full text-[0.7rem] font-black",
                requirement.passed ? "bg-wc-neon text-black" : "bg-white/10 text-wc-fg3",
              ].join(" ")}
              aria-hidden="true"
            >
              {requirement.passed ? "✓" : "•"}
            </span>
            <span>{requirement.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
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
