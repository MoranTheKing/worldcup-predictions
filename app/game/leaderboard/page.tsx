import UserAvatar from "@/components/UserAvatar";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ProfileRow = {
  id: string;
  display_name?: string | null;
  total_score?: number | null;
  avatar_url?: string | null;
};

export default async function GlobalLeaderboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id, display_name, total_score, avatar_url")
    .order("total_score", { ascending: false })
    .limit(500);

  const rows = ((data ?? []) as ProfileRow[])
    .map((profile) => ({
      id: profile.id,
      displayName:
        typeof profile.display_name === "string" && profile.display_name.trim()
          ? profile.display_name
          : "שחקן אנונימי",
      totalScore:
        typeof profile.total_score === "number" && Number.isFinite(profile.total_score)
          ? profile.total_score
          : 0,
      avatarUrl:
        typeof profile.avatar_url === "string" && profile.avatar_url.trim()
          ? profile.avatar_url
          : null,
    }))
    .sort((left, right) => right.totalScore - left.totalScore);

  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-[rgba(13,27,46,0.82)]">
      <div className="border-b border-white/10 px-5 py-4">
        <p className="text-sm font-bold text-wc-fg1">טבלת כל המשתמשים</p>
        <p className="mt-1 text-xs text-wc-fg3">
          דירוג כללי לפי הניקוד המצטבר מכל המשחקים שהסתיימו.
        </p>
      </div>

      {error ? (
        <div className="p-6 text-sm font-semibold text-wc-danger">{error.message}</div>
      ) : rows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px]">
            <thead>
              <tr className="border-b border-white/10 text-right">
                <th className="px-5 py-3 text-[11px] font-semibold text-wc-fg3">#</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-wc-fg3">שחקן</th>
                <th className="px-5 py-3 text-[11px] font-semibold text-wc-fg3">נקודות</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const isSelf = row.id === user?.id;

                return (
                  <tr
                    key={row.id}
                    className={`border-b border-white/10 last:border-0 ${
                      isSelf ? "bg-[rgba(95,255,123,0.05)]" : ""
                    }`}
                  >
                    <td className="px-5 py-3 text-sm font-bold text-wc-fg3">
                      {getGlobalRankLabel(index + 1)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          name={row.displayName}
                          src={row.avatarUrl}
                          size={36}
                          className="aspect-square h-9 w-9"
                        />
                        <div className="min-w-0">
                          <p className={`truncate text-sm font-semibold ${isSelf ? "text-wc-neon" : "text-wc-fg1"}`}>
                            {row.displayName}
                            {isSelf ? <span className="ms-1 text-[10px] text-wc-fg3">(אני)</span> : null}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm font-black text-wc-neon">{row.totalScore}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-8 text-center text-sm text-wc-fg3">אין עדיין משתמשים להצגה.</div>
      )}
    </section>
  );
}

function getGlobalRankLabel(rank: number) {
  if (rank === 1) return "1";
  if (rank === 2) return "2";
  if (rank === 3) return "3";
  return String(rank);
}
