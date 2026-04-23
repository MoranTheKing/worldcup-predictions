import { headers } from "next/headers";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

function extractHostname(value: string | null) {
  if (!value) {
    return null;
  }

  const normalizedValue = value.split(",")[0]?.trim();
  if (!normalizedValue) {
    return null;
  }

  try {
    return new URL(
      normalizedValue.includes("://") ? normalizedValue : `http://${normalizedValue}`,
    ).hostname;
  } catch {
    return null;
  }
}

function isLocalHostname(hostname: string | null) {
  return Boolean(hostname && LOCAL_HOSTS.has(hostname));
}

function resolveHostname(candidates: Array<string | null>) {
  for (const candidate of candidates) {
    const hostname = extractHostname(candidate);
    if (hostname) {
      return hostname;
    }
  }

  return null;
}

export function isLocalRequest(request: Request) {
  const hostname = resolveHostname([
    request.headers.get("host"),
    request.headers.get("origin"),
    request.url,
  ]);

  return isLocalHostname(hostname);
}

export function getRequestHostname(request: Request) {
  return resolveHostname([
    request.headers.get("host"),
    request.headers.get("origin"),
    request.url,
  ]);
}

export async function isLocalServerRequest() {
  const requestHeaders = await headers();
  const hostname = resolveHostname([
    requestHeaders.get("host"),
    requestHeaders.get("origin"),
  ]);
  return isLocalHostname(hostname);
}
