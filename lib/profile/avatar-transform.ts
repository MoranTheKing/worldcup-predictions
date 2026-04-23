export type AvatarTransform = {
  x: number;
  y: number;
  zoom: number;
};

export const DEFAULT_AVATAR_TRANSFORM: AvatarTransform = {
  x: 0,
  y: 0,
  zoom: 1,
};

export const AVATAR_POSITION_MIN = -28;
export const AVATAR_POSITION_MAX = 28;
export const AVATAR_POSITION_STEP = 1;

export const AVATAR_ZOOM_MIN = 1;
export const AVATAR_ZOOM_MAX = 2.4;
export const AVATAR_ZOOM_STEP = 0.05;

const DECIMAL_ROUNDING_FACTOR = 100;

export function normalizeAvatarTransform(
  value?: Partial<AvatarTransform> | null,
): AvatarTransform {
  return {
    x: clamp(roundToTwo(value?.x ?? DEFAULT_AVATAR_TRANSFORM.x), AVATAR_POSITION_MIN, AVATAR_POSITION_MAX),
    y: clamp(roundToTwo(value?.y ?? DEFAULT_AVATAR_TRANSFORM.y), AVATAR_POSITION_MIN, AVATAR_POSITION_MAX),
    zoom: clamp(roundToTwo(value?.zoom ?? DEFAULT_AVATAR_TRANSFORM.zoom), AVATAR_ZOOM_MIN, AVATAR_ZOOM_MAX),
  };
}

export function isDefaultAvatarTransform(value?: Partial<AvatarTransform> | null) {
  const normalized = normalizeAvatarTransform(value);
  return (
    normalized.x === DEFAULT_AVATAR_TRANSFORM.x &&
    normalized.y === DEFAULT_AVATAR_TRANSFORM.y &&
    normalized.zoom === DEFAULT_AVATAR_TRANSFORM.zoom
  );
}

export function serializeAvatarTransform(value?: Partial<AvatarTransform> | null) {
  const normalized = normalizeAvatarTransform(value);
  return [normalized.x, normalized.y, normalized.zoom]
    .map(formatAvatarTransformValue)
    .join(",");
}

export function parseAvatarTransformField(
  value: FormDataEntryValue | string | null | undefined,
): AvatarTransform {
  const rawValue = typeof value === "string" ? value : value?.toString() ?? "";
  const trimmedValue = rawValue.trim();

  if (!trimmedValue) {
    return DEFAULT_AVATAR_TRANSFORM;
  }

  const [xValue, yValue, zoomValue, ...rest] = trimmedValue.split(",");
  if (!xValue || !yValue || !zoomValue || rest.length > 0) {
    return DEFAULT_AVATAR_TRANSFORM;
  }

  return normalizeAvatarTransform({
    x: Number.parseFloat(xValue),
    y: Number.parseFloat(yValue),
    zoom: Number.parseFloat(zoomValue),
  });
}

export function getAvatarObjectPosition(value?: Partial<AvatarTransform> | null) {
  const normalized = normalizeAvatarTransform(value);
  return `${50 + normalized.x}% ${50 + normalized.y}%`;
}

export function getAvatarScale(value?: Partial<AvatarTransform> | null) {
  return normalizeAvatarTransform(value).zoom;
}

export function formatAvatarTransformValue(value: number) {
  const rounded = roundToTwo(value);
  return Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(2).replace(/\.?0+$/, "");
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min <= 0 && max >= 0 ? 0 : min;
  }

  return Math.min(Math.max(value, min), max);
}

function roundToTwo(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.round(value * DECIMAL_ROUNDING_FACTOR) / DECIMAL_ROUNDING_FACTOR;
}
