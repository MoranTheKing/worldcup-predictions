import { isLocalRequest } from "@/lib/security/local-request";

export function isAuthorizedAdminRequest(request: Request) {
  const configuredSecret =
    process.env.TOURNAMENT_ADMIN_SECRET ??
    process.env.ADMIN_API_SECRET ??
    process.env.CRON_SECRET ??
    null;
  const authorization = request.headers.get("authorization") ?? "";

  if (configuredSecret && authorization === `Bearer ${configuredSecret}`) {
    return true;
  }

  return process.env.NODE_ENV !== "production" && isLocalRequest(request);
}
