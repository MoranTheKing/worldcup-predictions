"use client";

import UserAvatar from "@/components/UserAvatar";
import type { AvatarOption } from "@/lib/profile/avatar-options";
import {
  AVATAR_POSITION_MAX,
  AVATAR_POSITION_MIN,
  AVATAR_POSITION_STEP,
  AVATAR_ZOOM_MAX,
  AVATAR_ZOOM_MIN,
  AVATAR_ZOOM_STEP,
  type AvatarTransform,
} from "@/lib/profile/avatar-transform";

type ProfileAvatarFieldProps = {
  avatarOptions: AvatarOption[];
  avatarPreviewUrl: string | null;
  avatarStatusLabel: string | null;
  avatarTransform: AvatarTransform;
  canAdjustAvatar: boolean;
  helperText: string;
  nicknamePreview: string;
  onAvatarTransformChange: (nextTransform: AvatarTransform) => void;
  onClearAvatar: () => void;
  onOpenFilePicker: () => void;
  onResetAvatarTransform: () => void;
  onSelectAvatar: (url: string | null) => void;
  selectedAvatarUrl: string | null;
  uploadError: string | null;
  uploadedFileName: string | null;
};

export default function ProfileAvatarField({
  avatarOptions,
  avatarPreviewUrl,
  avatarStatusLabel,
  avatarTransform,
  canAdjustAvatar,
  helperText,
  nicknamePreview,
  onAvatarTransformChange,
  onClearAvatar,
  onOpenFilePicker,
  onResetAvatarTransform,
  onSelectAvatar,
  selectedAvatarUrl,
  uploadError,
  uploadedFileName,
}: ProfileAvatarFieldProps) {
  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-[1.9rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-5 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(95,255,123,0.18),transparent_38%),radial-gradient(circle_at_bottom,rgba(255,47,166,0.14),transparent_55%)]" />

        <div className="relative">
          <div className="mx-auto inline-flex rounded-full border border-white/10 bg-[rgba(8,13,26,0.46)] px-3 py-1 text-[11px] font-semibold text-wc-fg2">
            תצוגה חיה
          </div>
        </div>

        <UserAvatar
          name={nicknamePreview || "Player"}
          src={avatarPreviewUrl}
          transform={avatarTransform}
          size={120}
          roundedClassName="rounded-[2rem]"
          className="mx-auto mt-4"
          allowPreviewObjectUrl
          expandable={Boolean(avatarPreviewUrl)}
          priority
        />

        <div className="mt-4 text-sm font-semibold text-wc-fg1">
          {nicknamePreview || "הכינוי שלך יופיע כאן"}
        </div>
        <div className="mt-1 text-xs text-wc-fg3">{avatarStatusLabel ?? "ללא תמונה"}</div>

        {uploadedFileName ? (
          <div className="mt-4 rounded-full border border-wc-neon/20 bg-[rgba(95,255,123,0.08)] px-4 py-2 text-[11px] font-semibold text-wc-neon">
            התצוגה כאן חיה. הקובץ יישמר רק כשתאשר.
          </div>
        ) : null}
      </div>

      <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-wc-fg1">תמונת פרופיל אופציונלית</p>
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
                expandable={false}
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
                  expandable={false}
                />
              </div>
              <div className="mt-2 text-[11px] font-semibold text-wc-fg2">{option.label}</div>
            </button>
          ))}
        </div>
      </div>

      {canAdjustAvatar ? (
        <div className="rounded-[1.6rem] border border-wc-neon/18 bg-[linear-gradient(180deg,rgba(95,255,123,0.08),rgba(255,255,255,0.03))] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-wc-fg1">דיוק של המסגור</p>
              <p className="mt-1 text-xs leading-6 text-wc-fg3">
                מזיזים ומקרבים את התמונה עד שהפנים יושבות בדיוק כמו שרוצים.
              </p>
            </div>
            <button
              type="button"
              onClick={onResetAvatarTransform}
              className="rounded-full border border-white/10 px-3 py-2 text-[11px] font-semibold text-wc-fg2 transition hover:border-white/20 hover:text-wc-fg1"
            >
              איפוס
            </button>
          </div>

          <div className="mt-4 rounded-[1.5rem] border border-white/10 bg-[rgba(7,11,21,0.66)] p-4">
            <div className="mx-auto w-fit">
              <UserAvatar
                name={nicknamePreview || "Player"}
                src={avatarPreviewUrl}
                transform={avatarTransform}
                size={176}
                roundedClassName="rounded-[2.2rem]"
                className="shadow-[0_22px_55px_rgba(95,255,123,0.12)]"
                allowPreviewObjectUrl
                expandable={false}
                priority
              />
            </div>
          </div>

          <div className="mt-4 space-y-4">
            <SliderControl
              label="מיקום אופקי"
              value={avatarTransform.x}
              min={AVATAR_POSITION_MIN}
              max={AVATAR_POSITION_MAX}
              step={AVATAR_POSITION_STEP}
              onChange={(value) => onAvatarTransformChange({ ...avatarTransform, x: value })}
            />
            <SliderControl
              label="מיקום אנכי"
              value={avatarTransform.y}
              min={AVATAR_POSITION_MIN}
              max={AVATAR_POSITION_MAX}
              step={AVATAR_POSITION_STEP}
              onChange={(value) => onAvatarTransformChange({ ...avatarTransform, y: value })}
            />
            <SliderControl
              label="זום"
              value={avatarTransform.zoom}
              min={AVATAR_ZOOM_MIN}
              max={AVATAR_ZOOM_MAX}
              step={AVATAR_ZOOM_STEP}
              onChange={(value) => onAvatarTransformChange({ ...avatarTransform, zoom: value })}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SliderControl({
  label,
  max,
  min,
  onChange,
  step,
  value,
}: {
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  step: number;
  value: number;
}) {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <label className="block">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-wc-fg2">{label}</span>
        <span className="rounded-full border border-white/10 bg-[rgba(255,255,255,0.04)] px-2 py-1 text-[11px] font-semibold text-wc-fg1">
          {Number.isInteger(value) ? value : value.toFixed(2).replace(/\.?0+$/, "")}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number.parseFloat(event.target.value))}
        className="wc-range"
        style={{
          background: `linear-gradient(90deg, rgba(95,255,123,0.95) 0%, rgba(95,255,123,0.95) ${percentage}%, rgba(255,255,255,0.12) ${percentage}%, rgba(255,255,255,0.12) 100%)`,
        }}
      />
    </label>
  );
}
