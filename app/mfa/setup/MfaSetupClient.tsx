"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Enrollment = {
  authenticatorUri: string;
  factorId: string;
  qrCodeUrl: string;
  secret: string;
};

type EnrollmentPreparationResult =
  | { status: "ready"; enrollment: Enrollment }
  | { status: "already-verified" }
  | { status: "error"; message: string };

let enrollmentPreparationPromise: Promise<EnrollmentPreparationResult> | null = null;
let enrollmentPreparationUserId: string | null = null;

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

      const result = await getEnrollmentPreparation(supabase);

      if (!isActive) return;

      if (result.status === "already-verified") {
        setNotice("כבר מוגדר Authenticator לחשבון הזה. אפשר להמשיך למשחק.");
        setIsLoading(false);
        return;
      }

      if (result.status === "error") {
        setError(result.message);
        setIsLoading(false);
        return;
      }

      setEnrollment(result.enrollment);
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
      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
        factorId: enrollment.factorId,
        code,
      });

      if (verifyError) {
        if (isMissingFactorError(verifyError)) {
          resetEnrollmentPreparation();
          setCode("");
          setError("ה-QR הקודם כבר לא פעיל. יצרנו עכשיו QR חדש, סרוק אותו מחדש והזן את הקוד החדש.");
          await refreshEnrollmentAfterMissingFactor();
          return;
        }

        if (!isExpectedMfaSetupVerifyError(verifyError)) {
          console.error("[MfaSetupClient] TOTP setup verification failed", verifyError);
        }

        setError(getMfaSetupVerifyErrorMessage(verifyError));
        return;
      }

      window.location.assign(nextPath);
    } finally {
      setIsVerifying(false);
    }
  }

  async function refreshEnrollmentAfterMissingFactor() {
    setIsLoading(true);

    const result = await getEnrollmentPreparation(supabase, { forceFresh: true });

    if (result.status === "ready") {
      setEnrollment(result.enrollment);
    } else if (result.status === "already-verified") {
      setEnrollment(null);
      setNotice("כבר מוגדר Authenticator לחשבון הזה. אפשר להמשיך למשחק.");
    } else {
      setEnrollment(null);
      setError(result.message);
    }

    setIsLoading(false);
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
            סרוק את ה-QR עם אפליקציית אימות. מרגע שהחיבור יאומת, החשבון יבקש קוד נוסף
            בכל כניסה אחרי הסיסמה.
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
            <div className="grid gap-6 md:grid-cols-[270px_1fr] md:items-start">
              <div className="space-y-4">
                <div className="mx-auto aspect-square w-full max-w-[270px] rounded-[1.75rem] border border-white/10 bg-white p-4 shadow-[0_24px_70px_rgba(0,0,0,0.35)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={enrollment.qrCodeUrl}
                    alt="קוד QR לחיבור Authenticator"
                    className="block aspect-square w-full"
                    onError={() => {
                      setError(
                        "לא הצלחנו להציג את תמונת ה-QR. אפשר להשתמש ב-secret הידני או לרענן ליצירת QR חדש.",
                      );
                    }}
                  />
                </div>

                <a
                  href={enrollment.authenticatorUri}
                  className="wc-button-secondary block rounded-2xl px-4 py-3 text-center text-xs"
                >
                  בטלפון? פתיחה באפליקציית אימות
                </a>
              </div>

              <div className="text-start">
                <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-4">
                  <p className="text-sm font-black text-wc-fg1">איזו אפליקציה אפשר להוריד?</p>
                  <p className="mt-2 text-xs leading-6 text-wc-fg3">
                    כל אפליקציית TOTP טובה תעבוד. הכי פשוט להתחיל עם אחת מאלה:
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-wc-fg2">
                    <span className="rounded-full bg-white/8 px-3 py-1.5">Google Authenticator</span>
                    <span className="rounded-full bg-white/8 px-3 py-1.5">Microsoft Authenticator</span>
                    <span className="rounded-full bg-white/8 px-3 py-1.5">2FAS Auth</span>
                    <span className="rounded-full bg-white/8 px-3 py-1.5">1Password</span>
                  </div>
                </div>

                <p className="mt-5 text-sm font-black text-wc-fg1">לא מצליח לסרוק?</p>
                <p className="mt-2 text-xs leading-6 text-wc-fg3">
                  אפשר להזין ידנית את ה-secret הבא באפליקציית ה-Authenticator. אל תשתף אותו עם אף אחד.
                </p>
                <p className="mt-3 text-xs font-black uppercase tracking-[0.22em] text-wc-fg3">
                  secret
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

function getQrImageSource(qrCode: string) {
  const trimmedQrCode = qrCode.trim();

  if (!trimmedQrCode) {
    return null;
  }

  if (trimmedQrCode.startsWith("data:image/")) {
    return trimmedQrCode;
  }

  if (trimmedQrCode.startsWith("<svg")) {
    return `data:image/svg+xml;utf8,${encodeURIComponent(trimmedQrCode)}`;
  }

  if (trimmedQrCode.toLowerCase().startsWith("%3csvg")) {
    return `data:image/svg+xml;utf8,${trimmedQrCode}`;
  }

  return null;
}

function isMissingFactorError(error: { code?: string; message?: string }) {
  return (
    error.code === "mfa_factor_not_found" ||
    (error.message ?? "").toLowerCase().includes("factor not found")
  );
}

async function getEnrollmentPreparation(
  supabase: ReturnType<typeof createClient>,
  options?: { forceFresh?: boolean },
) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    resetEnrollmentPreparation();
    return {
      status: "error",
      message: "לא הצלחנו לזהות את החשבון המחובר. נסה להתחבר מחדש.",
    } satisfies EnrollmentPreparationResult;
  }

  if (
    options?.forceFresh ||
    !enrollmentPreparationPromise ||
    enrollmentPreparationUserId !== user.id
  ) {
    enrollmentPreparationUserId = user.id;
    enrollmentPreparationPromise = prepareTotpEnrollment(supabase);
  }

  return enrollmentPreparationPromise;
}

