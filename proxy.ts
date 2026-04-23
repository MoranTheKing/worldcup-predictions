import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_DASHBOARD_PREFIXES = ["/dashboard/tournament"];
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

function isLocalProxyRequest(request: NextRequest) {
  const hostname = resolveHostname([
    request.headers.get("x-forwarded-host"),
    request.headers.get("host"),
    request.headers.get("origin"),
    request.nextUrl.host,
  ]);

  return isLocalHostname(hostname);
}

function isDevOnlyPath(pathname: string) {
  return pathname === "/dev-tools" || pathname.startsWith("/api/dev/");
}

function isPublicDashboardPath(pathname: string) {
  return PUBLIC_DASHBOARD_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isProtectedPath(pathname: string) {
  if (
    pathname === "/game" ||
    pathname.startsWith("/game/") ||
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/matches") ||
    pathname.startsWith("/dashboard/profile") ||
    pathname.startsWith("/dashboard/leagues") ||
    pathname.startsWith("/leagues") ||
    pathname.startsWith("/predictions") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/dev-tools")
  ) {
    return !isPublicDashboardPath(pathname);
  }

  return false;
}

function isAuthPage(pathname: string) {
  return pathname === "/login" || pathname === "/signup";
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  if (isDevOnlyPath(pathname) && !isLocalProxyRequest(request)) {
    return new NextResponse(null, { status: 404 });
  }

  if (!user && isProtectedPath(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isAuthPage(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)",
  ],
};
