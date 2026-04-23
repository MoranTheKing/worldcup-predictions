export const PROFILE_AVATAR_BUCKET = "profile-avatars";
export const PROFILE_AVATAR_OBJECT_NAME = "avatar";
export const PROFILE_AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const PROFILE_AVATAR_FILE_SIZE_LIMIT = "2MB";
export const PROFILE_AVATAR_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

const PRIVATE_AVATAR_ROUTE_PATTERN =
  /^\/api\/profile\/avatar\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}(?:\?v=\d+)?$/i;

export function buildPrivateAvatarUrl(userId: string, version = Date.now()) {
  return `/api/profile/avatar/${userId}?v=${version}`;
}

export function getPrivateAvatarObjectPath(userId: string) {
  return `${userId}/${PROFILE_AVATAR_OBJECT_NAME}`;
}

export function isPrivateAvatarUrl(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  return PRIVATE_AVATAR_ROUTE_PATTERN.test(value.trim());
}

export function isPrivateAvatarUrlForUser(value: string | null | undefined, userId: string) {
  if (!value) {
    return false;
  }

  const trimmedValue = value.trim();
  return (
    trimmedValue === buildPrivateAvatarUrl(userId) ||
    trimmedValue.startsWith(`/api/profile/avatar/${userId}?v=`) ||
    trimmedValue === `/api/profile/avatar/${userId}`
  );
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
