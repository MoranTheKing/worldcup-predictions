"use client";

import UserAvatar from "@/components/UserAvatar";
import type { AvatarOption } from "@/lib/profile/avatar-options";

type ProfileAvatarFieldProps = {
  avatarOptions: AvatarOption[];
  avatarPreviewUrl: string | null;
  avatarStatusLabel: string | null;
  helperText: string;
  nicknamePreview: string;
  onClearAvatar: () => void;
  onOpenFilePicker: () => void;
  onSelectAvatar: (url: string | null) => void;
  selectedAvatarUrl: string | null;
  uploadError: string | null;
  uploadedFileName: string | null;
};

export default function ProfileAvatarField({
  avatarOptions,
  avatarPreviewUrl,
  avatarStatusLabel,
  helperText,
  nicknamePreview,
  onClearAvatar,
  onOpenFilePicker,
  onSelectAvatar,
  selectedAvatarUrl,
  uploadError,
  uploadedFileName,
}: ProfileAvatarFieldProps) {
  return (
    <div className="space-y-5">
      <div className="rounded-[1.8rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-5 text-center">
        <UserAvatar
          name={nicknamePreview || "Player"}
          src={avatarPreviewUrl}
          size={120}
          roundedClassName="rounded-[2rem]"
          className="mx-auto"
          priority
        />
        <div className="mt-4 text-sm font-semibold text-wc-fg1">
          {nicknamePreview || "הכינוי שלך יופיע כאן"}
        </div>
        <div className="mt-1 text-xs text-wc-fg3">
          {avatarStatusLabel ?? "ללא תמונה"}
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-wc-fg1">תמונה אופציונלית</p>
            <p className="mt-1 text-xs text-wc-fg3">{helperText}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onOpenFilePicker}
              className="rounded-full border border-wc-neon/30 bg-[rgba(95,255,123,0.08)] px-4 py-2 text-xs font-bold text-wc-neon transition hover:border-wc-neon/60 hover:bg-[rgba(95,255,123,0.14)]"
            >
              העלאת תמונה
            </button>
            <button
              type="button"
              onClick={onClearAvatar}
              className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-wc-fg3 transition hover:border-white/20 hover:text-wc-fg1"
            >
              ללא תמונה
            </button>
          </div>
        </div>

        {uploadedFileName ? (
          <div className="mt-4 rounded-[1.1rem] border border-wc-neon/20 bg-[rgba(95,255,123,0.06)] px-4 py-3 text-xs font-semibold text-wc-fg1">
            נבחר קובץ חדש: {uploadedFileName}
          </div>
        ) : null}

        {uploadError ? (
          <div className="mt-4 rounded-[1.1rem] bg-[color:var(--wc-danger-bg)] px-4 py-3 text-xs font-semibold text-wc-danger">
            {uploadError}
          </div>
        ) : null}

        <div className="mt-4 grid gap-3 sm:grid-cols-5">
          <button
            type="button"
            onClick={() => onSelectAvatar(null)}
            className={`rounded-[1.2rem] border p-3 text-center transition ${
              selectedAvatarUrl === null && !uploadedFileName
                ? "border-wc-neon bg-[rgba(95,255,123,0.08)]"
                : "border-white/10 bg-white/5 hover:border-white/20"
            }`}
          >
            <div className="flex justify-center">
              <UserAvatar
                name={nicknamePreview || "Player"}
                src={null}
                size={56}
                roundedClassName="rounded-[1.1rem]"
              />
            </div>
            <div className="mt-2 text-[11px] font-semibold text-wc-fg2">ללא תמונה</div>
          </button>

          {avatarOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelectAvatar(option.src)}
              className={`rounded-[1.2rem] border p-3 text-center transition ${
                selectedAvatarUrl === option.src && !uploadedFileName
                  ? "border-wc-neon bg-[rgba(95,255,123,0.08)]"
                  : "border-white/10 bg-white/5 hover:border-white/20"
              }`}
            >
              <div className="flex justify-center">
                <UserAvatar
                  name={option.label}
                  src={option.src}
                  size={56}
                  roundedClassName="rounded-[1.1rem]"
                />
              </div>
              <div className="mt-2 text-[11px] font-semibold text-wc-fg2">{option.label}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
