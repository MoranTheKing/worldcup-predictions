"use client";

import { useActionState, useTransition } from "react";
import { createLeague, joinLeague, type LeagueActionState } from "@/app/actions/league";

function SubmitButton({ label, pending }: { label: string; pending: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="wc-button-primary w-full px-4 py-3 text-sm font-bold disabled:opacity-50"
    >
      {pending ? (
        <span className="inline-flex items-center gap-2 justify-center">
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          טוען...
        </span>
      ) : (
        label
      )}
    </button>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="mt-2 rounded-xl px-3 py-2 text-sm font-semibold"
      style={{ background: "rgba(255,92,130,0.12)", color: "var(--wc-danger)" }}
    >
      {message}
    </p>
  );
}

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

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold" style={{ color: "var(--wc-fg2)" }}>
          שם הליגה
        </label>
        <input
          name="name"
          type="text"
          required
          maxLength={60}
          placeholder="למשל: ליגת חברים 2026"
          className="wc-input w-full rounded-xl px-3 py-2.5 text-sm"
          aria-invalid={state?.field === "name"}
        />
      </div>

      {state?.error && <ErrorBanner message={state.error} />}

      <SubmitButton label="צור ליגה" pending={isPending} />
    </form>
  );
}

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

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold" style={{ color: "var(--wc-fg2)" }}>
          קוד הזמנה
        </label>
        <input
          name="invite_code"
          type="text"
          required
          maxLength={20}
          placeholder="למשל: A1B2C3D4E5"
          className="wc-input w-full rounded-xl px-3 py-2.5 text-sm tracking-widest uppercase"
          aria-invalid={state?.field === "invite_code"}
        />
      </div>

      {state?.error && <ErrorBanner message={state.error} />}

      <SubmitButton label="הצטרף לליגה" pending={isPending} />
    </form>
  );
}

export default function GameClient() {
  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <div className="mb-6">
        <h1
          className="text-2xl md:text-3xl font-black"
          style={{ fontFamily: "var(--font-display)", color: "var(--wc-fg1)" }}
        >
          משחק הניחושים
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--wc-fg2)" }}>
          התחרה מול חברים — ניחוש פעם אחת, מתחרה בכל הליגות שלך
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <CreateLeagueForm />
        <JoinLeagueForm />
      </div>

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
    </div>
  );
}
