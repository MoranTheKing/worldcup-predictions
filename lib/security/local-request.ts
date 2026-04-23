import { headers } from "next/headers";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

function extractHostname(host: string | null) {
  if (!host) {
    return null;
  }

  const normalizedHost = host.split(",")[0]?.trim();
  if (!normalizedHost) {
    return null;
  }

  try {
    return new URL(
      normalizedHost.includes("://") ? normalizedHost : `http://${normalizedHost}`,
    ).hostname;
  } catch {
    return null;
  }
}

function isLocalHostname(hostname: string | null) {
  return Boolean(hostname && LOCAL_HOSTS.has(hostname));
}

export function isLocalRequest(request: Request) {
  return isLocalHostname(new URL(request.url).hostname);
}

export async function isLocalServerRequest() {
  const requestHeaders = await headers();
  return isLocalHostname(
    extractHostname(requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host")),
  );
}
