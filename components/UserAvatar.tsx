"use client";

import { isSupportedAvatarUrl } from "@/lib/profile/avatar-options";
import { useMemo, useState } from "react";

type UserAvatarProps = {
  className?: string;
  name: string;
  priority?: boolean;
  roundedClassName?: string;
  size: number;
  src?: string | null;
  textClassName?: string;
};

const FALLBACK_GRADIENTS = [
  "from-[var(--wc-neon)] to-[var(--wc-violet)]",
  "from-[var(--wc-violet)] to-[var(--wc-magenta)]",
  "from-[var(--wc-amber)] to-[var(--wc-magenta)]",
  "from-[#009A7A] to-[var(--wc-neon)]",
];

export default function UserAvatar({
  className = "",
  name,
  priority = false,
  roundedClassName = "rounded-full",
  size,
  src,
  textClassName = "text-white",
}: UserAvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const normalizedName = name.trim() || "Player";
  const gradientClassName = useMemo(
    () => FALLBACK_GRADIENTS[normalizedName.charCodeAt(0) % FALLBACK_GRADIENTS.length] ?? FALLBACK_GRADIENTS[0],
    [normalizedName],
  );
  const resolvedSrc =
    typeof src === "string" && src.trim() && isSupportedAvatarUrl(src) ? src.trim() : null;
  const shouldRenderImage = Boolean(resolvedSrc && failedSrc !== resolvedSrc);

  if (!shouldRenderImage || !resolvedSrc) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br ${gradientClassName} ${roundedClassName} ${className}`}
        style={{ height: size, width: size }}
        aria-label={normalizedName}
      >
        <span className={`font-black ${textClassName}`} style={{ fontSize: Math.max(14, Math.round(size * 0.38)) }}>
          {normalizedName.charAt(0).toUpperCase()}
        </span>
      </div>
    );
  }

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={resolvedSrc}
      alt={normalizedName}
      onError={() => setFailedSrc(resolvedSrc)}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      referrerPolicy="no-referrer"
      className={`${roundedClassName} object-cover ${className}`}
      style={{ height: size, width: size }}
    />
  );
}
