import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

interface Props {
  params: Promise<{ id: string }>;
}

type MemberRow = {
  user_id: string;
  joined_at: string;
  profiles: { display_name: string | null; total_score: number } | null;
};

export const dynamic = "force-dynamic";

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

  const { data: rawMembers } = await supabase
    .from("league_members")
    .select("user_id, joined_at, profiles(display_name, total_score)")
    .eq("league_id", id);

  // Normalise the nested profiles response and sort by total_score desc.
  const members: MemberRow[] = ((rawMembers ?? []) as unknown[]).map((m: unknown) => {
    const row = m as { user_id: string; joined_at: string; profiles: unknown };
    const prof = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      user_id: row.user_id,
      joined_at: row.joined_at,
      profiles: prof as MemberRow["profiles"],
    };
  });

  members.sort(
    (a, b) => (b.profiles?.total_score ?? 0) - (a.profiles?.total_score ?? 0)
  );

  const isOwner = league.owner_id === user.id;

  return (
    <div>
      {/* Back link */}
      <div className="mb-4">
        <Link
          href="/game/leagues"
          className="text-xs font-semibold hover:text-wc-neon transition-colors"
          style={{ color: "var(--wc-fg3)" }}
        >
          ← חזרה לליגות שלי
        </Link>
      </div>

      {/* League header */}
      <div className="mb-6">
        <h2
          className="text-xl font-black"
          style={{ color: "var(--wc-fg1)" }}
        >
          {league.name}
        </h2>
        {isOwner && (
          <span
            className="mt-1 inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
            style={{ background: "rgba(95,255,123,0.12)", color: "var(--wc-neon)" }}
          >
            מנהל הליגה
          </span>
        )}
      </div>

      {/* Invite code */}
      <div
        className="rounded-2xl p-5 mb-6"
        style={{ background: "var(--wc-surface)", border: "1px solid var(--wc-border)" }}
      >
        <p className="text-xs font-semibold mb-2" style={{ color: "var(--wc-fg2)" }}>
          קוד הזמנה — שתף עם חברים
        </p>
        <p
          className="text-2xl font-black tracking-[0.25em]"
          style={{ color: "var(--wc-neon)", fontFamily: "monospace" }}
        >
          {league.invite_code ?? "—"}
        </p>
      </div>

      {/* Leaderboard */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "var(--wc-surface)", border: "1px solid var(--wc-border)" }}
      >
        <div
          className="flex items-center justify-between px-5 py-3 border-b"
          style={{ borderColor: "var(--wc-border)" }}
        >
          <p className="text-sm font-bold" style={{ color: "var(--wc-fg1)" }}>
            טבלת מובילים
          </p>
          <p className="text-xs font-semibold" style={{ color: "var(--wc-fg3)" }}>
            {members.length} משתתפים
          </p>
        </div>

        {members.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr
                className="text-right"
                style={{ borderBottom: "1px solid var(--wc-border)" }}
              >
                <th className="px-5 py-2 text-[11px] font-semibold w-8" style={{ color: "var(--wc-fg3)" }}>#</th>
                <th className="px-2 py-2 text-[11px] font-semibold text-right" style={{ color: "var(--wc-fg3)" }}>שחקן</th>
                <th className="px-5 py-2 text-[11px] font-semibold text-left" style={{ color: "var(--wc-fg3)" }}>נקודות</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m, i) => {
                const name = m.profiles?.display_name ?? "שחקן אנונימי";
                const score = m.profiles?.total_score ?? 0;
                const isSelf = m.user_id === user.id;
                const isFirst = i === 0;

                return (
                  <tr
                    key={m.user_id}
                    className={`${isSelf ? "bg-[rgba(95,255,123,0.05)]" : ""}`}
                    style={{
                      borderBottom:
                        i < members.length - 1 ? "1px solid var(--wc-border)" : undefined,
                    }}
                  >
                    <td className="px-5 py-3 text-sm font-bold w-8 text-right" style={{ color: isFirst ? "var(--wc-amber)" : "var(--wc-fg3)" }}>
                      {isFirst ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl text-xs font-black text-white"
                          style={{
                            background:
                              isSelf
                                ? "linear-gradient(135deg,var(--wc-neon),var(--wc-violet))"
                                : "linear-gradient(135deg,var(--wc-violet),var(--wc-magenta))",
                          }}
                        >
                          {name.charAt(0).toUpperCase()}
                        </span>
                        <span
                          className="text-sm font-semibold"
                          style={{ color: isSelf ? "var(--wc-neon)" : "var(--wc-fg1)" }}
                        >
                          {name}
                          {isSelf && (
                            <span className="me-1.5 text-[10px]" style={{ color: "var(--wc-fg3)" }}>
                              {" "}(אני)
                            </span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td
                      className="px-5 py-3 text-sm font-black text-left"
                      style={{ color: score > 0 ? "var(--wc-neon)" : "var(--wc-fg3)" }}
                    >
                      {score}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="p-8 text-center">
            <p className="text-sm" style={{ color: "var(--wc-fg3)" }}>
              אין עדיין חברים בליגה
            </p>
          </div>
        )}
      </div>

      {/* Scoring note */}
      {members.length > 0 && (
        <p className="mt-3 text-xs text-center" style={{ color: "var(--wc-fg3)" }}>
          הניקוד מחושב לפי ניחושי המשחקים שלך — יתעדכן כאשר ניחושים ייספרו
        </p>
      )}
    </div>
  );
}
