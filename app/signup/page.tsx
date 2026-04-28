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
import { useEffect, useState } from "react";

const CODE_LENGTH = 6;
const EMAIL_CODE_COOLDOWN_SECONDS = 60;
const MFA_SETUP_REQUESTED_METADATA_KEY = "mfa_setup_requested";

type SignupError = {
  code?: string;
  message?: string;
  status?: number;
};

type EmailCodeCooldown = {
  email: string;
  seconds: number;
};

type PendingEmailFlow = "new_signup" | "existing_account_password";

type SignupAuthData = {
  session?: unknown | null;
  user?: {
    identities?: unknown[] | null;
  } | null;
};

export default function SignupPage() {
  const searchParams = useSearchParams();
  const supabase = createClient();
  const nextPath = getSafeRedirectPath(searchParams.get("next"));
  const signupNotice = getSignupNotice(searchParams.get("notice"));
  const loginHref =
    nextPath === "/game" ? "/login" : `/login?next=${encodeURIComponent(nextPath)}`;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [wantsAuthenticator, setWantsAuthenticator] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [pendingEmailFlow, setPendingEmailFlow] = useState<PendingEmailFlow>("new_signup");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(signupNotice);
  const [loading, setLoading] = useState(false);
  const [emailCodeCooldown, setEmailCodeCooldown] = useState<EmailCodeCooldown | null>(null);
  const passwordPolicy = evaluatePasswordPolicy(password, email.trim().toLowerCase());
  const hasPasswordConfirmation = passwordConfirmation.length > 0;
  const passwordConfirmationMatches = password === passwordConfirmation;
  const normalizedEmailInput = email.trim().toLowerCase();
  const signupCooldownSeconds = getEmailCooldownSeconds(emailCodeCooldown, normalizedEmailInput);
  const pendingCooldownSeconds = getEmailCooldownSeconds(emailCodeCooldown, pendingEmail);
  const signupBlockedByCooldown = signupCooldownSeconds > 0;

  useEffect(() => {
    if (!emailCodeCooldown) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setEmailCodeCooldown((current) => {
        if (!current) {
          return null;
        }

        if (current.seconds <= 1) {
          return null;
        }

        return {
          ...current,
          seconds: current.seconds - 1,
        };
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [emailCodeCooldown]);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);

    const normalizedEmail = email.trim().toLowerCase();
    const cooldownSeconds = getEmailCooldownSeconds(emailCodeCooldown, normalizedEmail);
    const passwordPolicyError = getPasswordPolicyError(password, normalizedEmail);

    if (cooldownSeconds > 0) {
      setError(getEmailCooldownMessage(cooldownSeconds));
      setLoading(false);
      return;
    }

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
        emailRedirectTo: `${window.location.origin}/auth/callback?flow=signup&next=${encodeURIComponent(buildPostSignupPath(wantsAuthenticator, nextPath))}`,
        data: { [MFA_SETUP_REQUESTED_METADATA_KEY]: wantsAuthenticator },
      },
    });

    if (authError && isExistingAccountSignupResponse(authError)) {
      await startExistingAccountPasswordFlow(normalizedEmail);
    } else if (authError) {
      if (isEmailSendCooldownError(authError)) {
        startEmailCodeCooldown(normalizedEmail);
      }

      setError(getSignupErrorMessage(authError));
    } else if (isExistingAccountSignupData(data)) {
      await startExistingAccountPasswordFlow(normalizedEmail);
    } else if (data.session) {
      window.location.assign(buildPostSignupPath(wantsAuthenticator, nextPath));
    } else {
      setPendingEmail(normalizedEmail);
      setPendingEmailFlow("new_signup");
      setVerificationCode("");
      setNotice("אם אפשר להמשיך עם הרשמה לכתובת הזו, שלחנו קוד אימות בן 6 ספרות לאימייל.");
      startEmailCodeCooldown(normalizedEmail);
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

    if (pendingEmailFlow === "existing_account_password") {
      const passwordPolicyError = getPasswordPolicyError(password, pendingEmail);

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
    }

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

    if (pendingEmailFlow === "existing_account_password") {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
        data: { [MFA_SETUP_REQUESTED_METADATA_KEY]: wantsAuthenticator },
      });

      if (updateError) {
        setError(getPasswordLinkErrorMessage(updateError));
        setLoading(false);
        return;
      }
    } else if (wantsAuthenticator) {
      const rememberedMfaChoice = await rememberMfaSetupChoice();

      if (!rememberedMfaChoice) {
        setLoading(false);
        return;
      }
    }

    window.location.assign(buildPostSignupPath(wantsAuthenticator, nextPath));
  }

  async function handleResendCode() {
    if (!pendingEmail) {
      return;
    }

    const cooldownSeconds = getEmailCooldownSeconds(emailCodeCooldown, pendingEmail);
    if (cooldownSeconds > 0) {
      setError(getEmailCooldownMessage(cooldownSeconds));
      return;
    }

    setLoading(true);
    setError(null);
    setNotice(null);

    if (pendingEmailFlow === "existing_account_password") {
      const otpSent = await sendExistingAccountOtp(pendingEmail);

      if (otpSent) {
        setNotice("שלחנו קוד חדש למייל. אחרי האימות נמשיך עם הכתובת הזו בצורה מאובטחת.");
        startEmailCodeCooldown(pendingEmail);
      }

      setLoading(false);
      return;
    }

    const { error: authError } = await supabase.auth.resend({
      type: "signup",
      email: pendingEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?flow=signup&next=${encodeURIComponent(buildPostSignupPath(wantsAuthenticator, nextPath))}`,
      },
    });

    if (authError) {
      if (isEmailSendCooldownError(authError)) {
        startEmailCodeCooldown(pendingEmail);
      }

      setError(getSignupErrorMessage(authError));
    } else {
      setNotice("אם הכתובת עדיין ממתינה לאימות, שלחנו קוד חדש. אם כבר יש לך חשבון, אפשר להתחבר במקום.");
      startEmailCodeCooldown(pendingEmail);
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
        redirectTo: `${window.location.origin}/auth/callback?flow=signup&next=${encodeURIComponent(buildPostSignupPath(wantsAuthenticator, nextPath))}`,
      },
    });

    if (authError) {
      setError("שגיאה בהתחברות עם Google");
      setLoading(false);
    }
  }

  function startEmailCodeCooldown(targetEmail: string) {
    const normalizedEmail = targetEmail.trim().toLowerCase();

    if (!normalizedEmail) {
      return;
    }

    setEmailCodeCooldown({
      email: normalizedEmail,
      seconds: EMAIL_CODE_COOLDOWN_SECONDS,
    });
  }

  async function startExistingAccountPasswordFlow(normalizedEmail: string) {
    const otpSent = await sendExistingAccountOtp(normalizedEmail);

    if (!otpSent) {
      return;
    }

    setPendingEmail(normalizedEmail);
    setPendingEmailFlow("existing_account_password");
    setPassword("");
    setPasswordConfirmation("");
    setVerificationCode("");
    setNotice(
      "שלחנו קוד אימות למייל. אחרי הקוד נמשיך עם הכתובת הזו בצורה מאובטחת.",
    );
    startEmailCodeCooldown(normalizedEmail);
  }

  async function sendExistingAccountOtp(normalizedEmail: string) {
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?flow=signup&next=${encodeURIComponent(buildPostSignupPath(wantsAuthenticator, nextPath))}`,
        shouldCreateUser: false,
      },
    });

    if (otpError) {
      if (isEmailSendCooldownError(otpError)) {
        startEmailCodeCooldown(normalizedEmail);
      }

      setError(getSignupErrorMessage(otpError));
      return false;
    }

    return true;
  }

  async function rememberMfaSetupChoice() {
    const { error: updateError } = await supabase.auth.updateUser({
      data: { [MFA_SETUP_REQUESTED_METADATA_KEY]: true },
    });

    if (updateError) {
      setError("אימתנו את המייל, אבל לא הצלחנו לשמור את בחירת ה-Authenticator. נסה להירשם שוב או להמשיך בלי שכבת האימות הנוספת.");
      return false;
    }

    return true;
  }

  if (pendingEmail) {
    const pendingEmailCopy =
      pendingEmailFlow === "existing_account_password"
        ? "קוד בן 6 ספרות מחכה באימייל. אחרי האימות נחבר את הסיסמה שבחרת ונמשיך לחשבון שלך."
        : "קוד בן 6 ספרות מחכה באימייל. אם כבר יש לך חשבון, אפשר להתחבר מיד בלי לחכות לקוד חדש.";

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
              {" "}
              {pendingEmailCopy}
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

              {pendingEmailFlow === "existing_account_password" && (
                <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-4 text-start">
                  <p className="text-sm font-black text-wc-fg1">חיבור סיסמה לחשבון הקיים</p>
                  <p className="mt-1 text-xs leading-5 text-wc-fg3">
                    אחרי שהקוד יאומת, נחבר את הסיסמה החדשה לחשבון שכבר קיים על האימייל הזה. מטעמי אבטחה אנחנו מבקשים להקליד אותה שוב כאן ולא שומרים אותה בזמן ההמתנה לקוד.
                  </p>
                  <div className="mt-4 flex flex-col gap-3">
                    <input
                      type="password"
                      placeholder={`סיסמה חזקה (${PASSWORD_MIN_LENGTH}+ תווים)`}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                      minLength={PASSWORD_MIN_LENGTH}
                      autoComplete="new-password"
                      className="wc-input text-start"
                    />
                    <input
                      type="password"
                      placeholder="אימות סיסמה"
                      value={passwordConfirmation}
                      onChange={(event) => setPasswordConfirmation(event.target.value)}
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
                  </div>
                </div>
              )}

              {notice && (
                <p className="rounded-2xl border border-wc-neon/25 bg-wc-neon/10 px-4 py-3 text-center text-sm text-wc-neon">
                  {notice}
                </p>
              )}

              {pendingCooldownSeconds > 0 && (
                <EmailCodeCooldownCard seconds={pendingCooldownSeconds} />
              )}

              {error && (
                <p className="rounded-2xl bg-[color:var(--wc-danger-bg)] px-4 py-3 text-center text-sm text-wc-danger">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={
                  loading ||
                  verificationCode.length !== CODE_LENGTH ||
                  (pendingEmailFlow === "existing_account_password" &&
                    (!passwordPolicy.passed || !passwordConfirmationMatches))
                }
                className="wc-button-primary mt-1 w-full px-4 py-3.5 text-sm disabled:opacity-50"
              >
                {loading ? "בודק את הקוד..." : "אמת קוד והמשך"}
              </button>
            </form>

            <div className="mt-5 flex flex-col items-center justify-center gap-3 text-sm text-wc-fg3 sm:flex-row">
              <button
                type="button"
                onClick={handleResendCode}
                disabled={loading || pendingCooldownSeconds > 0}
                className="font-semibold text-wc-neon underline underline-offset-4 disabled:opacity-50"
              >
                {pendingCooldownSeconds > 0
                  ? `אפשר לשלוח שוב בעוד ${formatCooldownSeconds(pendingCooldownSeconds)}`
                  : "שלח קוד חדש"}
              </button>
              <span className="hidden h-1 w-1 rounded-full bg-white/25 sm:block" />
              <button
                type="button"
                onClick={() => {
                  setPendingEmail(null);
                  setPendingEmailFlow("new_signup");
                  setPassword("");
                  setPasswordConfirmation("");
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
          {notice && (
            <p className="mb-4 rounded-2xl border border-wc-neon/25 bg-wc-neon/10 px-4 py-3 text-center text-sm leading-6 text-wc-neon">
              {notice}
            </p>
          )}

          <AuthenticatorSignupOption
            checked={wantsAuthenticator}
            onChange={setWantsAuthenticator}
          />

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="wc-button-secondary mt-4 flex w-full items-center justify-center gap-3 rounded-2xl px-4 py-3.5 text-sm disabled:opacity-50"
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

            {signupCooldownSeconds > 0 && (
              <EmailCodeCooldownCard seconds={signupCooldownSeconds} />
            )}

            {error && (
              <p className="rounded-2xl bg-[color:var(--wc-danger-bg)] px-4 py-3 text-center text-sm text-wc-danger">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={
                loading ||
                signupBlockedByCooldown ||
                !passwordPolicy.passed ||
                !passwordConfirmationMatches
              }
              className="wc-button-primary mt-2 w-full px-4 py-3.5 text-sm disabled:opacity-50"
            >
              {loading
                ? "שולח קוד..."
                : signupBlockedByCooldown
                  ? `אפשר לשלוח שוב בעוד ${formatCooldownSeconds(signupCooldownSeconds)}`
                  : "הרשמה וקבלת קוד"}
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
    return getEmailCooldownMessage(EMAIL_CODE_COOLDOWN_SECONDS);
  }

  if (
    error.status === 429 ||
    error.code === "over_request_rate_limit" ||
    message.includes("only request this after") ||
    message.includes("too many requests")
  ) {
    return getEmailCooldownMessage(EMAIL_CODE_COOLDOWN_SECONDS);
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

function getPasswordLinkErrorMessage(error: SignupError) {
  const message = (error.message ?? "").toLowerCase();

  if (
    error.code === "weak_password" ||
    message.includes("weak password") ||
    message.includes("password")
  ) {
    return "אימתנו את המייל, אבל הסיסמה עדיין לא עומדת בדרישות האבטחה. בחר סיסמה חזקה יותר ונסה שוב.";
  }

  if (
    message.includes("mfa") ||
    message.includes("aal2") ||
    message.includes("assurance") ||
    message.includes("authenticator")
  ) {
    return "אימתנו את המייל, אבל החשבון מוגן ב-Authenticator ולכן צריך להתחבר לחשבון הקיים ולהשלים את קוד האימות לפני עדכון הסיסמה.";
  }

  return "אימתנו את המייל, אבל לא הצלחנו לחבר את הסיסמה לחשבון הזה. נסה להתחבר לחשבון הקיים או לבחור סיסמה אחרת.";
}

function isEmailSendCooldownError(error: SignupError) {
  const message = (error.message ?? "").toLowerCase();

  return (
    error.status === 429 ||
    error.code === "over_email_send_rate_limit" ||
    error.code === "over_request_rate_limit" ||
    message.includes("email rate limit") ||
    message.includes("rate limit exceeded") ||
    message.includes("only request this after") ||
    message.includes("too many requests")
  );
}

function getEmailCooldownSeconds(
  cooldown: EmailCodeCooldown | null,
  targetEmail: string | null | undefined,
) {
  const normalizedEmail = targetEmail?.trim().toLowerCase();

  if (!cooldown || !normalizedEmail || cooldown.email !== normalizedEmail) {
    return 0;
  }

  return Math.max(0, cooldown.seconds);
}

function getEmailCooldownMessage(seconds: number) {
  return `שלחנו קוד ממש עכשיו. אפשר לבקש קוד חדש בעוד ${formatCooldownSeconds(seconds)}.`;
}

function formatCooldownSeconds(seconds: number) {
  return `${Math.max(1, seconds)} שניות`;
}

function EmailCodeCooldownCard({ seconds }: { seconds: number }) {
  const progress = Math.min(
    100,
    Math.max(0, ((EMAIL_CODE_COOLDOWN_SECONDS - seconds) / EMAIL_CODE_COOLDOWN_SECONDS) * 100),
  );

  return (
    <div className="rounded-[1.4rem] border border-wc-amber/25 bg-wc-amber/10 p-4 text-start">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black text-wc-fg1">הקוד בדרך אליך</p>
          <p className="mt-1 text-xs leading-5 text-wc-fg3">
            כדי לשמור על החשבון, אפשר לבקש קוד חדש בעוד רגע קצר.
          </p>
        </div>
        <span
          dir="ltr"
          className="rounded-full border border-wc-amber/30 bg-black/20 px-3 py-1 text-sm font-black text-wc-amber"
        >
          {seconds}s
        </span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,var(--wc-amber),var(--wc-neon))] transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function getSignupNotice(notice: string | null) {
  if (notice === "google_signup_required") {
    return "כדי להמשיך צריך להירשם קודם. אפשר לבחור Google כאן במסך ההרשמה, או להירשם עם מייל וסיסמה ולקבל קוד אימות רגיל.";
  }

  return null;
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

function isExistingAccountSignupData(data: SignupAuthData | null) {
  return (
    !data?.session &&
    Array.isArray(data?.user?.identities) &&
    data.user.identities.length === 0
  );
}

function buildOnboardingPath(nextPath: string) {
  return `/onboarding?next=${encodeURIComponent(nextPath)}`;
}

function buildPostSignupPath(wantsAuthenticator: boolean, nextPath: string) {
  const onboardingPath = buildOnboardingPath(nextPath);

  return wantsAuthenticator
    ? `/mfa/setup?next=${encodeURIComponent(onboardingPath)}`
    : onboardingPath;
}

function AuthenticatorSignupOption({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="group flex cursor-pointer gap-3 rounded-[1.4rem] border border-wc-neon/20 bg-wc-neon/[0.06] p-4 text-start shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:border-wc-neon/45 hover:bg-wc-neon/10">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 accent-[var(--wc-neon)]"
      />
      <span>
        <span className="block text-sm font-black text-wc-fg1">
          הגנה נוספת עם אפליקציית אימות
        </span>
        <span className="mt-1 block text-xs leading-5 text-wc-fg3">
          מומלץ אבטחתית: אחרי ההרשמה נחבר אפליקציית אימות, ובכניסות הבאות נבקש גם
          סיסמה וגם קוד חד-פעמי בן 6 ספרות. הבחירה חלה גם על Google וגם על מייל וסיסמה.
        </span>
      </span>
    </label>
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
