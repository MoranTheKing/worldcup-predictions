import { NextResponse } from "next/server";

export function devOnly(): NextResponse | null {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "dev-tools disabled in production" }, { status: 403 });
  }
  return null;
}
