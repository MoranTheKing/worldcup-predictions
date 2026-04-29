"use client";

import { createClient } from "@/lib/supabase/client";
import { getPostOnboardingRedirectPath } from "@/lib/security/safe-redirect";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

type LoginError = {
  code?: string;
  message?: string;
};

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const nextPath = getPostOnboardingRedirectPath(searchParams.get("next"));
  const signupHref =
    nextPath === "/game" ? "/signup" : `/signup?next=${encodeURIComponent(nextPath)}`;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(getLoginErrorMessage(authError));
    } else {
      router.push(nextPath);
      router.refresh();
    }

    setLoading(false);
  }

  async function handleGoogleLogin() {
    setLoading(true);
    setError(null);

    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?flow=login&next=${encodeURIComponent(nextPath)}`,
      },
    });

    if (authError) {
      setError("שגיאה בהתחברות עם Google");
      setLoading(false);
    }
  }

  return (
    <main className="wc-page flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="wc-badge mx-auto w-fit text-sm text-wc-fg2">
            <span className="text-wc-magenta">✦</span>
            <span>כניסה לאפליקציית התחזיות</span>
          </div>
          <div className="mt-5 text-5xl">🏆</div>
          <h1 className="wc-display mt-4 text-5xl text-wc-fg1">מונדיאל 2026</h1>
          <p className="mt-3 text-sm leading-7 text-wc-fg2">
            התחבר כדי להמשיך לליגות, תחזיות ודפים אישיים מתוך session גלובלי אחד.
          </p>
        </div>

        <div className="wc-glass rounded-[2rem] p-6 sm:p-8">
          <div className="mb-6 text-center sm:text-start">
            <p className="text-sm font-semibold text-wc-neon">התחברות מאובטחת</p>
            <p className="mt-2 text-sm text-wc-fg3">אפשר להיכנס עם Google או עם מייל וסיסמה.</p>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="wc-button-secondary flex w-full items-center justify-center gap-3 rounded-2xl px-4 py-3.5 text-sm disabled:opacity-50"
          >
            <GoogleIcon />
            המשך עם Google
          </button>
          <p className="mt-3 rounded-[1.2rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-xs leading-5 text-wc-fg3">
            זו כניסה לחשבון שכבר נרשם. אם זו הפעם הראשונה שלך עם Google, נעביר אותך למסך הרשמה ונבקש להשלים פרופיל.
          </p>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs text-wc-fg3">או</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <form onSubmit={handleEmailLogin} className="flex flex-col gap-3">
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
              placeholder="סיסמה"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="wc-input text-start"
            />

            <p className="rounded-[1.2rem] border border-white/10 bg-white/[0.045] px-4 py-3 text-xs leading-5 text-wc-fg3">
              אם החשבון שלך נרשם עם Authenticator, אחרי בדיקת הסיסמה יופיע מסך
              להזנת קוד בן 6 ספרות. משתמשים בלי Authenticator לא יראו את השלב הזה.
            </p>

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
              {loading ? "מתחבר..." : "כניסה"}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-wc-fg3">
          אין לך חשבון?{" "}
          <Link href={signupHref} className="font-semibold text-wc-neon underline underline-offset-4">
            הרשמה
          </Link>
        </p>
      </div>
    </main>
  );
}

function getLoginErrorMessage(error: LoginError) {
  const message = (error.message ?? "").toLowerCase();

  if (error.code === "weak_password" || message.includes("weak password")) {
    return "הסיסמה של החשבון חלשה מדי לפי מדיניות האבטחה החדשה. צריך לאפס סיסמה לסיסמה חזקה יותר, או להיכנס דרך Google אם החשבון מחובר אליו.";
  }

  return "האימייל או הסיסמה שגויים";
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
