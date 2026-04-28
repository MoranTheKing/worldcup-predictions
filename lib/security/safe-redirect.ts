const DEFAULT_REDIRECT_PATH = "/game";

export function getSafeRedirectPath(
  nextParam: string | null | undefined,
  fallback = DEFAULT_REDIRECT_PATH,
) {
  if (!nextParam) {
    return fallback;
  }

  if (!nextParam.startsWith("/")) {
    return fallback;
  }

  if (nextParam.startsWith("//") || nextParam.includes("\\")) {
    return fallback;
  }

  return nextParam;
}
