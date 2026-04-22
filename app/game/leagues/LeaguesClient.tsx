"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createLeague, joinLeague, type LeagueActionState } from "@/app/actions/league";

export type LeagueRow = {
  id: string;
  name: string;
  invite_code: string | null;
  owner_id: string | null;
  created_at: string | null;
};

type ActionMode = "create" | "join" | null;

export default function LeaguesClient({
  leagues,
  isAuthenticated,
}: {
  leagues: LeagueRow[];
  isAuthenticated: boolean;
}) {
  const searchParams = useSearchParams();
  const inviteFromUrl = searchParams.get("invite")?.trim().toUpperCase() ?? "";
  const [openPanel, setOpenPanel] = useState<ActionMode>(() => (inviteFromUrl ? "join" : null));
  const [joinDraft, setJoinDraft] = useState(() => inviteFromUrl);

  return (
    <div className="flex flex-col gap-6">
      <section
        className="rounded-[1.75rem] border border-white/10 bg-[rgba(13,27,46,0.82)] p-5"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-wc-neon">
              הליגות שלי
            </p>
            <h2 className="mt-2 text-2xl font-black text-wc-fg1">מרכז הליגות החברתיות</h2>
            <p className="mt-2 max-w-2xl text-sm text-wc-fg2">
              יוצרים ליגה פרטית, מצטרפים עם קוד בן 4 תווים, ומשתווים מול חברים על אותו טורניר.
            </p>
          </div>

          {isAuthenticated ? (
            <div className="flex flex-wrap gap-2">
              <ActionToggle
                active={openPanel === "create"}
                onClick={() => setOpenPanel((current) => (current === "create" ? null : "create"))}
              >
                צור ליגה
              </ActionToggle>
              <ActionToggle
                active={openPanel === "join"}
                onClick={() => setOpenPanel((current) => (current === "join" ? null : "join"))}
              >
                הצטרף עם קוד
              </ActionToggle>
            </div>
          ) : null}
        </div>

        {!isAuthenticated ? (
          <div className="mt-5 rounded-2xl border border-dashed border-white/10 bg-white/5 p-5 text-center">
            <p className="text-sm font-semibold text-wc-fg2">
              צריך להתחבר כדי ליצור ליגה או להצטרף אליה.
            </p>
          </div>
        ) : openPanel === "create" ? (
          <div className="mt-5">
            <CreateLeaguePanel />
          </div>
        ) : openPanel === "join" ? (
          <div className="mt-5">
            <JoinLeaguePanel
              initialCode={joinDraft}
              onCodeChange={setJoinDraft}
            />
          </div>
        ) : null}
      </section>

      {leagues.length > 0 ? (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-wc-neon">
              הליגות הפעילות ({leagues.length})
            </p>
            <p className="text-xs font-semibold text-wc-fg3">
              אפשר לפתוח כל ליגה כדי לראות טבלת מובילים וניהול חברים
            </p>
          </div>

          {leagues.map((league) => (
            <Link
              key={league.id}
              href={`/game/leagues/${league.id}`}
              className="group flex items-center justify-between gap-4 rounded-[1.5rem] border border-white/10 bg-[rgba(13,27,46,0.82)] px-5 py-4 transition-all hover:border-wc-neon/30 hover:shadow-[0_0_24px_rgba(95,255,123,0.08)]"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--wc-violet),var(--wc-magenta))] text-sm font-black text-white">
                  {league.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-wc-fg1 transition-colors group-hover:text-wc-neon">
                    {league.name}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-wc-fg3">
                    קוד הזמנה:{" "}
                    <span className="font-mono tracking-[0.28em] text-wc-neon">
                      {league.invite_code ?? "----"}
                    </span>
                  </p>
                </div>
              </div>

              <span className="flex-shrink-0 text-xs font-semibold text-wc-fg3">
                פתח ליגה ←
              </span>
            </Link>
          ))}
        </section>
      ) : isAuthenticated ? (
        <section className="rounded-[1.75rem] border border-dashed border-white/10 bg-[rgba(13,27,46,0.82)] p-10 text-center">
          <div className="text-5xl">🏟️</div>
          <p className="mt-3 text-base font-semibold text-wc-fg2">עוד לא הצטרפת לאף ליגה</p>
          <p className="mt-2 text-sm text-wc-fg3">
            בחר למעלה אם ליצור ליגה חדשה או להצטרף עם קוד הזמנה שקיבלת.
          </p>
        </section>
      ) : null}
    </div>
  );
}

