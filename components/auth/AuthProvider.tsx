"use client";

import { createContext, startTransition, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
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

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = {
  children: React.ReactNode;
  initialUser: User | null;
  initialProfile: AuthProfile | null;
};

export function AuthProvider({
  children,
  initialUser,
  initialProfile,
}: AuthProviderProps) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [user, setUser] = useState<User | null>(initialUser);
  const [profile, setProfile] = useState<AuthProfile | null>(initialProfile);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    startTransition(() => {
      setUser(initialUser);
      setProfile(initialProfile);
    });
  }, [initialProfile, initialUser]);

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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
