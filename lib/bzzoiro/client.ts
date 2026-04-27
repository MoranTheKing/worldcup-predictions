type QueryValue = string | number | boolean | null | undefined;

export type BzzoiroPage<T> = {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results?: T[];
};

const DEFAULT_API_BASE_URL = "https://sports.bzzoiro.com/api";
const DEFAULT_PUBLIC_BASE_URL = "https://sports.bzzoiro.com";

export function getBzzoiroPublicImageUrl(type: "team" | "player" | "manager", id: string | number | null | undefined) {
  if (id === null || id === undefined || id === "") return null;
  return `${getPublicBaseUrl()}/img/${type}/${encodeURIComponent(String(id))}/`;
}

export async function bzzoiroGet<T>(
  path: string,
  query: Record<string, QueryValue> = {},
): Promise<T> {
  const token = process.env.BSD_API_TOKEN;
  if (!token) {
    throw new Error("Missing BSD_API_TOKEN");
  }

  const response = await fetch(buildApiUrl(path, query), {
    headers: {
      Accept: "application/json",
      Authorization: `Token ${token}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`BSD request failed (${response.status}) for ${path}: ${text.slice(0, 180)}`);
  }

  return (await response.json()) as T;
}

export async function bzzoiroGetPaginated<T>(
  path: string,
  query: Record<string, QueryValue> = {},
  maxPages = 12,
): Promise<T[]> {
  const results: T[] = [];
  let page = 1;

  while (page <= maxPages) {
    const payload = await bzzoiroGet<BzzoiroPage<T>>(path, {
      page,
      page_size: 500,
      ...query,
    });

    results.push(...(payload.results ?? []));

    if (!payload.next) {
      break;
    }

    page += 1;
  }

  return results;
}

function buildApiUrl(path: string, query: Record<string, QueryValue>) {
  const base = normalizeBaseUrl(process.env.BSD_API_BASE_URL ?? DEFAULT_API_BASE_URL);
  const url = new URL(`${base}/${path.replace(/^\/+/, "")}`);

  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined || value === "") continue;
    url.searchParams.set(key, String(value));
  }

  return url;
}

function getPublicBaseUrl() {
  const apiBase = normalizeBaseUrl(process.env.BSD_API_BASE_URL ?? DEFAULT_API_BASE_URL);
  if (apiBase.endsWith("/api")) {
    return apiBase.slice(0, -4);
  }
  return DEFAULT_PUBLIC_BASE_URL;
}

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

