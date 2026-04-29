import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import TeamLink from "@/components/TeamLink";
import {
  getBzzoiroManagerById,
  getBzzoiroManagerForTeam,
  getBzzoiroManagerPhotoUrl,
  type BzzoiroManager,
  type BzzoiroTacticalStyle,
} from "@/lib/bzzoiro/managers";
import { createClient } from "@/lib/supabase/server";
import type { TournamentTeamRecord } from "@/lib/tournament/matches";

export const dynamic = "force-dynamic";

type CoachTeam = TournamentTeamRecord & {
  bzzoiro_team_id?: string | number | null;
};

export default async function CoachPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: teamData } = await supabase
    .from("teams")
    .select("id, name, name_he, logo_url, group_letter, points, goals_for, goals_against, played_count, fifa_ranking, outright_odds, coach_name, coach_bzzoiro_id, coach_photo_url, coach_updated_at, bzzoiro_team_id")
    .eq("id", id)
    .maybeSingle();

  if (!teamData) notFound();

  const team = teamData as CoachTeam;
  const manager = await loadManager(team);
  const teamName = team.name_he ?? team.name;
  const coachName = manager?.name ?? team.coach_name ?? "טרם סונכרן";
  const photoUrl = getBzzoiroManagerPhotoUrl(manager) ?? team.coach_photo_url ?? null;
  const styles = (manager?.tactical_styles ?? []).slice(0, 4);
  const formations = getTopFormations(manager);

  return (
    <div className="wc-shell px-4 py-4 md:px-6 md:py-6" dir="rtl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/dashboard/teams/${encodeURIComponent(team.id)}`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-wc-fg3 transition hover:text-wc-fg1"
        >
          חזרה לנבחרת
        </Link>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/dashboard/teams/${encodeURIComponent(team.id)}/squad`}
            className="rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs font-bold text-wc-fg2 transition hover:border-wc-neon/40 hover:text-wc-neon"
          >
            סגל
          </Link>
          <Link
            href={`/dashboard/teams/${encodeURIComponent(team.id)}/stats`}
            className="rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs font-bold text-wc-fg2 transition hover:border-wc-neon/40 hover:text-wc-neon"
          >
            סטטיסטיקה
          </Link>
        </div>
      </div>

      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(95,255,123,0.12),rgba(111,60,255,0.22)_46%,rgba(8,14,29,0.96))] shadow-[0_28px_80px_rgba(0,0,0,0.38)]">
        <div className="grid gap-6 p-5 md:p-7 lg:grid-cols-[1fr_18rem] lg:items-center">
          <div className="flex min-w-0 items-center gap-4 md:gap-5">
            <CoachPortrait photoUrl={photoUrl} coachName={coachName} team={team} size="hero" />
            <div className="min-w-0">
              <p className="wc-kicker">פרופיל מאמן</p>
              <h1 className="mt-2 truncate font-sans text-4xl font-black leading-tight tracking-normal text-wc-fg1 md:text-6xl">
                {coachName}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold text-wc-fg2">
                <TeamLink
                  team={team}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-1.5 transition hover:border-wc-neon/40 hover:text-wc-neon"
                >
                  <TeamLogo team={team} />
                  {teamName}
                </TeamLink>
                {manager?.country ? <span className="wc-badge">{manager.country}</span> : null}
                {manager?.short_name ? <span className="wc-badge" dir="ltr">{manager.short_name}</span> : null}
              </div>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-wc-fg2">
                נתוני BSD כאן הם מדדי הקבוצה במשחקים שבהם המאמן עמד על הקווים: מערך, סגנון, לחץ, קו הגנה וממוצעים קבוצתיים. אלו לא נתוני יכולת אישיים של המאמן.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <HeroStat label="מערך" value={manager?.preferred_formation ?? "-"} />
            <HeroStat label="פרופיל" value={translateProfile(manager?.profile)} />
            <HeroStat label="משחקים" value={formatInteger(manager?.matches_total)} />
            <HeroStat label="ניצחון" value={formatPercent(manager?.win_pct)} />
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <InfoStat label="מאזן הקבוצה" value={formatRecord(manager)} sub="ניצחונות / תיקו / הפסדים תחת המאמן" />
        <InfoStat label="שערי הקבוצה" value={formatDecimal(manager?.avg_goals_scored)} sub="ממוצע שערים למשחק תחת המאמן" />
        <InfoStat label="ספיגות הקבוצה" value={formatDecimal(manager?.avg_goals_conceded)} sub="ממוצע שערי חובה למשחק" />
        <InfoStat label="רשת נקייה" value={formatPercent(manager?.clean_sheet_pct)} sub="אחוז משחקי הקבוצה ללא ספיגה" />
      </section>

      <section className="mt-5 rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-4 md:p-5">
        <SectionHeader title="מונדיאל 2026" eyebrow="נתוני טורניר בלבד" />
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <SmallMetric label="משחקים ששוחקו" value={formatInteger(team.played_count)} />
          <SmallMetric label="נקודות" value={formatInteger(team.points)} />
          <SmallMetric label="שערי זכות" value={formatInteger(team.goals_for)} />
          <SmallMetric label="שערי חובה" value={formatInteger(team.goals_against)} />
        </div>
        <p className="mt-3 text-xs leading-6 text-wc-fg3">
          כל עוד המונדיאל עוד לא התחיל, אזור הטורניר נשאר על אפס. המדדים בהמשך הם נתוני BSD מצטברים ממשחקים זמינים של הקבוצה תחת המאמן.
        </p>
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-4 md:p-5">
          <SectionHeader title="טביעת אצבע טקטית" eyebrow={manager ? "BSD managers API" : "ממתין לנתונים"} />
          {manager ? (
            <div className="mt-4 grid gap-3">
              <MetricRow label="מערך מועדף" value={manager.preferred_formation ?? "-"} />
              <MetricRow label="קטגוריית סגנון" value={translateTeamStyle(manager.team_style)} />
              <MetricRow label="קו הגנה" value={translateDefensiveLine(manager.defensive_line)} />
              <PressingRow value={manager.pressing_intensity} />
              {formations.length > 0 ? (
                <div className="rounded-2xl border border-white/10 bg-black/14 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-wc-fg3">מערכים בשימוש</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {formations.map((formation) => (
                      <span key={formation.label} className="rounded-full bg-white/8 px-3 py-1 text-xs font-black text-wc-fg2">
                        {formation.label} · {formation.count}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <EmptyPanel
              title="אין עדיין פרופיל מאמן מלא"
              description="הדף יישאר זמין דרך הנבחרת, וברגע שסנכרון BSD יחבר מזהה מאמן או שה־API יחזיר מנהל לנבחרת הזו, הנתונים הטקטיים יופיעו כאן."
            />
          )}
        </section>

        <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-4 md:p-5">
          <SectionHeader title="סגנונות מובילים" eyebrow={styles.length > 0 ? "Top tactical styles" : "דורש 5+ משחקים מלאים"} />
          {styles.length > 0 ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {styles.map((style) => (
                <StyleCard key={`${style.rank}-${style.code}`} style={style} />
              ))}
            </div>
          ) : (
            <EmptyPanel
              title="ה־API עדיין לא נתן סגנון מפורט"
              description="BSD מחשב סגנונות טקטיים רק כשיש מספיק משחקים עם סטטיסטיקות מלאות, ולכן חלק מהמאמנים יראו כאן רק מערך וסטטיסטיקה בסיסית."
            />
          )}
        </section>
      </div>

      <section className="mt-5 rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-4 md:p-5">
        <SectionHeader title="מדדי הקבוצה במשחקי המאמן" eyebrow="ממוצעים ואחוזים מ-BSD" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SmallMetric label="החזקה ממוצעת" value={formatPercent(manager?.avg_possession)} />
          <SmallMetric label="בעיטות הקבוצה" value={formatDecimal(manager?.avg_shots)} />
          <SmallMetric label="בעיטות למסגרת" value={formatDecimal(manager?.avg_shots_on_target)} />
          <SmallMetric label="קרנות הקבוצה" value={formatDecimal(manager?.avg_corners)} />
          <SmallMetric label="xG של הקבוצה" value={formatDecimal(manager?.avg_xg_for)} />
          <SmallMetric label="xG שספגה" value={formatDecimal(manager?.avg_xg_against)} />
          <SmallMetric label="צהובים לקבוצה" value={formatDecimal(manager?.avg_yellow_cards)} />
          <SmallMetric label="עבירות לקבוצה" value={formatDecimal(manager?.avg_fouls)} />
          <SmallMetric label="שני הצדדים כבשו" value={formatPercent(manager?.btts_pct)} />
          <SmallMetric label="משחקים מעל 2.5" value={formatPercent(manager?.over_25_pct)} />
          <SmallMetric label="משחקים מעל 1.5" value={formatPercent(manager?.over_15_pct)} />
          <SmallMetric label="הקבוצה לא כבשה" value={formatPercent(manager?.fail_to_score_pct)} />
        </div>
      </section>
    </div>
  );
}

async function loadManager(team: CoachTeam) {
  const managerFromTeam = await getBzzoiroManagerForTeam(team.bzzoiro_team_id);
  if (managerFromTeam) return managerFromTeam;
  return getBzzoiroManagerById(team.coach_bzzoiro_id);
}

function SectionHeader({ title, eyebrow }: { title: string; eyebrow?: string }) {
  return (
    <div>
      {eyebrow ? <p className="wc-kicker text-[0.68rem]">{eyebrow}</p> : null}
      <h2 className="mt-1 font-sans text-xl font-black tracking-normal text-wc-fg1">{title}</h2>
    </div>
  );
}

function CoachPortrait({
  photoUrl,
  coachName,
  team,
  size = "default",
}: {
  photoUrl: string | null;
  coachName: string;
  team: Pick<CoachTeam, "name" | "name_he" | "logo_url">;
  size?: "default" | "hero";
}) {
  const displayName = team.name_he ?? team.name;
  const boxClassName =
    size === "hero"
      ? "grid h-28 w-28 shrink-0 place-items-center overflow-hidden rounded-[1.5rem] border border-white/15 bg-black/24"
      : "grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-[1.1rem] border border-white/10 bg-white/8";
  const imageSize = size === "hero" ? 112 : 64;

  return (
    <div className={boxClassName}>
      {photoUrl ? (
        <Image
          src={photoUrl}
          alt={coachName}
          width={imageSize}
          height={imageSize}
          style={{ width: imageSize, height: imageSize }}
          className="h-full w-full object-cover"
          unoptimized
        />
      ) : team.logo_url ? (
        <Image
          src={team.logo_url}
          alt={displayName}
          width={size === "hero" ? 78 : 48}
          height={size === "hero" ? 54 : 34}
          className="rounded-md object-cover opacity-90"
          unoptimized
        />
      ) : (
        <span className="font-sans text-3xl font-black text-wc-fg2">{displayName.slice(0, 1)}</span>
      )}
    </div>
  );
}

function TeamLogo({ team }: { team: Pick<CoachTeam, "name" | "name_he" | "logo_url"> }) {
  const displayName = team.name_he ?? team.name;
  if (!team.logo_url) return null;

  return (
    <Image
      src={team.logo_url}
      alt={displayName}
      width={22}
      height={16}
      style={{ width: 22, height: 16 }}
      className="rounded-sm object-cover"
      unoptimized
    />
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.15rem] border border-white/10 bg-black/18 p-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-wc-fg3">{label}</p>
      <p className="mt-2 truncate font-sans text-2xl font-black tracking-normal text-wc-fg1">{value}</p>
    </div>
  );
}

function InfoStat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-[1.35rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.025))] p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-wc-fg3">{label}</p>
      <p className="mt-2 font-sans text-3xl font-black tracking-normal text-wc-fg1" dir="ltr">{value}</p>
      <p className="mt-1 text-xs text-wc-fg3">{sub}</p>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/14 px-4 py-3">
      <span className="text-sm font-bold text-wc-fg2">{label}</span>
      <span className="text-lg font-black text-wc-fg1">{value}</span>
    </div>
  );
}

function PressingRow({ value }: { value: number | null | undefined }) {
  const percent = normalizeRatioPercent(value);

  return (
    <div className="rounded-2xl border border-white/10 bg-black/14 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-bold text-wc-fg2">עוצמת לחץ</span>
        <span className="text-lg font-black text-wc-fg1">{percent === null ? "-" : `${percent}%`}</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/8">
        <div
          className="h-full rounded-full bg-wc-neon"
          style={{ width: `${percent ?? 0}%` }}
        />
      </div>
    </div>
  );
}

function StyleCard({ style }: { style: BzzoiroTacticalStyle }) {
  return (
    <article className="rounded-[1.25rem] border border-white/10 bg-black/14 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-full bg-white/8 px-2 py-1 text-[10px] font-black text-wc-fg3">
          #{style.rank ?? "-"}
        </span>
        <span className="rounded-full bg-[rgba(95,255,123,0.1)] px-2 py-1 text-[10px] font-black text-wc-neon">
          {translateStyleCategory(style.category)}
        </span>
      </div>
      <h3 className="mt-3 font-sans text-lg font-black tracking-normal text-wc-fg1">
        {style.name ?? style.code ?? "-"}
      </h3>
      <p className="mt-1 text-xs leading-6 text-wc-fg3">{style.description ?? "אין תיאור זמין מה־API."}</p>
      <p className="mt-3 text-xs font-black text-wc-fg2">ציון: {formatStyleScore(style.score)}</p>
    </article>
  );
}

function SmallMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/14 px-4 py-3">
      <p className="text-xs font-bold text-wc-fg3">{label}</p>
      <p className="mt-1 font-sans text-2xl font-black tracking-normal text-wc-fg1" dir="ltr">{value}</p>
    </div>
  );
}

function EmptyPanel({ title, description }: { title: string; description: string }) {
  return (
    <div className="mt-4 rounded-[1.35rem] border border-dashed border-white/12 bg-black/12 p-5">
      <h3 className="font-sans text-lg font-black tracking-normal text-wc-fg1">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-wc-fg3">{description}</p>
    </div>
  );
}

function getTopFormations(manager: BzzoiroManager | null) {
  return Object.entries(manager?.formations_used ?? {})
    .map(([label, count]) => ({ label, count }))
    .filter((item) => Number.isFinite(Number(item.count)))
    .sort((left, right) => Number(right.count) - Number(left.count))
    .slice(0, 4);
}

function formatRecord(manager: BzzoiroManager | null) {
  if (!manager) return "-";
  return `${manager.wins ?? 0} / ${manager.draws ?? 0} / ${manager.losses ?? 0}`;
}

function formatInteger(value: number | string | null | undefined) {
  const number = Number(value);
  return Number.isFinite(number) ? String(Math.round(number)) : "-";
}

function formatDecimal(value: number | string | null | undefined) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(2).replace(/\.00$/, "") : "-";
}

function formatPercent(value: number | string | null | undefined) {
  const number = Number(value);
  return Number.isFinite(number) ? `${number.toFixed(1).replace(/\.0$/, "")}%` : "-";
}

function normalizeRatioPercent(value: number | null | undefined) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.max(0, Math.min(100, Math.round(number * 100)));
}

function formatStyleScore(value: number | null | undefined) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(3).replace(/0+$/, "").replace(/\.$/, "") : "-";
}

function translateProfile(value: string | null | undefined) {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized === "attacking") return "התקפי";
  if (normalized === "defensive") return "הגנתי";
  if (normalized === "balanced") return "מאוזן";
  return value || "-";
}

function translateDefensiveLine(value: string | null | undefined) {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized === "low") return "נמוך";
  if (normalized === "mid") return "בינוני";
  if (normalized === "high") return "גבוה";
  return value || "-";
}

function translateTeamStyle(value: string | null | undefined) {
  const normalized = String(value ?? "").toLowerCase();
  const labels: Record<string, string> = {
    possession: "החזקת כדור",
    counter: "מתפרצות",
    pressing: "לחץ",
    defensive: "הגנתי",
    direct: "ישיר",
    mixed: "מעורב",
    neutral: "נייטרלי",
    soft: "רך",
  };
  return labels[normalized] ?? value ?? "-";
}

function translateStyleCategory(value: string | null | undefined) {
  const normalized = String(value ?? "").toLowerCase();
  const labels: Record<string, string> = {
    possession: "החזקה",
    pressing: "לחץ",
    counter: "מעבר",
    defensive: "הגנה",
    wide: "אגפים",
    fan_style: "סגנון אוהדים",
  };
  return labels[normalized] ?? value ?? "-";
}