function CreateLeaguePanel() {
  const [state, action, isPending] = useActionState<LeagueActionState, FormData>(
    createLeague,
    null,
  );

  return (
    <form
      action={action}
      className="rounded-[1.5rem] border border-white/10 bg-[rgba(255,255,255,0.03)] p-5"
    >
      <div className="mb-4">
        <p className="text-sm font-bold text-wc-fg1">צור ליגה חדשה</p>
        <p className="mt-1 text-xs text-wc-fg3">
          שם אחד, קוד אחד, וטבלת דירוג אחת משותפת לכל החברים.
        </p>
      </div>

      <label className="block text-xs font-semibold text-wc-fg3">
        שם הליגה
        <input
          name="name"
          type="text"
          required
          maxLength={60}
          placeholder="למשל: החבר'ה של המונדיאל"
          className="wc-input mt-2 w-full"
          aria-invalid={state?.field === "name"}
        />
      </label>

      {state?.error ? <ActionError message={state.error} /> : null}

      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="wc-button-primary px-5 py-3 text-sm font-bold disabled:opacity-50"
        >
          {isPending ? "יוצר..." : "צור ליגה"}
        </button>
      </div>
    </form>
  );
}

function JoinLeaguePanel({
  initialCode,
  onCodeChange,
}: {
  initialCode: string;
  onCodeChange: (value: string) => void;
}) {
  const [state, action, isPending] = useActionState<LeagueActionState, FormData>(
    joinLeague,
    null,
  );

  return (
    <form
      action={action}
      className="rounded-[1.5rem] border border-white/10 bg-[rgba(255,255,255,0.03)] p-5"
    >
      <div className="mb-4">
        <p className="text-sm font-bold text-wc-fg1">הצטרף עם קוד הזמנה</p>
        <p className="mt-1 text-xs text-wc-fg3">
          הזן קוד בן 4 תווים. אחרי יותר מדי ניסיונות שגויים תופעל חסימה זמנית.
        </p>
      </div>

      <label className="block text-xs font-semibold text-wc-fg3">
        קוד הזמנה
        <input
          name="invite_code"
          type="text"
          required
          inputMode="text"
          maxLength={4}
          value={initialCode}
          onChange={(event) =>
            onCodeChange(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4))
          }
          placeholder="AB12"
          className="wc-input mt-2 w-full text-center font-mono tracking-[0.4em] uppercase"
          aria-invalid={state?.field === "invite_code"}
        />
      </label>

      {state?.error ? <ActionError message={state.error} /> : null}

      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="wc-button-primary px-5 py-3 text-sm font-bold disabled:opacity-50"
        >
          {isPending ? "מצטרף..." : "הצטרף לליגה"}
        </button>
      </div>
    </form>
  );
}

function ActionToggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm font-bold transition-all ${
        active
          ? "border-wc-neon/60 bg-[rgba(95,255,123,0.12)] text-wc-neon"
          : "border-white/10 bg-white/5 text-wc-fg2 hover:border-wc-neon/30 hover:text-wc-fg1"
      }`}
    >
      {children}
    </button>
  );
}

function ActionError({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="mt-4 rounded-xl bg-[rgba(255,92,130,0.12)] px-3 py-2 text-sm font-semibold text-wc-danger"
    >
      {message}
    </p>
  );
}
