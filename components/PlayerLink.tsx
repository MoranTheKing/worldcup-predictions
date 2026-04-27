import Link from "next/link";
import type { ReactNode } from "react";

export type LinkablePlayer = {
  id: number | string;
  name: string;
};

export function getPlayerPageHref(playerId: number | string) {
  return `/dashboard/players/${encodeURIComponent(String(playerId))}`;
}

export default function PlayerLink({
  player,
  children,
  className,
  title,
  prefetch = false,
}: {
  player: LinkablePlayer;
  children: ReactNode;
  className?: string;
  title?: string;
  prefetch?: boolean;
}) {
  return (
    <Link
      href={getPlayerPageHref(player.id)}
      prefetch={prefetch}
      title={title ?? player.name}
      className={className}
    >
      {children}
    </Link>
  );
}