async function prepareTotpEnrollment(
  supabase: ReturnType<typeof createClient>,
): Promise<EnrollmentPreparationResult> {
  const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();

  if (factorsError) {
    return {
      status: "error",
      message: "לא הצלחנו לבדוק את הגדרות ה-Authenticator של החשבון.",
    };
  }

  if ((factors?.totp?.length ?? 0) > 0) {
    return { status: "already-verified" };
  }

  const pendingTotpFactors =
    factors?.all?.filter(
      (factor) => factor.factor_type === "totp" && factor.status === "unverified",
    ) ?? [];

  for (const factor of pendingTotpFactors) {
    const { error: unenrollError } = await supabase.auth.mfa.unenroll({
      factorId: factor.id,
    });

    if (unenrollError && !isMissingFactorError(unenrollError)) {
      return {
        status: "error",
        message: "לא הצלחנו לנקות ניסיון Authenticator קודם. נסה להתנתק ולהיכנס שוב.",
      };
    }
  }

  const { data, error: enrollError } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "Moran 65",
    issuer: "Moran 65",
  });

  const qrCodeUrl = data?.totp ? getQrImageSource(data.totp.qr_code) : null;

  if (enrollError || !data?.totp || !qrCodeUrl) {
    return {
      status: "error",
      message: "לא הצלחנו ליצור קוד QR ל-Authenticator. נסה לרענן או להתחבר מחדש.",
    };
  }

  return {
    status: "ready",
    enrollment: {
      authenticatorUri: data.totp.uri,
      factorId: data.id,
      qrCodeUrl,
      secret: data.totp.secret,
    },
  };
}

function resetEnrollmentPreparation() {
  enrollmentPreparationPromise = null;
  enrollmentPreparationUserId = null;
}

function isExpectedMfaSetupVerifyError(error: { code?: string; message?: string; status?: number }) {
  const message = (error.message ?? "").toLowerCase();

  return (
    isMissingFactorError(error) ||
    error.code === "mfa_verification_failed" ||
    error.code === "mfa_challenge_expired" ||
    error.status === 422 ||
    message.includes("invalid") ||
    message.includes("expired") ||
    message.includes("verification")
  );
}

function getMfaSetupVerifyErrorMessage(error: { code?: string; message?: string; status?: number }) {
  const message = (error.message ?? "").toLowerCase();

  if (
    error.code === "mfa_verification_failed" ||
    error.code === "mfa_challenge_expired" ||
    error.status === 422 ||
    message.includes("invalid") ||
    message.includes("expired") ||
    message.includes("verification")
  ) {
    return "הקוד לא תקין או שכבר התחלף. פתח את אפליקציית האימות והזן את הקוד החדש שמופיע עכשיו.";
  }

  return "לא הצלחנו לאמת את ה-Authenticator כרגע. נסה לרענן את המסך ולסרוק קוד חדש.";
}
