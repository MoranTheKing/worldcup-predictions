import { NextResponse } from "next/server";
import { isLocalRequest } from "@/lib/security/local-request";

export function devOnly(request?: Request): NextResponse | null {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "dev-tools disabled in production" }, { status: 403 });
  }

  if (request && !isLocalRequest(request)) {
    return NextResponse.json(
      { error: "dev-tools are only available from localhost" },
      { status: 403 },
    );
  }

  return null;
}
