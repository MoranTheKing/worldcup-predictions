import {
  buildPrivateAvatarUrl,
  getPrivateAvatarObjectPath,
  PROFILE_AVATAR_ALLOWED_MIME_TYPES,
  PROFILE_AVATAR_BUCKET,
  PROFILE_AVATAR_FILE_SIZE_LIMIT,
  PROFILE_AVATAR_MAX_BYTES,
} from "@/lib/profile/avatar-policy";
import { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

let bucketReadyPromise: Promise<void> | null = null;

export async function ensureProfileAvatarBucket(admin: AdminClient) {
  if (bucketReadyPromise) {
    return bucketReadyPromise;
  }

  bucketReadyPromise = (async () => {
    const { data: buckets, error: bucketsError } = await admin.storage.listBuckets();
    if (bucketsError) {
      throw new Error(`Unable to inspect avatar bucket: ${bucketsError.message}`);
    }

    const existingBucket = (buckets ?? []).find((bucket) => bucket.id === PROFILE_AVATAR_BUCKET);
    const desiredOptions = {
      public: false,
      allowedMimeTypes: [...PROFILE_AVATAR_ALLOWED_MIME_TYPES],
      fileSizeLimit: PROFILE_AVATAR_FILE_SIZE_LIMIT,
    };

    if (!existingBucket) {
      const { error: createError } = await admin.storage.createBucket(
        PROFILE_AVATAR_BUCKET,
        desiredOptions,
      );

      if (createError) {
        throw new Error(`Unable to create avatar bucket: ${createError.message}`);
      }

      return;
    }

    const { error: updateError } = await admin.storage.updateBucket(PROFILE_AVATAR_BUCKET, desiredOptions);
    if (updateError) {
      throw new Error(`Unable to update avatar bucket: ${updateError.message}`);
    }
  })().catch((error) => {
    bucketReadyPromise = null;
    throw error;
  });

  return bucketReadyPromise;
}

export async function uploadPrivateAvatar(admin: AdminClient, userId: string, file: File) {
  await ensureProfileAvatarBucket(admin);

  const upload = await validateAvatarFile(file);
  if (!upload.ok) {
    return upload;
  }

  const objectPath = getPrivateAvatarObjectPath(userId);
  const blob = new Blob([upload.bytes], { type: upload.contentType });
  const { error } = await admin.storage.from(PROFILE_AVATAR_BUCKET).upload(objectPath, blob, {
    cacheControl: "3600",
    contentType: upload.contentType,
    upsert: true,
  });

  if (error) {
    console.error("[uploadPrivateAvatar] upload failed:", error.message);
    return { ok: false as const, message: "לא הצלחנו לשמור את התמונה כרגע. נסה שוב." };
  }

  return {
    ok: true as const,
    avatarUrl: buildPrivateAvatarUrl(userId),
  };
}

export async function removePrivateAvatar(admin: AdminClient, userId: string) {
  try {
    await ensureProfileAvatarBucket(admin);
  } catch (error) {
    console.warn("[removePrivateAvatar] bucket not ready:", error);
    return;
  }

  const { error } = await admin.storage
    .from(PROFILE_AVATAR_BUCKET)
    .remove([getPrivateAvatarObjectPath(userId)]);

  if (error) {
    console.warn("[removePrivateAvatar] remove failed:", error.message);
  }
}

async function validateAvatarFile(file: File) {
  if (file.size <= 0) {
    return { ok: false as const, message: "לא נבחר קובץ תקין." };
  }

  if (file.size > PROFILE_AVATAR_MAX_BYTES) {
    return { ok: false as const, message: "התמונה גדולה מדי. אפשר להעלות עד 2MB." };
  }

  const declaredType = file.type.trim().toLowerCase();
  if (
    declaredType &&
    !PROFILE_AVATAR_ALLOWED_MIME_TYPES.includes(
      declaredType as (typeof PROFILE_AVATAR_ALLOWED_MIME_TYPES)[number],
    )
  ) {
    return { ok: false as const, message: "אפשר להעלות רק JPG, PNG או WebP." };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const detectedType = detectMimeType(bytes);

  if (!detectedType) {
    return { ok: false as const, message: "לא הצלחנו לאמת את סוג הקובץ. העלה תמונת JPG, PNG או WebP." };
  }

  if (declaredType && declaredType !== detectedType) {
    return { ok: false as const, message: "הקובץ שהועלה לא תואם לסוג התמונה שדווח." };
  }

  return {
    ok: true as const,
    bytes,
    contentType: detectedType,
  };
}

function detectMimeType(bytes: Uint8Array) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }

  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
}
