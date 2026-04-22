"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

interface Props {
  userId:          string;
  username:        string;
  streak:          number;
  jokersGroups:    number;
  jokersKnockouts: number;
}

function onInputFocus(e: React.FocusEvent<HTMLInputElement>) {
  e.target.style.borderColor = "var(--wc-neon)";
  e.target.style.boxShadow   = "0 0 0 3px var(--wc-neon-glow)";
}
function onInputBlur(e: React.FocusEvent<HTMLInputElement>) {
  e.target.style.borderColor = "var(--wc-border)";
  e.target.style.boxShadow   = "none";
}

export default function ProfileClient({
  userId, username, streak, jokersGroups, jokersKnockouts,
}: Props) {
  const supabase = createClient();
  const router   = useRouter();

  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameValue,   setNicknameValue]   = useState(username);
  const [nicknameSaving,  setNicknameSaving]  = useState(false);
  const [nicknameError,   setNicknameError]   = useState<string | null>(null);

  async function saveNickname() {
    if (!nicknameValue.trim() || nicknameValue.trim().length < 2) {
      setNicknameError("כינוי חייב להכיל לפחות 2 תווים");
      return;
    }
    setNicknameSaving(true);
    setNicknameError(null);
    const { error } = await supabase
      .from("users")
      .update({ username: nicknameValue.trim() })
      .eq("id", userId);
    if (error?.code === "23505") setNicknameError("הכינוי הזה תפוס, בחר אחר");
    else if (error) { console.error(error.message); setNicknameError("שגיאה בשמירה"); }
    else { setEditingNickname(false); router.refresh(); }
    setNicknameSaving(false);
  }

  const streakBadge = streak >= 3 ? "🔥" : streak <= -5 ? "🐢" : null;

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1
          className="text-xl md:text-2xl font-bold"
          style={{ fontFamily: "var(--font-display)", color: "var(--wc-fg1)" }}
        >
          הפרופיל שלי
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--wc-fg2)" }}>
          כינוי וג׳וקרים
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">

        {/* ── Nickname card ──────────────────────────────────────────────────── */}
        <div
          className="rounded-2xl p-5"
          style={{ background: "var(--wc-surface)", border: "1px solid var(--wc-border)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--wc-fg3)" }}>
              כינוי
            </p>
            {!editingNickname && (
              <button
                onClick={() => { setEditingNickname(true); setNicknameError(null); }}
                className="text-xs font-medium"
                style={{ color: "var(--wc-neon)" }}
              >
                ✏️ ערוך
              </button>
            )}
          </div>

          {editingNickname ? (
            <div className="flex flex-col gap-3">
              <input
                autoFocus
                type="text"
                value={nicknameValue}
                onChange={(e) => setNicknameValue(e.target.value)}
                onFocus={onInputFocus}
                onBlur={onInputBlur}
                maxLength={20}
                className="w-full text-sm"
                style={{
                  background: "var(--wc-raised)",
                  border: "1.5px solid var(--wc-border)",
                  borderRadius: 12,
                  color: "var(--wc-fg1)",
                  padding: "10px 14px",
                  outline: "none",
                }}
              />
              {nicknameError && (
                <p
                  className="text-xs"
                  style={{
                    background: "var(--wc-danger-bg)",
                    color: "var(--wc-danger)",
                    borderRadius: 8,
                    padding: "6px 10px",
                  }}
                >
                  {nicknameError}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={saveNickname}
                  disabled={nicknameSaving}
                  className="flex-1 py-2 rounded-xl text-xs font-medium disabled:opacity-50"
                  style={{
                    background: "var(--wc-neon)",
                    color: "var(--wc-fg-inverse)",
                    boxShadow: "0 0 16px var(--wc-neon-glow)",
                  }}
                >
                  {nicknameSaving ? "שומר..." : "שמור"}
                </button>
                <button
                  onClick={() => {
                    setEditingNickname(false);
                    setNicknameValue(username);
                    setNicknameError(null);
                  }}
                  className="flex-1 py-2 rounded-xl text-xs font-medium"
                  style={{
                    background: "var(--wc-raised)",
                    border: "1px solid var(--wc-border)",
                    color: "var(--wc-fg2)",
                  }}
                >
                  בטל
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center text-base font-bold"
                style={{
                  background: "linear-gradient(135deg, var(--wc-neon), #009A3D)",
                  color: "var(--wc-fg-inverse)",
                }}
              >
                {(username || "?").charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-bold" style={{ color: "var(--wc-fg1)" }}>
                  {username} {streakBadge}
                </p>
                {streak !== 0 && (
                  <p className="text-xs" style={{ color: "var(--wc-fg2)" }}>
                    {streak > 0 ? `+${streak}` : streak} רצף
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Jokers card ───────────────────────────────────────────────────── */}
        <div
          className="rounded-2xl p-5"
          style={{ background: "var(--wc-surface)", border: "1px solid var(--wc-border)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--wc-fg3)" }}>
            ג׳וקרים
          </p>
          <div className="flex gap-3">
            <div
              className="flex-1 rounded-xl py-3 text-center"
              style={{
                background: "rgba(111,60,255,0.1)",
                border: "1px solid rgba(111,60,255,0.25)",
              }}
            >
              <p className="text-2xl font-bold" style={{ color: "var(--wc-violet)" }}>
                {jokersGroups}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--wc-fg2)" }}>שלב הבתים</p>
            </div>
            <div
              className="flex-1 rounded-xl py-3 text-center"
              style={{
                background: "rgba(111,60,255,0.1)",
                border: "1px solid rgba(111,60,255,0.25)",
              }}
            >
              <p className="text-2xl font-bold" style={{ color: "var(--wc-violet)" }}>
                {jokersKnockouts}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--wc-fg2)" }}>נוקאאוט</p>
            </div>
          </div>
          <p className="text-xs mt-2 text-center" style={{ color: "var(--wc-fg3)" }}>
            ג׳וקר = ×3 על תוצאה מדויקת
          </p>
        </div>

        {/* ── Prediction game CTA ───────────────────────────────────────────── */}
        <div
          className="md:col-span-2 rounded-2xl p-5 flex items-center justify-between gap-4"
          style={{ background: "var(--wc-surface)", border: "1px solid var(--wc-border)" }}
        >
          <div>
            <p className="text-sm font-bold" style={{ color: "var(--wc-fg1)" }}>
              ניחושי הטורניר ומשחקים
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--wc-fg2)" }}>
              ניהול ניחושים ונבחרת זוכה נמצא במשחק הניחושים
            </p>
          </div>
          <Link
            href="/game/predictions"
            className="wc-button-primary px-4 py-2.5 text-sm font-bold flex-shrink-0"
          >
            לניחושים ←
          </Link>
        </div>

      </div>
    </div>
  );
}
