export type AvatarOption = {
  id: string;
  label: string;
  src: string;
};

const GOOGLE_AVATAR_PATTERN = /^https:\/\/lh\d+\.googleusercontent\.com\/\S+$/i;

export const DEFAULT_AVATAR_OPTIONS: AvatarOption[] = [
  { id: "aurora", label: "הילה", src: "/avatars/aurora.svg" },
  { id: "comet", label: "שביט", src: "/avatars/comet.svg" },
  { id: "ember", label: "להבה", src: "/avatars/ember.svg" },
  { id: "mint", label: "מנטה", src: "/avatars/mint.svg" },
];

export function getAvatarOptions(existingAvatarUrl: string | null | undefined) {
  const normalizedExistingAvatarUrl = normalizeAvatarUrl(existingAvatarUrl);
  const options = [...DEFAULT_AVATAR_OPTIONS];

  if (
    normalizedExistingAvatarUrl &&
    !DEFAULT_AVATAR_OPTIONS.some((option) => option.src === normalizedExistingAvatarUrl)
  ) {
    options.unshift({
      id: "current",
      label: "התמונה הנוכחית",
      src: normalizedExistingAvatarUrl,
    });
  }

  return options;
}

export function normalizeAvatarUrl(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalizedValue = value.trim();
  if (!normalizedValue) {
    return null;
  }

  if (isSupportedAvatarUrl(normalizedValue)) {
    return normalizedValue;
  }

  return null;
}

export function isSupportedAvatarUrl(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  const normalizedValue = value.trim();
  if (!normalizedValue) {
    return false;
  }

  if (DEFAULT_AVATAR_OPTIONS.some((option) => option.src === normalizedValue)) {
    return true;
  }

  if (normalizedValue.startsWith("/") && !normalizedValue.startsWith("//") && !normalizedValue.includes("\\")) {
    return true;
  }

  return GOOGLE_AVATAR_PATTERN.test(normalizedValue);
}
