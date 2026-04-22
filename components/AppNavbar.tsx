"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";

const HIDE_ON_PREFIXES = ["/dashboard", "/dev-tools"];

export default function AppNavbar() {
  const pathname = usePathname();
  const { displayName, isAuthenticated, isSigningOut, signOut } = useAuth();

  const shouldHide = HIDE_ON_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (shouldHide) {
    return null;
  }

  return (
    <header className="border-b border-white/8 bg-[rgba(8,11,24,0.86)] backdrop-blur-xl">
      <div className="wc-shell flex items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Link href="/" className="wc-display text-2xl text-wc-fg1 sm:text-3xl">
            מונדיאל 2026
          </Link>
          <Link
            href="/dashboard/tournament"
            className="hidden rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-wc-fg2 transition hover:border-wc-neon/50 hover:text-wc-fg1 sm:inline-flex"
          >
            טבלת הטורניר
          </Link>
        </div>

        {isAuthenticated ? (
          <div className="flex items-center gap-3">
            <span className="hidden text-sm font-semibold text-wc-fg2 sm:inline">
              {displayName}
            </span>
            <button
              onClick={signOut}
              disabled={isSigningOut}
              className="wc-button-secondary px-4 py-2 text-sm disabled:opacity-50"
            >
              {isSigningOut ? "מתנתק..." : "Logout"}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link href="/signup" className="wc-button-secondary px-4 py-2 text-sm">
              Sign up
            </Link>
            <Link href="/login" className="wc-button-primary px-4 py-2 text-sm">
              Login
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
