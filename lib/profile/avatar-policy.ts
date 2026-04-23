import {
  AVATAR_POSITION_MAX,
  AVATAR_POSITION_MIN,
  AVATAR_ZOOM_MAX,
  AVATAR_ZOOM_MIN,
  DEFAULT_AVATAR_TRANSFORM,
  type AvatarTransform,
  formatAvatarTransformValue,
  isDefaultAvatarTransform,
  normalizeAvatarTransform,
} from "@/lib/profile/avatar-transform";

export const PROFILE_AVATAR_BUCKET = "profile-avatars";
export const PROFILE_AVATAR_OBJECT_NAME = "avatar";
export const PROFILE_AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const PROFILE_AVATAR_FILE_SIZE_LIMIT = "2MB";
export const PROFILE_AVATAR_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

const PRIVATE_AVATAR_PATH_PATTERN =
  /^\/api\/profile\/avatar\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;
const PRIVATE_AVATAR_QUERY_KEYS = new Set(["v", "x", "y", "z"]);
const PRIVATE_AVATAR_ROUTE_PREFIX = "/api/profile/avatar/";
const PRIVATE_AVATAR_URL_BASE = "https://avatars.local";

export function buildPrivateAvatarUrl(
  userId: string,
  version: number | string = Date.now(),
  transform?: Partial<AvatarTransform> | null,
) {
  const url = new URL(`/api/profile/avatar/${userId}`, PRIVATE_AVATAR_URL_BASE);
  const normalizedVersion = normalizePrivateAvatarVersion(version);

  if (normalizedVersion) {
    url.searchParams.set("v", normalizedVersion);
  }

  const normalizedTransform = normalizeAvatarTransform(transform);
  if (!isDefaultAvatarTransform(normalizedTransform)) {
    url.searchParams.set("x", formatAvatarTransformValue(normalizedTransform.x));
    url.searchParams.set("y", formatAvatarTransformValue(normalizedTransform.y));
    url.searchParams.set("z", formatAvatarTransformValue(normalizedTransform.zoom));
  }

  return `${url.pathname}${url.search}`;
}

export function getPrivateAvatarObjectPath(userId: string) {
  return `${userId}/${PROFILE_AVATAR_OBJECT_NAME}`;
}

export function isPrivateAvatarUrl(value: string | null | undefined) {
  return parsePrivateAvatarUrl(value) !== null;
}

export function isPrivateAvatarUrlForUser(value: string | null | undefined, userId: string) {
  const parsed = parsePrivateAvatarUrl(value);
  return parsed?.userId.toLowerCase() === userId.trim().toLowerCase();
}

export function getAvatarTransformFromUrl(value: string | null | undefined) {
  return parsePrivateAvatarUrl(value)?.transform ?? DEFAULT_AVATAR_TRANSFORM;
}

export function applyPrivateAvatarTransform(
  value: string | null | undefined,
  transform?: Partial<AvatarTransform> | null,
) {
  const parsed = parsePrivateAvatarUrl(value);
  if (!parsed) {
    return null;
  }

  return buildPrivateAvatarUrl(parsed.userId, parsed.version ?? Date.now(), transform);
}

export function getAvatarUploadAccept() {
  return PROFILE_AVATAR_ALLOWED_MIME_TYPES.join(",");
}

export function getAvatarUploadHelperText() {
  return "JPG, PNG או WebP עד 2MB. הקובץ נבדק בשרת ונשמר כקובץ פרטי בלבד.";
}

export function getAvatarUploadClientError(file: Pick<File, "size" | "type"> | null | undefined) {
  if (!file) {
    return null;
  }

  if (file.size <= 0) {
    return "לא נבחר קובץ תקין.";
  }

  if (file.size > PROFILE_AVATAR_MAX_BYTES) {
    return "התמונה גדולה מדי. אפשר להעלות עד 2MB.";
  }

  if (!PROFILE_AVATAR_ALLOWED_MIME_TYPES.includes(file.type as (typeof PROFILE_AVATAR_ALLOWED_MIME_TYPES)[number])) {
    return "אפשר להעלות רק JPG, PNG או WebP.";
  }

  return null;
}

function parsePrivateAvatarUrl(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return null;
  }

  if (!trimmedValue.startsWith(PRIVATE_AVATAR_ROUTE_PREFIX)) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(trimmedValue, PRIVATE_AVATAR_URL_BASE);
  } catch {
    return null;
  }

  if (url.origin !== PRIVATE_AVATAR_URL_BASE || url.hash) {
    return null;
  }

  const pathMatch = PRIVATE_AVATAR_PATH_PATTERN.exec(url.pathname);
  if (!pathMatch) {
    return null;
  }

  for (const key of url.searchParams.keys()) {
    if (!PRIVATE_AVATAR_QUERY_KEYS.has(key)) {
      return null;
    }
  }

  const version = url.searchParams.get("v");
  if (version !== null && !/^\d+$/.test(version)) {
    return null;
  }

  const transform = parseAvatarTransformFromSearch(url.searchParams);
  if (!transform) {
    return null;
  }

  return {
    transform,
    userId: pathMatch[1],
    version,
  };
}

function parseAvatarTransformFromSearch(searchParams: URLSearchParams) {
  const x = parseAvatarTransformParam(searchParams.get("x"), AVATAR_POSITION_MIN, AVATAR_POSITION_MAX);
  const y = parseAvatarTransformParam(searchParams.get("y"), AVATAR_POSITION_MIN, AVATAR_POSITION_MAX);
  const zoom = parseAvatarTransformParam(searchParams.get("z"), AVATAR_ZOOM_MIN, AVATAR_ZOOM_MAX);

  if ((searchParams.has("x") && x === null) || (searchParams.has("y") && y === null)) {
    return null;
  }

  if (searchParams.has("z") && zoom === null) {
    return null;
  }

  return normalizeAvatarTransform({
    x: x ?? DEFAULT_AVATAR_TRANSFORM.x,
    y: y ?? DEFAULT_AVATAR_TRANSFORM.y,
    zoom: zoom ?? DEFAULT_AVATAR_TRANSFORM.zoom,
  });
}

function parseAvatarTransformParam(rawValue: string | null, min: number, max: number) {
  if (rawValue === null) {
    return null;
  }

  const parsed = Number.parseFloat(rawValue);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    return null;
  }

  return parsed;
}

function normalizePrivateAvatarVersion(value: number | string) {
  const normalizedValue =
    typeof value === "number"
      ? Math.trunc(value).toString()
      : value.toString().trim();

  return /^\d+$/.test(normalizedValue) ? normalizedValue : null;
}
