const DEFAULT_REDIRECT_PATH = "/game";
const LEGACY_DEFAULT_REDIRECT_PATH = "/dashboard";
const ONBOARDING_PATH = "/onboarding";

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

export function getPostOnboardingRedirectPath(
  nextParam: string | null | undefined,
  fallback = DEFAULT_REDIRECT_PATH,
) {
  let nextPath = getSafeRedirectPath(nextParam, fallback);

  for (let index = 0; index < 5; index += 1) {
    if (nextPath === LEGACY_DEFAULT_REDIRECT_PATH || nextPath === ONBOARDING_PATH) {
      return fallback;
    }

    if (!nextPath.startsWith(`${ONBOARDING_PATH}?`)) {
      return nextPath;
    }

    try {
      const onboardingUrl = new URL(nextPath, "https://local.invalid");
      nextPath = getSafeRedirectPath(onboardingUrl.searchParams.get("next"), fallback);
    } catch {
      return fallback;
    }
  }

  return fallback;
}
