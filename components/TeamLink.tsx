"use client";

import Link from "next/link";
import type { MouseEventHandler, ReactNode } from "react";

export type LinkableTeam = {
  id: string;
  name: string;
  name_he?: string | null;
  logo_url?: string | null;
};

export function getTeamPageHref(teamId: string) {
  return `/dashboard/teams/${encodeURIComponent(teamId)}`;
}

export function getTeamLabel(team: LinkableTeam) {
  return team.name_he ?? team.name;
}

export default function TeamLink({
  team,
  children,
  className,
  onClick,
  title,
  prefetch = false,
}: {
  team: LinkableTeam;
  children: ReactNode;
  className?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  title?: string;
  prefetch?: boolean;
}) {
  return (
    <Link
      href={getTeamPageHref(team.id)}
      prefetch={prefetch}
      title={title ?? getTeamLabel(team)}
      className={className}
      onClick={onClick}
    >
      {children}
    </Link>
  );
}
