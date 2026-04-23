"use client";

import { useActionState, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import {
  checkNicknameAvailability,
  updateProfileSettings,
  type OnboardingActionState,
} from "@/app/actions/onboarding";
import { useAuth } from "@/components/auth/AuthProvider";
import ProfileAvatarField from "@/components/profile/ProfileAvatarField";
import { getAvatarOptions, normalizeAvatarUrl } from "@/lib/profile/avatar-options";
import {
  DEFAULT_AVATAR_TRANSFORM,
  normalizeAvatarTransform,
  serializeAvatarTransform,
  type AvatarTransform,
} from "@/lib/profile/avatar-transform";
import {
  getAvatarTransformFromUrl,
  getAvatarUploadAccept,
  getAvatarUploadClientError,
  getAvatarUploadHelperText,
  isPrivateAvatarUrl,
} from "@/lib/profile/avatar-policy";
import {
  getNicknameFormatError,
  getNicknameHelperText,
  getNicknameTakenError,
  normalizeNicknameInput,
} from "@/lib/profile/nickname";

type NicknameStatus = "idle" | "checking" | "available" | "taken";

type ProfileEditorModalProps = {
  avatarUrl: string | null;
  displayName: string;
  isOpen: boolean;
  onClose: () => void;
};

export default function ProfileEditorModal({
  avatarUrl,
  displayName,
  isOpen,
  onClose,
}: ProfileEditorModalProps) {
  const router = useRouter();
  const { refreshProfile } = useAuth();
  const [state, formAction, isPending] = useActionState<OnboardingActionState, FormData>(
    updateProfileSettings,
    null,
  );
  const formRef = useRef<HTMLFormElement | null>(null);
  const nicknameRequestId = useRef(0);
  const lastValidatedNickname = useRef<string | null>(normalizeNicknameInput(displayName) ?? null);
  const avatarFileInputRef = useRef<HTMLInputElement | null>(null);
  const avatarObjectUrlRef = useRef<string | null>(null);

  const normalizedCurrentAvatarUrl = useMemo(() => normalizeAvatarUrl(avatarUrl), [avatarUrl]);
  const initialAvatarTransform = useMemo(
    () => normalizeAvatarTransform(getAvatarTransformFromUrl(normalizedCurrentAvatarUrl)),
    [normalizedCurrentAvatarUrl],
  );
  const avatarOptions = useMemo(
    () => getAvatarOptions(normalizedCurrentAvatarUrl),
    [normalizedCurrentAvatarUrl],
  );
  const currentNormalizedNickname = normalizeNicknameInput(displayName) ?? "";

  const [nickname, setNickname] = useState(displayName);
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState<string | null>(normalizedCurrentAvatarUrl);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(normalizedCurrentAvatarUrl);
  const [avatarTransform, setAvatarTransform] = useState<AvatarTransform>(initialAvatarTransform);
  const [uploadedAvatarName, setUploadedAvatarName] = useState<string | null>(null);
  const [avatarUploadError, setAvatarUploadError] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [isCheckingNickname, setIsCheckingNickname] = useState(false);
  const [nicknameStatus, setNicknameStatus] = useState<NicknameStatus>(
    currentNormalizedNickname ? "available" : "idle",
  );
  const [nicknameMessage, setNicknameMessage] = useState(
    currentNormalizedNickname ? "זה כבר הכינוי הפעיל שלך. אפשר לשמור אותו או לשנות." : getNicknameHelperText(),
  );

  useEffect(() => {
    return () => {
      if (avatarObjectUrlRef.current) {
        URL.revokeObjectURL(avatarObjectUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !isPending) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, isPending, onClose]);

  useEffect(() => {
    if (!state?.success || !isOpen) {
      return;
    }

    let cancelled = false;

    void (async () => {
      await refreshProfile();
      if (cancelled) {
        return;
      }

      onClose();
      router.refresh();
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, onClose, refreshProfile, router, state?.success]);

  function clearUploadedAvatarDraft(options?: { clearInput?: boolean }) {
    if (avatarObjectUrlRef.current) {
      URL.revokeObjectURL(avatarObjectUrlRef.current);
      avatarObjectUrlRef.current = null;
    }

    if (options?.clearInput !== false && avatarFileInputRef.current) {
      avatarFileInputRef.current.value = "";
    }

    setUploadedAvatarName(null);
  }

  function handleNicknameChange(nextValue: string) {
    setNickname(nextValue);
    setClientError(null);

    const normalized = normalizeNicknameInput(nextValue);
    if (!normalized) {
      setNicknameStatus("idle");
      setNicknameMessage(getNicknameHelperText());
      return;
    }

    if (lastValidatedNickname.current === normalized) {
      setNicknameStatus("available");
      setNicknameMessage("הכינוי הזה כבר אושר ואפשר לשמור אותו.");
      return;
    }

    setNicknameStatus("idle");
    setNicknameMessage("נבדוק את הכינוי לפני השמירה.");
  }

  async function ensureNicknameIsReady() {
    const normalizedNickname = normalizeNicknameInput(nickname);
    if (!normalizedNickname) {
      const message = getNicknameFormatError();
      setNicknameStatus("taken");
      setNicknameMessage(message);
      setClientError(message);
      return null;
    }

    if (lastValidatedNickname.current === normalizedNickname && nicknameStatus === "available") {
      setNickname(normalizedNickname);
      setClientError(null);
      return normalizedNickname;
    }

    const requestId = nicknameRequestId.current + 1;
    nicknameRequestId.current = requestId;

    setIsCheckingNickname(true);
    setNicknameStatus("checking");
    setNicknameMessage("בודקים אם הכינוי פנוי...");
    setClientError(null);

    try {
      const result = await checkNicknameAvailability(normalizedNickname);
      if (requestId !== nicknameRequestId.current) {
        return null;
      }

      if (!result.available || !result.normalized) {
        const message = result.message ?? getNicknameTakenError();
        lastValidatedNickname.current = null;
        setNicknameStatus("taken");
        setNicknameMessage(message);
        setClientError(message);
        return null;
      }

      lastValidatedNickname.current = result.normalized;
      setNickname(result.normalized);
      setNicknameStatus("available");
      setNicknameMessage(result.message ?? "הכינוי הזה פנוי.");
      setClientError(null);
      return result.normalized;
    } finally {
      if (requestId === nicknameRequestId.current) {
        setIsCheckingNickname(false);
      }
    }
  }

  async function handleNicknameBlur() {
    if (!nickname.trim()) {
      return;
    }

    await ensureNicknameIsReady();
  }

  function selectAvatarOption(nextAvatarUrl: string | null) {
    clearUploadedAvatarDraft();
    setSelectedAvatarUrl(nextAvatarUrl);
    setAvatarPreviewUrl(nextAvatarUrl);
    setAvatarTransform(normalizeAvatarTransform(getAvatarTransformFromUrl(nextAvatarUrl)));
    setAvatarUploadError(null);
    setClientError(null);
  }

  function clearAvatarSelection() {
    clearUploadedAvatarDraft();
    setSelectedAvatarUrl(null);
    setAvatarPreviewUrl(null);
    setAvatarTransform(DEFAULT_AVATAR_TRANSFORM);
    setAvatarUploadError(null);
    setClientError(null);
  }

  function handleAvatarFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const error = getAvatarUploadClientError(file);
    if (error) {
      clearUploadedAvatarDraft();
      setAvatarUploadError(error);
      return;
    }

    clearUploadedAvatarDraft({ clearInput: false });
    const objectUrl = URL.createObjectURL(file);
    avatarObjectUrlRef.current = objectUrl;
    setUploadedAvatarName(file.name);
    setAvatarPreviewUrl(objectUrl);
    setAvatarTransform(DEFAULT_AVATAR_TRANSFORM);
    setAvatarUploadError(null);
    setClientError(null);
  }

  async function handleSaveClick() {
    const normalizedNickname = await ensureNicknameIsReady();
    if (!normalizedNickname) {
      return;
    }

    setNickname(normalizedNickname);
    formRef.current?.requestSubmit();
  }

  if (!isOpen) {
    return null;
  }

  const nicknameTone =
    nicknameStatus === "available"
      ? "text-wc-neon"
      : nicknameStatus === "checking"
        ? "text-[color:#7dd3fc]"
        : nicknameStatus === "taken"
          ? "text-wc-danger"
          : "text-wc-fg3";

  const nicknamePreview = normalizeNicknameInput(nickname) ?? displayName;
  const avatarStatusLabel = uploadedAvatarName
    ? "תמונה אישית חדשה"
    : avatarOptions.find((option) => option.src === selectedAvatarUrl)?.label ?? null;

  const canAdjustAvatar =
    Boolean(uploadedAvatarName) || Boolean(selectedAvatarUrl && isPrivateAvatarUrl(selectedAvatarUrl));

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(2,6,23,0.72)] px-4 py-6 backdrop-blur-sm"
      onClick={() => {
        if (!isPending) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-editor-title"
        className="wc-glass max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] p-5 sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <form
          ref={formRef}
          action={formAction}
          className="space-y-6"
        >
          <input type="hidden" name="nickname" value={nickname} />
          <input type="hidden" name="avatar_url" value={selectedAvatarUrl ?? ""} />
          <input type="hidden" name="avatar_transform" value={serializeAvatarTransform(avatarTransform)} />
          <input type="hidden" name="avatar_upload_requested" value={uploadedAvatarName ? "1" : "0"} />
          <input
            ref={avatarFileInputRef}
            type="file"
            name="avatar_file"
            accept={getAvatarUploadAccept()}
            className="hidden"
            onChange={handleAvatarFileChange}
          />

          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.22em] text-wc-neon">עריכת פרופיל</p>
              <h2 id="profile-editor-title" className="mt-2 text-3xl font-black text-wc-fg1">
                הכינוי והתמונה שלך
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-wc-fg2">
                כאן אפשר לעדכן את איך שאתה מופיע בליגות, בהשוואות ובמסך הניחושים. הכינוי נשאר
                ייחודי, וגם העלאת תמונה אישית נבדקת ונשמרת בצורה פרטית.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-full border border-white/10 px-3 py-2 text-sm font-semibold text-wc-fg3 transition hover:border-white/20 hover:text-wc-fg1 disabled:cursor-not-allowed disabled:opacity-50"
            >
              סגור
            </button>
          </div>

          <div className="grid gap-6 lg:grid-cols-[280px,1fr]">
            <ProfileAvatarField
              avatarTransform={avatarTransform}
              avatarOptions={avatarOptions}
              avatarPreviewUrl={avatarPreviewUrl}
              avatarStatusLabel={avatarStatusLabel}
              canAdjustAvatar={canAdjustAvatar}
              helperText={getAvatarUploadHelperText()}
              nicknamePreview={nicknamePreview}
              onAvatarTransformChange={(nextTransform) => {
                setAvatarTransform(normalizeAvatarTransform(nextTransform));
              }}
              onClearAvatar={clearAvatarSelection}
              onOpenFilePicker={() => avatarFileInputRef.current?.click()}
              onResetAvatarTransform={() => setAvatarTransform(DEFAULT_AVATAR_TRANSFORM)}
              onSelectAvatar={selectAvatarOption}
              selectedAvatarUrl={selectedAvatarUrl}
              uploadError={avatarUploadError}
              uploadedFileName={uploadedAvatarName}
            />

            <div className="space-y-5">
              <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
                <p className="text-sm font-semibold text-wc-fg1">כינוי ייחודי</p>
                <p className="mt-2 text-sm text-wc-fg2">
                  הכינוי הזה יוצג בכל טבלה, ליגה ודף השוואה. הוא חייב להיות ייחודי בכל המערכת,
                  גם אם אתה רק מעדכן את הפרופיל אחרי שכבר התחלת לשחק.
                </p>

                <label htmlFor="profile-editor-nickname" className="sr-only">
                  כינוי
                </label>
                <input
                  id="profile-editor-nickname"
                  type="text"
                  value={nickname}
                  onChange={(event) => handleNicknameChange(event.target.value)}
                  onBlur={() => {
                    void handleNicknameBlur();
                  }}
                  maxLength={20}
                  autoFocus
                  className={`mt-4 w-full rounded-[1.2rem] border bg-[rgba(255,255,255,0.05)] px-4 py-3 text-sm text-wc-fg1 outline-none placeholder:text-wc-fg3 ${
                    nicknameStatus === "taken"
                      ? "border-wc-danger/60"
                      : nicknameStatus === "available"
                        ? "border-wc-neon/50"
                        : "border-white/10 focus:border-wc-neon/40"
                  }`}
                  placeholder="למשל: מלך_החיזוי"
                />
                <div className={`mt-2 text-xs font-semibold ${nicknameTone}`}>{nicknameMessage}</div>
              </div>

              <div className="rounded-[1.5rem] border border-white/10 bg-[rgba(95,255,123,0.05)] p-5 text-sm text-wc-fg2">
                אם תבחר תמונה משלך, היא תישמר כקובץ פרטי בשרת ותוגש רק דרך מסלול פנימי מאומת.
                אנחנו גם לא מקבלים SVG או קבצים שלא מזוהים באמת כתמונה.
              </div>
            </div>
          </div>

          {clientError || state?.error ? (
            <div className="rounded-2xl bg-[color:var(--wc-danger-bg)] px-4 py-3 text-sm font-semibold text-wc-danger">
              {clientError ?? state?.error}
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="wc-button-secondary px-5 py-3 text-sm disabled:opacity-50"
            >
              ביטול
            </button>

            <button
              type="button"
              disabled={isPending || isCheckingNickname}
              onClick={() => {
                void handleSaveClick();
              }}
              className="wc-button-primary px-6 py-3 text-sm font-bold disabled:opacity-50"
            >
              {isPending ? "שומרים..." : isCheckingNickname ? "בודקים..." : "שמור שינויים"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
