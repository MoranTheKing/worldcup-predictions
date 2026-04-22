import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function LeaguePage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/game/leagues/${id}`);
  }

  const { data: league } = await supabase
    .from("leagues")
    .select("id, name, invite_code, owner_id, created_at")
    .eq("id", id)
    .single();

  if (!league) {
    notFound();
  }

  const { data: members } = await supabase
    .from("league_members")
    .select("user_id, joined_at, profiles(display_name)")
    .eq("league_id", id)
    .order("joined_at", { ascending: true });

  const isOwner = league.owner_id === user.id;

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <div className="mb-2">
        <Link
          href="/game"
          className="text-xs font-semibold"
          style={{ color: "var(--wc-fg3)" }}
        >
          ← חזרה למשחק הניחושים
        </Link>
      </div>

      <div className="mb-6 mt-3">
        <h1
          className="text-2xl md:text-3xl font-black"
          style={{ fontFamily: "var(--font-display)", color: "var(--wc-fg1)" }}
        >
          {league.name}
        </h1>
        {isOwner && (
          <span
            className="mt-1 inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
            style={{ background: "rgba(95,255,123,0.12)", color: "var(--wc-neon)" }}
          >
            מנהל הליגה
          </span>
        )}
      </div>

      {/* Invite code card */}
      <div
        className="rounded-2xl p-5 mb-6"
        style={{ background: "var(--wc-surface)", border: "1px solid var(--wc-border)" }}
      >
        <p className="text-xs font-semibold mb-2" style={{ color: "var(--wc-fg2)" }}>
          קוד הזמנה
        </p>
        <p
          className="text-2xl font-black tracking-[0.25em]"
          style={{ color: "var(--wc-neon)", fontFamily: "monospace" }}
        >
          {league.invite_code ?? "—"}
        </p>
        <p className="text-xs mt-1.5" style={{ color: "var(--wc-fg3)" }}>
          שתף את הקוד הזה עם חברים כדי שיוכלו להצטרף
        </p>
      </div>

      {/* Members list */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "var(--wc-surface)", border: "1px solid var(--wc-border)" }}
      >
        <div
          className="px-5 py-3 border-b"
          style={{ borderColor: "var(--wc-border)" }}
        >
          <p className="text-sm font-bold" style={{ color: "var(--wc-fg1)" }}>
            חברי ליגה ({members?.length ?? 0})
          </p>
        </div>

        {members && members.length > 0 ? (
          <ul>
            {members.map((m, i) => {
              const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
              const name = (profile as { display_name?: string } | null)?.display_name ?? "שחקן אנונימי";
              return (
                <li
                  key={m.user_id}
                  className="flex items-center gap-3 px-5 py-3"
                  style={{
                    borderBottom: i < members.length - 1 ? "1px solid var(--wc-border)" : undefined,
                  }}
                >
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-xl text-xs font-black text-white flex-shrink-0"
                    style={{
                      background:
                        "linear-gradient(135deg,var(--wc-violet),var(--wc-magenta))",
                    }}
                  >
                    {name.charAt(0).toUpperCase()}
                  </span>
                  <span className="text-sm font-semibold flex-1" style={{ color: "var(--wc-fg1)" }}>
                    {name}
                    {m.user_id === league.owner_id && (
                      <span className="me-2 text-[10px] font-bold" style={{ color: "var(--wc-neon)" }}>
                        {" "}מנהל
                      </span>
                    )}
                  </span>
                  <span className="text-xs" style={{ color: "var(--wc-fg3)" }}>
                    #{i + 1}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="p-8 text-center">
            <p className="text-sm" style={{ color: "var(--wc-fg3)" }}>
              אין עדיין חברים בליגה
            </p>
          </div>
        )}
      </div>

      {/* Leaderboard placeholder */}
      <div
        className="rounded-2xl p-8 mt-6 flex flex-col items-center gap-2 text-center"
        style={{ background: "var(--wc-surface)", border: "1.5px dashed var(--wc-border)" }}
      >
        <span className="text-4xl">📊</span>
        <p className="text-sm font-semibold" style={{ color: "var(--wc-fg2)" }}>
          לוח תוצאות — בקרוב
        </p>
        <p className="text-xs max-w-xs" style={{ color: "var(--wc-fg3)" }}>
          ניקוד וטבלת מובילים יופיעו כאן כאשר ניחושים ייספרו
        </p>
      </div>
    </div>
  );
}
