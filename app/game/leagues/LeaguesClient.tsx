"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createLeague, joinLeague, type LeagueActionState } from "@/app/actions/league";

export type LeagueRow = {
  id: string;
  name: string;
  invite_code: string | null;
  owner_id: string | null;
  created_at: string | null;
};

// ── Shared helpers ──────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="rounded-xl px-3 py-2 text-sm font-semibold"
      style={{ background: "var(--wc-danger-bg)", color: "var(--wc-danger)" }}
    >
      {message}
    </p>
  );
}

// ── Create League form ──────────────────────────────────────────────────────

function CreateLeagueForm() {
  const [state, action, isPending] = useActionState<LeagueActionState, FormData>(
    createLeague,
    null
  );

  return (
    <form
      action={action}
      className="rounded-2xl p-5 flex flex-col gap-4"
      style={{ background: "var(--wc-surface)", border: "1px solid var(--wc-border)" }}
    >
      <div className="flex items-center gap-3">
        <span className="text-3xl">➕</span>
        <div>
          <p className="text-sm font-bold" style={{ color: "var(--wc-fg1)" }}>
            יצירת ליגה חדשה
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--wc-fg2)" }}>
            קבל קוד הצטרפות ייחודי לשתף עם חברים
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold" style={{ color: "var(--wc-fg2)" }}>
          שם הליגה
        </label>
        <input
          name="name"
          type="text"
          required
          maxLength={60}
          placeholder="למשל: ליגת חברים 2026"
          className="wc-input text-sm"
          aria-invalid={state?.field === "name"}
        />
      </div>

      {state?.error && <ErrorBanner message={state.error} />}

      <button
        type="submit"
        disabled={isPending}
        className="wc-button-primary px-4 py-3 text-sm font-bold disabled:opacity-50"
      >
        {isPending ? (
          <span className="inline-flex items-center gap-2">
            <Spinner /> טוען...
          </span>
        ) : (
          "צור ליגה"
        )}
      </button>
    </form>
  );
}

// ── Join League form ────────────────────────────────────────────────────────

function JoinLeagueForm() {
  const [state, action, isPending] = useActionState<LeagueActionState, FormData>(
    joinLeague,
    null
  );

  return (
    <form
      action={action}
      className="rounded-2xl p-5 flex flex-col gap-4"
      style={{ background: "var(--wc-surface)", border: "1px solid var(--wc-border)" }}
    >
      <div className="flex items-center gap-3">
        <span className="text-3xl">🔑</span>
        <div>
          <p className="text-sm font-bold" style={{ color: "var(--wc-fg1)" }}>
            הצטרפות לליגה
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--wc-fg2)" }}>
            הזן קוד הצטרפות שקיבלת מחבר
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold" style={{ color: "var(--wc-fg2)" }}>
          קוד הזמנה
        </label>
        <input
          name="invite_code"
          type="text"
          required
          maxLength={20}
          placeholder="למשל: A1B2C3D4E5"
          className="wc-input text-sm tracking-widest uppercase"
          aria-invalid={state?.field === "invite_code"}
        />
      </div>

      {state?.error && <ErrorBanner message={state.error} />}

      <button
        type="submit"
        disabled={isPending}
        className="wc-button-primary px-4 py-3 text-sm font-bold disabled:opacity-50"
      >
        {isPending ? (
          <span className="inline-flex items-center gap-2">
            <Spinner /> טוען...
          </span>
        ) : (
          "הצטרף לליגה"
        )}
      </button>
    </form>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

interface Props {
  leagues: LeagueRow[];
  isAuthenticated: boolean;
}

export default function LeaguesClient({ leagues, isAuthenticated }: Props) {
  return (
    <div>
      {/* Action cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {isAuthenticated ? (
          <>
            <CreateLeagueForm />
            <JoinLeagueForm />
          </>
        ) : (
          <div
            className="sm:col-span-2 rounded-2xl p-6 text-center"
            style={{ background: "var(--wc-surface)", border: "1px solid var(--wc-border)" }}
          >
            <p className="text-sm font-semibold" style={{ color: "var(--wc-fg2)" }}>
              עליך להתחבר כדי ליצור או להצטרף לליגה
            </p>
          </div>
        )}
      </div>

      {/* My leagues list */}
      {leagues.length > 0 ? (
        <div className="flex flex-col gap-3">
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--wc-neon)" }}>
            הליגות שלי ({leagues.length})
          </p>
          {leagues.map((league) => (
            <Link
              key={league.id}
              href={`/game/leagues/${league.id}`}
              className="group flex items-center justify-between gap-4 rounded-2xl px-5 py-4 transition-all duration-150 hover:shadow-[0_0_24px_rgba(95,255,123,0.1)]"
              style={{
                background: "var(--wc-surface)",
                border: "1px solid var(--wc-border)",
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl font-black text-sm text-white"
                  style={{
                    background: "linear-gradient(135deg,var(--wc-violet),var(--wc-magenta))",
                  }}
                >
                  {league.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p
                    className="truncate text-sm font-bold group-hover:text-wc-neon transition-colors"
                    style={{ color: "var(--wc-fg1)" }}
                  >
                    {league.name}
                  </p>
                  {league.invite_code && (
                    <p className="text-xs mt-0.5 font-mono tracking-wider" style={{ color: "var(--wc-fg3)" }}>
                      {league.invite_code}
                    </p>
                  )}
                </div>
              </div>
              <span className="flex-shrink-0 text-xs font-semibold" style={{ color: "var(--wc-fg3)" }}>
                צפה ←
              </span>
            </Link>
          ))}
        </div>
      ) : (
        isAuthenticated && (
          <div
            className="rounded-2xl p-10 flex flex-col items-center gap-3 text-center"
            style={{ background: "var(--wc-surface)", border: "1.5px dashed var(--wc-border)" }}
          >
            <span className="text-5xl">🏅</span>
            <p className="text-base font-semibold" style={{ color: "var(--wc-fg2)" }}>
              עדיין לא הצטרפת לאף ליגה
            </p>
            <p className="text-sm max-w-sm" style={{ color: "var(--wc-fg3)" }}>
              צור ליגה חדשה או הצטרף לאחת קיימת כדי להתחיל להתחרות
            </p>
          </div>
        )
      )}
    </div>
  );
}
