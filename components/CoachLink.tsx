import Link from "next/link";
import type { ReactNode } from "react";

export type LinkableCoachTeam = {
  id: string;
  name: string;
  name_he?: string | null;
  coach_name?: string | null;
};

export function getCoachPageHref(teamId: string) {
  return `/dashboard/coaches/${encodeURIComponent(teamId)}`;
}

export function getCoachLinkLabel(team: LinkableCoachTeam) {
  const teamName = team.name_he ?? team.name;
  return team.coach_name ?? `מאמן ${teamName}`;
}

export default function CoachLink({
  team,
  children,
  className,
  title,
  prefetch = false,
}: {
  team: LinkableCoachTeam;
  children: ReactNode;
  className?: string;
  title?: string;
  prefetch?: boolean;
}) {
  return (
    <Link
      href={getCoachPageHref(team.id)}
      prefetch={prefetch}
      title={title ?? getCoachLinkLabel(team)}
      className={className}
    >
      {children}
    </Link>
  );
}
