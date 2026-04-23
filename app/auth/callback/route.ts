import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

function getSafeRedirectPath(nextParam: string | null): string {
  if (!nextParam) {
    return "/dashboard";
  }

  if (!nextParam.startsWith("/") || nextParam.startsWith("//") || nextParam.includes("\\")) {
    return "/dashboard";
  }

  return nextParam;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectPath = getSafeRedirectPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(redirectPath, origin));
    }
  }

  return NextResponse.redirect(new URL("/login?error=auth_callback_failed", origin));
}
