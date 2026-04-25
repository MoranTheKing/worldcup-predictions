"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Enrollment = {
  factorId: string;
  qrCodeUrl: string;
  secret: string;
};

export default function MfaSetupClient({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function prepareEnrollment() {
      setIsLoading(true);
      setError(null);

      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();

      if (!isActive) return;

      if (factorsError) {
        setError("לא הצלחנו לבדוק את הגדרות ה-Authenticator של החשבון.");
        setIsLoading(false);
        return;
      }

      if ((factors?.totp?.length ?? 0) > 0) {
        setNotice("כבר מוגדר Authenticator לחשבון הזה. אפשר להמשיך למשחק.");
        setIsLoading(false);
        return;
      }

      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Moran 65 Authenticator",
        issuer: "Moran 65",
      });

      if (!isActive) return;

      if (enrollError || !data?.totp) {
        setError("לא הצלחנו ליצור קוד QR ל-Authenticator. נסה לרענן או להתחבר מחדש.");
        setIsLoading(false);
        return;
      }

      setEnrollment({
        factorId: data.id,
        qrCodeUrl: `data:image/svg+xml;utf-8,${encodeURIComponent(data.totp.qr_code)}`,
        secret: data.totp.secret,
      });
      setIsLoading(false);
    }

    void prepareEnrollment();

    return () => {
      isActive = false;
    };
  }, [supabase]);

  async function handleVerify(event: React.FormEvent) {
    event.preventDefault();

    if (!enrollment || code.length !== 6) {
      setError("צריך להזין קוד בן 6 ספרות מאפליקציית ה-Authenticator.");
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: enrollment.factorId,
      });

      if (challengeError || !challenge?.id) {
        setError("לא הצלחנו להתחיל אימות מול Authenticator. נסה שוב.");
        return;
      }

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: enrollment.factorId,
        challengeId: challenge.id,
        code,
      });

      if (verifyError) {
        setError("הקוד לא תקין או שכבר פג תוקפו. פתח את האפליקציה והזן קוד חדש.");
        return;
      }

      window.location.assign(nextPath);
    } finally {
      setIsVerifying(false);
    }
  }

  return (
    <main className="wc-page flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl">
        <div className="mb-7 text-center">
          <div className="wc-badge mx-auto w-fit text-sm text-wc-fg2">
            <span className="text-wc-neon">✦</span>
            <span>הגנה נוספת לחשבון</span>
          </div>
          <div className="mt-5 text-5xl">🔐</div>
          <h1 className="wc-display mt-4 text-5xl text-wc-fg1">חיבור Authenticator</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-wc-fg2">
            סרוק את הקוד עם Google Authenticator, Microsoft Authenticator או אפליקציה דומה.
            מרגע שהחיבור יאומת, החשבון יבקש קוד נוסף בכל כניסה אחרי הסיסמה.
          </p>
        </div>

        <div className="wc-glass rounded-[2rem] p-6 sm:p-8">
          {isLoading ? (
            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.045] px-4 py-6 text-center text-sm text-wc-fg2">
              מכינים קוד QR מאובטח...
            </div>
          ) : notice ? (
            <div className="space-y-4 text-center">
              <p className="rounded-2xl border border-wc-neon/25 bg-wc-neon/10 px-4 py-3 text-sm text-wc-neon">
                {notice}
              </p>
              <button
                type="button"
                onClick={() => router.push(nextPath)}
                className="wc-button-primary w-full px-4 py-3.5 text-sm"
              >
                המשך
              </button>
            </div>
          ) : enrollment ? (
            <div className="grid gap-6 md:grid-cols-[260px_1fr] md:items-center">
              <div className="rounded-[1.75rem] border border-white/10 bg-white p-4 shadow-[0_24px_70px_rgba(0,0,0,0.35)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={enrollment.qrCodeUrl} alt="קוד QR לחיבור Authenticator" className="h-full w-full" />
              </div>

              <div className="text-start">
                <p className="text-sm font-black text-wc-fg1">לא מצליח לסרוק?</p>
                <p className="mt-2 text-xs leading-6 text-wc-fg3">
                  אפשר להזין ידנית את הסוד הבא באפליקציית ה-Authenticator. אל תשתף אותו עם אף אחד.
                </p>
                <code
                  dir="ltr"
                  className="mt-3 block break-all rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-wc-neon"
                >
                  {enrollment.secret}
                </code>

                <form onSubmit={handleVerify} className="mt-5 flex flex-col gap-3">
                  <label htmlFor="setup-mfa-code" className="text-sm font-semibold text-wc-fg2">
                    הזן את הקוד הראשון שמופיע באפליקציה
                  </label>
                  <input
                    id="setup-mfa-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    dir="ltr"
                    maxLength={6}
                    value={code}
                    onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="wc-input text-center text-2xl font-black tracking-[0.45em] text-wc-fg1"
                    placeholder="000000"
                    required
                  />

                  {error ? (
                    <p className="rounded-2xl bg-[color:var(--wc-danger-bg)] px-4 py-3 text-center text-sm text-wc-danger">
                      {error}
                    </p>
                  ) : null}

                  <button
                    type="submit"
                    disabled={isVerifying || code.length !== 6}
                    className="wc-button-primary w-full px-4 py-3.5 text-sm disabled:opacity-50"
                  >
                    {isVerifying ? "מאמת..." : "אמת Authenticator והמשך"}
                  </button>
                </form>
              </div>
            </div>
          ) : error ? (
            <div className="space-y-4 text-center">
              <p className="rounded-2xl bg-[color:var(--wc-danger-bg)] px-4 py-3 text-sm text-wc-danger">
                {error}
              </p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="wc-button-secondary w-full px-4 py-3.5 text-sm"
              >
                נסה שוב
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
