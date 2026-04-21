"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useState } from "react";

const S = {
  input: {
    fontFamily: "var(--wc-font-body)",
    fontSize: 14,
    background: "var(--wc-raised)",
    border: "1.5px solid var(--wc-border)",
    borderRadius: 12,
    color: "var(--wc-fg1)",
    padding: "12px 14px",
    outline: "none",
    width: "100%",
    transition: "border-color 150ms, box-shadow 150ms",
  } as React.CSSProperties,
};

export default function SignupPage() {
  const supabase = createClient();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState<string | null>(null);
  const [success,  setSuccess]  = useState(false);
  const [loading,  setLoading]  = useState(false);

  function focusInput(e: React.FocusEvent<HTMLInputElement>) {
    e.target.style.borderColor = "var(--wc-neon)";
    e.target.style.boxShadow   = "0 0 0 3px var(--wc-neon-glow)";
  }
  function blurInput(e: React.FocusEvent<HTMLInputElement>) {
    e.target.style.borderColor = "var(--wc-border)";
    e.target.style.boxShadow   = "none";
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError(error.message === "User already registered" ? "אימייל זה כבר רשום" : "שגיאה בהרשמה, נסה שוב");
    } else {
      setSuccess(true);
    }
    setLoading(false);
  }

  async function handleGoogleLogin() {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setError("שגיאה בהתחברות עם Google");
    setLoading(false);
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4" style={{ background: "var(--wc-bg)" }}>
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">📧</div>
          <h2
            className="text-xl font-black mb-2"
            style={{ fontFamily: "var(--font-display)", color: "var(--wc-fg1)" }}
          >
            בדוק את האימייל שלך
          </h2>
          <p className="text-sm" style={{ color: "var(--wc-fg2)" }}>
            שלחנו לך קישור אימות ל-{email}. לאחר אישור תוכל להתחבר.
          </p>
          <Link
            href="/login"
            className="inline-block mt-6 text-sm font-semibold underline underline-offset-2"
            style={{ color: "var(--wc-neon)" }}
          >
            חזרה לדף ההתחברות
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ background: "var(--wc-bg)" }}>
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">⚽</div>
          <h1
            className="text-3xl font-black"
            style={{ fontFamily: "var(--font-display)", color: "var(--wc-fg1)" }}
          >
            הרשמה
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--wc-fg2)" }}>
            מונדיאל 2026 — תחזיות
          </p>
        </div>

        {/* Card */}
        <div
          className="flex flex-col gap-4 p-6 rounded-2xl"
          style={{
            background: "var(--wc-surface)",
            border: "1px solid var(--wc-border)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
          }}
        >
          {/* Google */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="flex items-center justify-center gap-3 w-full py-3 px-4 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
            style={{
              background: "var(--wc-raised)",
              border: "1px solid var(--wc-border)",
              color: "var(--wc-fg1)",
            }}
          >
            <GoogleIcon />
            המשך עם Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: "var(--wc-border)" }} />
            <span className="text-xs" style={{ color: "var(--wc-fg3)" }}>או</span>
            <div className="flex-1 h-px" style={{ background: "var(--wc-border)" }} />
          </div>

          {/* Form */}
          <form onSubmit={handleSignup} className="flex flex-col gap-3">
            <input
              type="email"
              placeholder="אימייל"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={S.input}
              onFocus={focusInput}
              onBlur={blurInput}
            />
            <input
              type="password"
              placeholder="סיסמה (לפחות 6 תווים)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              style={S.input}
              onFocus={focusInput}
              onBlur={blurInput}
            />

            {error && (
              <p
                className="text-sm text-center py-2 px-3 rounded-lg"
                style={{ background: "var(--wc-danger-bg)", color: "var(--wc-danger)" }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
              style={{
                background: "var(--wc-neon)",
                color: "var(--wc-fg-inverse)",
                boxShadow: loading ? "none" : "0 0 16px var(--wc-neon-glow)",
              }}
            >
              {loading ? "נרשם..." : "יצירת חשבון"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm mt-5" style={{ color: "var(--wc-fg3)" }}>
          יש לך חשבון?{" "}
          <Link
            href="/login"
            className="font-semibold underline underline-offset-2"
            style={{ color: "var(--wc-neon)" }}
          >
            התחברות
          </Link>
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
    </svg>
  );
}
