"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/game/predictions", label: "הניחושים שלי", icon: "🎯" },
  { href: "/game/leagues", label: "הליגות שלי", icon: "👥" },
  { href: "/game/leaderboard", label: "טבלה כללית", icon: "#" },
];

export default function GameSubNav() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/game/leagues") {
      return pathname === "/game/leagues" || pathname.startsWith("/game/leagues/");
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div
      className="mb-6 flex gap-1 rounded-2xl p-1"
      style={{ background: "var(--wc-surface)", border: "1px solid var(--wc-border)" }}
    >
      {TABS.map(({ href, label, icon }) => {
        const active = isActive(href);

        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all duration-150 ${
              active
                ? "bg-[linear-gradient(135deg,rgba(95,255,123,0.14),rgba(255,47,166,0.1))] text-wc-fg1 shadow-[0_0_20px_rgba(95,255,123,0.1)]"
                : "text-wc-fg2 hover:bg-white/5 hover:text-wc-fg1"
            }`}
          >
            <span className="text-base leading-none">{icon}</span>
            <span>{label}</span>
          </Link>
        );
      })}
    </div>
  );
}
