"use client";

import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  fetchAuthProfile,
  resolveDisplayName,
  type AuthProfile,
} from "@/lib/supabase/auth-profile";

type AuthContextValue = {
  user: User | null;
  profile: AuthProfile | null;
  displayName: string;
  isAuthenticated: boolean;
  isSigningOut: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

export type MfaGateState = "checking" | "clear" | "challenge";

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = {
  children: React.ReactNode;
  initialMfaGateState: MfaGateState;
  initialUser: User | null;
  initialProfile: AuthProfile | null;
};

const AUTH_USER_VALIDATION_INTERVAL_MS = 10_000;

export function AuthProvider({
  children,
  initialMfaGateState,
  initialUser,
  initialProfile,
}: AuthProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [supabase] = useState(() => createClient());
  const [user, setUser] = useState<User | null>(initialUser);
  const [profile, setProfile] = useState<AuthProfile | null>(initialProfile);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [mfaGateState, setMfaGateState] = useState<MfaGateState>(() =>
    initialUser && !isMfaNeutralPath(pathname) ? initialMfaGateState : "clear",
  );
  const lastMfaCheckedUserIdRef = useRef<string | null>(
    initialUser && initialMfaGateState !== "checking" ? initialUser.id : null,
  );
  const mfaGateStateRef = useRef(mfaGateState);
  const authValidationInFlightRef = useRef(false);

  useEffect(() => {
    mfaGateStateRef.current = mfaGateState;
  }, [mfaGateState]);

  useEffect(() => {
    startTransition(() => {
      setUser(initialUser);
      setProfile(initialProfile);
    });
  }, [initialProfile, initialUser]);

  useEffect(() => {
    startTransition(() => {
      setMfaGateState(initialUser && !isMfaNeutralPath(pathname) ? initialMfaGateState : "clear");
    });

    if (initialUser && initialMfaGateState !== "checking") {
      lastMfaCheckedUserIdRef.current = initialUser.id;
    } else if (!initialUser) {
      lastMfaCheckedUserIdRef.current = null;
    }
  }, [initialMfaGateState, initialUser, pathname]);

  const clearLocalDeletedUserSession = useEffectEvent(async () => {
    await supabase.auth.signOut({ scope: "local" });

    lastMfaCheckedUserIdRef.current = null;

    startTransition(() => {
      setUser(null);
      setProfile(null);
      setMfaGateState("clear");
    });

    router.refresh();
  });

  useEffect(() => {
    let isActive = true;

    async function syncProfile(nextUser: User | null) {
      if (!nextUser) {
        if (isActive) {
          startTransition(() => {
            setProfile(null);
          });
        }
        return;
      }

      const nextProfile = await fetchAuthProfile(supabase, nextUser.id);

      if (!isActive) {
        return;
      }

      startTransition(() => {
        setProfile(nextProfile);
      });
    }

    void supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
      startTransition(() => {
        setUser(currentUser ?? null);
      });

      void syncProfile(currentUser ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;

      startTransition(() => {
        setUser(nextUser);
      });

      void syncProfile(nextUser);
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!user) {
      return;
    }

    let isActive = true;
    const validatingUserId = user.id;

    async function validateServerUser() {
      if (authValidationInFlightRef.current) {
        return;
      }

      authValidationInFlightRef.current = true;

      try {
        const {
          data: { user: serverUser },
          error,
        } = await supabase.auth.getUser();

        if (!isActive) {
          return;
        }

        if (error || !serverUser || serverUser.id !== validatingUserId) {
          await clearLocalDeletedUserSession();
        }
      } finally {
        authValidationInFlightRef.current = false;
      }
    }

    function validateWhenVisible() {
      if (document.visibilityState === "visible") {
        void validateServerUser();
      }
    }

    const intervalId = window.setInterval(
      () => void validateServerUser(),
      AUTH_USER_VALIDATION_INTERVAL_MS,
    );

    window.addEventListener("focus", validateWhenVisible);
    document.addEventListener("visibilitychange", validateWhenVisible);
    void validateServerUser();

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", validateWhenVisible);
      document.removeEventListener("visibilitychange", validateWhenVisible);
    };
  }, [router, supabase, user]);

  useEffect(() => {
    let isActive = true;

    if (!user) {
      lastMfaCheckedUserIdRef.current = null;
      startTransition(() => {
        setMfaGateState("clear");
      });
      return () => {
        isActive = false;
      };
    }

    if (isMfaNeutralPath(pathname)) {
      startTransition(() => {
        setMfaGateState("clear");
      });
      return () => {
        isActive = false;
      };
    }

    if (
      lastMfaCheckedUserIdRef.current === user.id &&
      mfaGateStateRef.current !== "checking"
    ) {
      return () => {
        isActive = false;
      };
    }

    startTransition(() => {
      setMfaGateState("checking");
    });

    void supabase.auth.mfa
      .getAuthenticatorAssuranceLevel()
      .then(({ data, error }) => {
        if (!isActive) return;

        if (error) {
          console.error("[AuthProvider] MFA assurance check failed:", error);
          setMfaGateState("challenge");
          return;
        }

        const nextMfaGateState =
          data?.nextLevel === "aal2" && data.currentLevel !== data.nextLevel
            ? "challenge"
            : "clear";

        lastMfaCheckedUserIdRef.current = user.id;
        setMfaGateState(nextMfaGateState);
      });

    return () => {
      isActive = false;
    };
  }, [pathname, supabase, user]);

  async function refreshProfile() {
    if (!user) {
      startTransition(() => {
        setProfile(null);
      });
      return;
    }

    const nextProfile = await fetchAuthProfile(supabase, user.id);

    startTransition(() => {
      setProfile(nextProfile);
    });
  }

  async function signOut() {
    setIsSigningOut(true);

    try {
      await supabase.auth.signOut();

      startTransition(() => {
        setUser(null);
        setProfile(null);
      });

      router.push("/login");
      router.refresh();
    } finally {
      setIsSigningOut(false);
    }
  }

  const value: AuthContextValue = {
    user,
    profile,
    displayName: resolveDisplayName(profile, user),
    isAuthenticated: Boolean(user),
    isSigningOut,
    refreshProfile,
    signOut,
  };

  const shouldShowMfaGate =
    Boolean(user) && !isMfaNeutralPath(pathname) && mfaGateState === "challenge";
  const shouldHideForMfaCheck =
    Boolean(user) && !isMfaNeutralPath(pathname) && mfaGateState === "checking";

  return (
    <AuthContext.Provider value={value}>
      {shouldShowMfaGate ? (
        <MfaChallengeScreen
          onSuccess={() => {
            lastMfaCheckedUserIdRef.current = user?.id ?? null;
            setMfaGateState("clear");
            router.refresh();
          }}
          onSignOut={signOut}
          supabase={supabase}
        />
      ) : shouldHideForMfaCheck ? (
        <MfaCheckingScreen />
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

function MfaCheckingScreen() {
  return (
    <main className="wc-page flex min-h-screen items-center justify-center px-4 py-10">
      <div className="wc-glass w-full max-w-md rounded-[2rem] p-7 text-center sm:p-8">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl border border-wc-neon/25 bg-wc-neon/10 text-2xl">
          🔐
        </div>
        <p className="mt-5 text-sm font-black text-wc-fg1">מאמתים את שכבת האבטחה</p>
        <p className="mt-2 text-xs leading-6 text-wc-fg3">
          רגע קצר, בודקים אם החשבון צריך קוד נוסף לפני שנציג תוכן אישי.
        </p>
      </div>
    </main>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}

function isMfaNeutralPath(pathname: string) {
  return (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/auth/callback") ||
    pathname.startsWith("/mfa/setup")
  );
}

function MfaChallengeScreen({
  onSignOut,
  onSuccess,
  supabase,
}: {
  onSignOut: () => Promise<void>;
  onSuccess: () => void;
  supabase: ReturnType<typeof createClient>;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  async function handleVerify(event: React.FormEvent) {
    event.preventDefault();

    if (code.length !== 6) {
      setError("צריך להזין קוד בן 6 ספרות מאפליקציית ה-Authenticator.");
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
      const factor = factors?.totp?.[0] ?? null;

      if (factorsError || !factor) {
        setError("לא מצאנו Authenticator פעיל לחשבון הזה. נסה להתחבר מחדש.");
        return;
      }

      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
        factorId: factor.id,
        code,
      });

      if (verifyError) {
        setError("הקוד לא תקין או שכבר פג תוקפו. נסה קוד חדש מהאפליקציה.");
        return;
      }

      onSuccess();
    } finally {
      setIsVerifying(false);
    }
  }

  return (
    <main className="wc-page flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-7 text-center">
          <div className="wc-badge mx-auto w-fit text-sm text-wc-fg2">
            <span className="text-wc-neon">✦</span>
            <span>אימות נוסף לחשבון מוגן</span>
          </div>
          <div className="mt-5 text-5xl">🛡️</div>
          <h1 className="wc-display mt-4 text-5xl text-wc-fg1">Authenticator</h1>
          <p className="mt-3 text-sm leading-7 text-wc-fg2">
            החשבון הזה נרשם עם שכבת הגנה נוספת. הזן את הקוד שמופיע עכשיו
            באפליקציית האימות כדי להמשיך.
          </p>
        </div>

        <div className="wc-glass rounded-[2rem] p-6 sm:p-8">
          <form onSubmit={handleVerify} className="flex flex-col gap-4">
            <label htmlFor="mfa-code" className="text-sm font-semibold text-wc-fg2">
              קוד בן 6 ספרות
            </label>
            <input
              id="mfa-code"
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
              {isVerifying ? "בודק קוד..." : "אימות והמשך"}
            </button>
          </form>

          <button
            type="button"
            onClick={() => void onSignOut()}
            className="mt-4 w-full rounded-[1.1rem] border border-white/10 px-4 py-3 text-sm font-bold text-wc-fg2 transition hover:border-white/20 hover:text-wc-fg1"
          >
            התחברות עם חשבון אחר
          </button>
        </div>
      </div>
    </main>
  );
}
