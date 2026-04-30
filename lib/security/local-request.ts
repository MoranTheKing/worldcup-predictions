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

function extractOrigin(value: string | null) {
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
    ).origin;
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
  const hostname = resolveHostname([request.url, request.headers.get("origin")]);

  return isLocalHostname(hostname);
}

export function isSameOriginRequest(request: Request) {
  const requestOrigin = extractOrigin(request.url);
  const originHeader = extractOrigin(request.headers.get("origin"));

  if (!originHeader) {
    return true;
  }

  return Boolean(requestOrigin && requestOrigin === originHeader);
}

export function getRequestHostname(request: Request) {
  return resolveHostname([request.url, request.headers.get("origin")]);
}

export async function isLocalServerRequest() {
  const requestHeaders = await headers();
  const hostname = resolveHostname([requestHeaders.get("origin")]);
  return isLocalHostname(hostname);
}
