"use client";

import { createPortal } from "react-dom";
import { isSupportedAvatarUrl } from "@/lib/profile/avatar-options";
import {
  AVATAR_POSITION_MAX,
  AVATAR_POSITION_MIN,
  normalizeAvatarTransform,
  type AvatarTransform,
} from "@/lib/profile/avatar-transform";
import { getAvatarTransformFromUrl } from "@/lib/profile/avatar-policy";
import { useEffect, useMemo, useState } from "react";

type UserAvatarProps = {
  allowPreviewObjectUrl?: boolean;
  className?: string;
  expandable?: boolean;
  name: string;
  priority?: boolean;
  roundedClassName?: string;
  size: number;
  src?: string | null;
  textClassName?: string;
  transform?: AvatarTransform | null;
};

const FALLBACK_GRADIENTS = [
  "from-[var(--wc-neon)] to-[var(--wc-violet)]",
  "from-[var(--wc-violet)] to-[var(--wc-magenta)]",
  "from-[var(--wc-amber)] to-[var(--wc-magenta)]",
  "from-[#009A7A] to-[var(--wc-neon)]",
];

export default function UserAvatar({
  allowPreviewObjectUrl = false,
  className = "",
  expandable = true,
  name,
  priority = false,
  roundedClassName = "rounded-full",
  size,
  src,
  textClassName = "text-white",
  transform,
}: UserAvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const normalizedName = name.trim() || "Player";
  const gradientClassName = useMemo(
    () =>
      FALLBACK_GRADIENTS[normalizedName.charCodeAt(0) % FALLBACK_GRADIENTS.length] ??
      FALLBACK_GRADIENTS[0],
    [normalizedName],
  );
  const resolvedSrc = useMemo(() => {
    if (typeof src !== "string") {
      return null;
    }

    const trimmedSrc = src.trim();
    if (!trimmedSrc) {
      return null;
    }

    if (allowPreviewObjectUrl && trimmedSrc.startsWith("blob:")) {
      return trimmedSrc;
    }

    return isSupportedAvatarUrl(trimmedSrc) ? trimmedSrc : null;
  }, [allowPreviewObjectUrl, src]);
  const resolvedTransform = useMemo(
    () => normalizeAvatarTransform(transform ?? getAvatarTransformFromUrl(resolvedSrc)),
    [resolvedSrc, transform],
  );
  const shouldRenderImage = Boolean(resolvedSrc && failedSrc !== resolvedSrc);
  const canExpand = shouldRenderImage && expandable;

  useEffect(() => {
    if (!isExpanded) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsExpanded(false);
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isExpanded]);

  if (!shouldRenderImage || !resolvedSrc) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br ${gradientClassName} ${roundedClassName} ${className}`}
        style={{ height: size, width: size }}
        aria-label={normalizedName}
      >
        <span
          className={`font-black ${textClassName}`}
          style={{ fontSize: Math.max(14, Math.round(size * 0.38)) }}
        >
          {normalizedName.charAt(0).toUpperCase()}
        </span>
      </div>
    );
  }

  const avatarVisual = (
    <AvatarVisual
      className={className}
      loading={priority ? "eager" : "lazy"}
      name={normalizedName}
      roundedClassName={roundedClassName}
      size={size}
      src={resolvedSrc}
      transform={resolvedTransform}
      onError={() => setFailedSrc(resolvedSrc)}
    />
  );

  return (
    <>
      {canExpand ? (
        <button
          type="button"
          aria-label={`הגדל את תמונת הפרופיל של ${normalizedName}`}
          onClick={(event) => {
            event.stopPropagation();
            setIsExpanded(true);
          }}
          className="cursor-zoom-in rounded-[inherit] bg-transparent p-0 text-inherit"
        >
          {avatarVisual}
        </button>
      ) : (
        avatarVisual
      )}

      {canExpand && isExpanded && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[120] flex items-center justify-center bg-[rgba(2,6,23,0.76)] px-4 py-6 backdrop-blur-md"
              onClick={() => setIsExpanded(false)}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-label={`תמונת הפרופיל של ${normalizedName}`}
                className="relative w-full max-w-[22rem]"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="absolute inset-0 rounded-[2.2rem] bg-[radial-gradient(circle_at_top,rgba(95,255,123,0.22),transparent_58%),radial-gradient(circle_at_bottom,rgba(255,47,166,0.18),transparent_62%)] blur-2xl" />
                <div className="relative overflow-hidden rounded-[2.2rem] border border-white/12 bg-[rgba(8,13,26,0.94)] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.5)]">
                  <div className="mx-auto w-full max-w-[18rem]">
                    <AvatarVisual
                      className="mx-auto shadow-[0_20px_55px_rgba(95,255,123,0.16)]"
                      loading="eager"
                      name={normalizedName}
                      roundedClassName="rounded-[2rem]"
                      size={288}
                      src={resolvedSrc}
                      transform={resolvedTransform}
                      onError={() => setFailedSrc(resolvedSrc)}
                    />
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-wc-fg1">{normalizedName}</p>
                      <p className="mt-1 text-xs text-wc-fg3">לחיצה מחוץ לתמונה תחזיר למסך.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsExpanded(false)}
                      className="rounded-full border border-white/10 px-3 py-2 text-xs font-semibold text-wc-fg2 transition hover:border-white/20 hover:text-wc-fg1"
                    >
                      סגור
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function AvatarVisual({
  className,
  loading,
  name,
  onError,
  roundedClassName,
  size,
  src,
  transform,
}: {
  className: string;
  loading: "eager" | "lazy";
  name: string;
  onError: () => void;
  roundedClassName: string;
  size: number;
  src: string;
  transform: AvatarTransform;
}) {
  const [imageMetrics, setImageMetrics] = useState<{
    height: number;
    src: string;
    width: number;
  } | null>(null);
  const normalizedTransform = normalizeAvatarTransform(transform);
  const activeMetrics = imageMetrics?.src === src ? imageMetrics : null;
  const imageFrame = useMemo(
    () => calculateImageFrame(activeMetrics, size, normalizedTransform),
    [activeMetrics, normalizedTransform, size],
  );

  return (
    <span
      className={`relative block overflow-hidden bg-[rgba(255,255,255,0.05)] ${roundedClassName} ${className}`}
      style={{ height: size, width: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={name}
        onError={onError}
        onLoad={(event) => {
          const nextMetrics = {
            height: event.currentTarget.naturalHeight || size,
            src,
            width: event.currentTarget.naturalWidth || size,
          };

          setImageMetrics((currentMetrics) => {
            if (
              currentMetrics?.src === nextMetrics.src &&
              currentMetrics.width === nextMetrics.width &&
              currentMetrics.height === nextMetrics.height
            ) {
              return currentMetrics;
            }

            return nextMetrics;
          });
        }}
        loading={loading}
        decoding="async"
        referrerPolicy="no-referrer"
        className="absolute max-w-none select-none"
        style={{
          height: imageFrame.height,
          left: imageFrame.left,
          top: imageFrame.top,
          width: imageFrame.width,
        }}
      />
    </span>
  );
}

function calculateImageFrame(
  imageMetrics: { height: number; width: number } | null,
  size: number,
  transform: AvatarTransform,
) {
  const metrics = imageMetrics ?? { height: size, width: size };
  const baseScale = Math.max(size / Math.max(metrics.width, 1), size / Math.max(metrics.height, 1));
  const renderedWidth = metrics.width * baseScale * transform.zoom;
  const renderedHeight = metrics.height * baseScale * transform.zoom;
  const horizontalFactor = normalizePanFactor(
    transform.x,
    AVATAR_POSITION_MIN,
    AVATAR_POSITION_MAX,
  );
  const verticalFactor = normalizePanFactor(
    transform.y,
    AVATAR_POSITION_MIN,
    AVATAR_POSITION_MAX,
  );
  const maxOffsetX = Math.max(0, (renderedWidth - size) / 2);
  const maxOffsetY = Math.max(0, (renderedHeight - size) / 2);

  return {
    height: renderedHeight,
    left: (size - renderedWidth) / 2 + horizontalFactor * maxOffsetX,
    top: (size - renderedHeight) / 2 + verticalFactor * maxOffsetY,
    width: renderedWidth,
  };
}

function normalizePanFactor(value: number, min: number, max: number) {
  const spread = Math.max(Math.abs(min), Math.abs(max), AVATAR_POSITION_MAX);
  if (spread <= 0) {
    return 0;
  }

  return Math.max(-1, Math.min(1, value / spread));
}
