import { NextResponse } from "next/server";
import {
  getPrivateAvatarObjectPath,
  PROFILE_AVATAR_BUCKET,
  isPrivateAvatarUrlForUser,
} from "@/lib/profile/avatar-policy";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  _request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  const { userId } = await context.params;
  if (!UUID_PATTERN.test(userId)) {
    return new NextResponse(null, { status: 404 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse(null, { status: 404 });
  }

  const admin = createAdminClient();
  const [{ data: profileRow }, { data: legacyRow }] = await Promise.all([
    admin.from("profiles").select("avatar_url").eq("id", userId).maybeSingle(),
    admin.from("users").select("avatar_url").eq("id", userId).maybeSingle(),
  ]);

  const avatarUrl =
    asNullableString(profileRow?.avatar_url) ?? asNullableString(legacyRow?.avatar_url);

  if (!isPrivateAvatarUrlForUser(avatarUrl, userId)) {
    return new NextResponse(null, { status: 404 });
  }

  const { data, error } = await admin.storage
    .from(PROFILE_AVATAR_BUCKET)
    .download(getPrivateAvatarObjectPath(userId));

  if (error || !data) {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(data, {
    headers: {
      "Cache-Control": "private, max-age=300",
      "Content-Type": data.type || "image/webp",
      Vary: "Cookie",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function asNullableString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}
