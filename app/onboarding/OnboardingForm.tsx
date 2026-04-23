"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  checkNicknameAvailability,
  completeOnboarding,
  type OnboardingActionState,
} from "@/app/actions/onboarding";
import { useAuth } from "@/components/auth/AuthProvider";
import UserAvatar from "@/components/UserAvatar";
import PlayerPicker from "@/components/pickers/PlayerPicker";
import TeamPicker from "@/components/pickers/TeamPicker";
import { getAvatarOptions, normalizeAvatarUrl } from "@/lib/profile/avatar-options";
import {
  getNicknameFormatError,
  getNicknameHelperText,
  getNicknameTakenError,
  normalizeNicknameInput,
} from "@/lib/profile/nickname";

type Team = {
  id: string;
  logo_url: string | null;
  name: string;
  name_he: string | null;
};

type Player = {
  id: number;
  name: string;
  position: string | null;
  team_id: string | null;
};

type OnboardingFormProps = {
  existingAvatarUrl: string | null;
  existingDisplayName: string;
  nextPath: string;
  oauthAvatarUrl: string | null;
  players: Player[];
  teams: Team[];
  tournamentPrediction: {
    predictedTopScorerName: string | null;
    predictedWinnerTeamId: string | null;
  } | null;
  tournamentStarted: boolean;
};

type NicknameStatus = "idle" | "checking" | "available" | "taken";

export default function OnboardingForm({
  existingAvatarUrl,
  existingDisplayName,
  nextPath,
  oauthAvatarUrl,
  players,
  teams,
  tournamentPrediction,
  tournamentStarted,
}: OnboardingFormProps) {
  const router = useRouter();
  const { refreshProfile } = useAuth();
  const [state, formAction, isPending] = useActionState<OnboardingActionState, FormData>(
    completeOnboarding,
    null,
  );
  const normalizedExistingAvatarUrl = useMemo(
    () => normalizeAvatarUrl(existingAvatarUrl),
    [existingAvatarUrl],
  );
  const normalizedOauthAvatarUrl = useMemo(() => normalizeAvatarUrl(oauthAvatarUrl), [oauthAvatarUrl]);
  const initialAvatarUrl = normalizedExistingAvatarUrl ?? normalizedOauthAvatarUrl;

  const avatarOptions = useMemo(() => getAvatarOptions(initialAvatarUrl), [initialAvatarUrl]);
  const sortedTeams = useMemo(
    () =>
      [...teams].sort((left, right) =>
        (left.name_he ?? left.name).localeCompare(right.name_he ?? right.name, "he"),
      ),
    [teams],
  );

  const initialSelectedPlayer =
    players.find((player) => player.name === tournamentPrediction?.predictedTopScorerName) ?? null;
  const initialNickname = normalizeNicknameInput(existingDisplayName) ?? "";
  const finalStep = tournamentStarted ? 0 : 2;
  const nicknameRequestId = useRef(0);
  const lastValidatedNickname = useRef<string | null>(initialNickname || null);

  const [step, setStep] = useState(0);
  const [nickname, setNickname] = useState(existingDisplayName);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [winnerId, setWinnerId] = useState(tournamentPrediction?.predictedWinnerTeamId ?? "");
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(initialSelectedPlayer);
  const [topScorerName, setTopScorerName] = useState(
    tournamentPrediction?.predictedTopScorerName ?? "",
  );
  const [clientError, setClientError] = useState<string | null>(null);
  const [isCheckingNickname, setIsCheckingNickname] = useState(false);
  const [nicknameStatus, setNicknameStatus] = useState<NicknameStatus>(
    initialNickname ? "available" : "idle",
  );
  const [nicknameMessage, setNicknameMessage] = useState(
    initialNickname ? "הכינוי מוכן. אפשר להמשיך או לשנות אותו." : getNicknameHelperText(),
  );

  const hasPlayers = players.length > 0;
  const steps = tournamentStarted ? ["פרופיל"] : ["פרופיל", "הזוכה", "מלך השערים"];
  const selectedAvatarLabel = avatarOptions.find((option) => option.src === avatarUrl)?.label ?? null;

  useEffect(() => {
    if (!state?.success) {
      return;
    }

    let cancelled = false;

    void (async () => {
      await refreshProfile();
      if (cancelled) {
        return;
      }

      router.push(nextPath);
      router.refresh();
    })();

    return () => {
      cancelled = true;
    };
  }, [nextPath, refreshProfile, router, state?.success]);

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
      setNicknameMessage("הכינוי הזה כבר נבדק והוא פנוי.");
      return;
    }

    setNicknameStatus("idle");
    setNicknameMessage("נבדוק שהכינוי פנוי לפני המעבר לשלב הבא.");
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

  async function goToWinnerStep(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    const normalizedNickname = await ensureNicknameIsReady();
    if (!normalizedNickname) {
      return;
    }

    setNickname(normalizedNickname);
    setStep(1);
  }

  function goToTopScorerStep(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (!winnerId) {
      setClientError("צריך לבחור מי תהיה הנבחרת הזוכה לפני שממשיכים.");
      return;
    }

    setClientError(null);
    setStep(2);
  }

  function selectPlayer(player: Player | null) {
    setSelectedPlayer(player);
    setTopScorerName(player?.name ?? "");
    setClientError(null);
  }

  function handleIntermediateSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (!tournamentStarted && step < finalStep) {
      event.preventDefault();
    }
  }

  const nicknameTone =
    nicknameStatus === "available"
      ? "text-wc-neon"
      : nicknameStatus === "checking"
        ? "text-[color:#7dd3fc]"
        : nicknameStatus === "taken"
          ? "text-wc-danger"
          : "text-wc-fg3";

  return (
    <main className="wc-page flex min-h-screen items-center justify-center px-4 py-10">
      <form
        action={step === finalStep ? formAction : undefined}
        onSubmit={handleIntermediateSubmit}
        className="w-full max-w-4xl"
      >
        <input type="hidden" name="nickname" value={nickname} />
        <input type="hidden" name="avatar_url" value={avatarUrl ?? ""} />
        <input type="hidden" name="winner_team_id" value={winnerId} />
        <input type="hidden" name="top_scorer" value={topScorerName} />
        <input type="hidden" name="top_scorer_player_id" value={selectedPlayer?.id ?? ""} />

        <div className="mb-8 text-center">
          <div className="wc-badge mx-auto w-fit text-sm text-wc-fg2">
            <span className="text-wc-neon">שלב הפתיחה</span>
          </div>
          <h1 className="wc-display mt-5 text-5xl text-wc-fg1">בונים את הזהות שלך למשחק</h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-wc-fg2">
            עוד רגע נכנסים. קודם בוחרים כינוי ייחודי, תמונה אם בא לך, ואת ניחושי הפתיחה שלך
            לטורניר.
          </p>
        </div>

        <div className="mb-6 flex items-center justify-center gap-2">
          {steps.map((label, index) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                  index <= step ? "bg-wc-neon text-[color:var(--wc-text-inverse)]" : "bg-white/8 text-wc-fg3"
                }`}
              >
                {index + 1}
              </div>
              <span className={`hidden text-xs sm:block ${index === step ? "text-wc-fg1" : "text-wc-fg3"}`}>
                {label}
              </span>
              {index < steps.length - 1 ? (
                <div className={`h-px w-7 ${index < step ? "bg-wc-neon" : "bg-white/10"}`} />
              ) : null}
            </div>
          ))}
        </div>

        <div className="wc-glass rounded-[2rem] p-6 sm:p-8">
          {step === 0 ? (
            <section className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-[260px,1fr]">
                <div className="rounded-[1.8rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-5 text-center">
                  <UserAvatar
                    name={nickname || "Player"}
                    src={avatarUrl}
                    size={120}
                    roundedClassName="rounded-[2rem]"
                    className="mx-auto"
                    priority
                  />
                  <div className="mt-4 text-sm font-semibold text-wc-fg1">
                    {normalizeNicknameInput(nickname) ?? "הכינוי שלך יופיע כאן"}
                  </div>
                  <div className="mt-1 text-xs text-wc-fg3">
                    {selectedAvatarLabel ? `תמונה: ${selectedAvatarLabel}` : "ללא תמונה"}
                  </div>
                </div>

                <div className="space-y-5">
                  <div>
                    <p className="text-[11px] font-semibold tracking-[0.18em] text-wc-fg3">
                      השלב הכי חשוב
                    </p>
                    <h2 className="mt-2 text-3xl font-black text-wc-fg1">איך כולם יכירו אותך?</h2>
                    <p className="mt-2 text-sm text-wc-fg2">
                      הכינוי שלך חייב להיות ייחודי. אנחנו בודקים אותו כבר כאן, לפני שממשיכים
                      לבחירות הטורניר.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="nickname" className="text-sm font-semibold text-wc-fg1">
                      כינוי ייחודי
                    </label>
                    <input
                      id="nickname"
                      type="text"
                      value={nickname}
                      onChange={(event) => handleNicknameChange(event.target.value)}
                      onBlur={() => {
                        void handleNicknameBlur();
                      }}
                      maxLength={20}
                      autoFocus
                      className={`mt-2 w-full rounded-[1.2rem] border bg-[rgba(255,255,255,0.05)] px-4 py-3 text-sm text-wc-fg1 outline-none placeholder:text-wc-fg3 ${
                        nicknameStatus === "taken"
                          ? "border-wc-danger/60"
                          : nicknameStatus === "available"
                            ? "border-wc-neon/50"
                            : "border-white/10 focus:border-wc-neon/40"
                      }`}
                      placeholder="למשל: מלך_החיזוי"
                    />
                    <div className={`mt-2 text-xs font-semibold ${nicknameTone}`}>
                      {nicknameMessage}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-wc-fg1">תמונה אופציונלית</p>
                      <button
                        type="button"
                        onClick={() => setAvatarUrl(null)}
                        className="text-xs font-semibold text-wc-fg3 transition hover:text-wc-fg1"
                      >
                        נקה בחירה
                      </button>
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-5">
                      <button
                        type="button"
                        onClick={() => setAvatarUrl(null)}
                        className={`rounded-[1.2rem] border p-3 text-center transition ${
                          avatarUrl === null
                            ? "border-wc-neon bg-[rgba(95,255,123,0.08)]"
                            : "border-white/10 bg-white/5 hover:border-white/20"
                        }`}
                      >
                        <div className="flex justify-center">
                          <UserAvatar
                            name={nickname || "Player"}
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
                          onClick={() => setAvatarUrl(option.src)}
                          className={`rounded-[1.2rem] border p-3 text-center transition ${
                            avatarUrl === option.src
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
              </div>

              {tournamentStarted ? (
                <div className="rounded-[1.2rem] border border-white/10 bg-white/5 p-4 text-sm text-wc-fg2">
                  הטורניר כבר התחיל, אז בשלב הזה נשמור רק את הכינוי והתמונה שלך.
                </div>
              ) : (
                <div className="rounded-[1.2rem] border border-wc-neon/20 bg-[rgba(95,255,123,0.05)] p-4 text-sm text-wc-fg2">
                  אחרי הכינוי נעבור לזוכת הטורניר ולמלך השערים. שום דבר לא יישמר עד שתסיים את כל
                  השלבים.
                </div>
              )}
            </section>
          ) : null}

          {!tournamentStarted && step === 1 ? (
            <section className="space-y-5">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.18em] text-wc-fg3">בחירת הטורניר</p>
                <h2 className="mt-2 text-3xl font-black text-wc-fg1">מי תניף את הגביע?</h2>
                <p className="mt-2 text-sm text-wc-fg2">
                  הבחירה הזו ננעלת עם שריקת הפתיחה, אז זה הזמן ללכת עם התחושה הכי חזקה שלך.
                </p>
              </div>

              <TeamPicker teams={sortedTeams} value={winnerId} onChange={setWinnerId} />
            </section>
          ) : null}

          {!tournamentStarted && step === 2 ? (
            <section className="space-y-5">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.18em] text-wc-fg3">הטאץ׳ האחרון</p>
                <h2 className="mt-2 text-3xl font-black text-wc-fg1">מי יהיה מלך השערים?</h2>
                <p className="mt-2 text-sm text-wc-fg2">
                  אם יש לנו רשימת שחקנים, הנבחרת שבחרת כזוכה תקבל עדיפות כדי שיהיה לך יותר קל
                  למצוא את השם הנכון.
                </p>
              </div>

              {hasPlayers ? (
                <PlayerPicker
                  players={players}
                  winnerId={winnerId}
                  value={selectedPlayer}
                  fallbackLabel={topScorerName || undefined}
                  onChange={selectPlayer}
                />
              ) : (
                <input
                  type="text"
                  value={topScorerName}
                  onChange={(event) => {
                    setSelectedPlayer(null);
                    setTopScorerName(event.target.value);
                    setClientError(null);
                  }}
                  className="w-full rounded-[1.2rem] border border-white/10 bg-[rgba(255,255,255,0.05)] px-4 py-3 text-sm text-wc-fg1 outline-none placeholder:text-wc-fg3 focus:border-wc-neon/40"
                  placeholder="כתוב שם של שחקן"
                />
              )}
            </section>
          ) : null}

          {clientError || state?.error ? (
            <p
              role="alert"
              className="mt-6 rounded-2xl bg-[color:var(--wc-danger-bg)] px-4 py-3 text-sm font-semibold text-wc-danger"
            >
              {clientError ?? state?.error}
            </p>
          ) : null}

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <button
              type="button"
              onClick={() => {
                setClientError(null);
                setStep((currentStep) => Math.max(0, currentStep - 1));
              }}
              className={`wc-button-secondary px-5 py-3 text-sm ${step === 0 ? "invisible" : ""}`}
            >
              חזרה
            </button>

            {tournamentStarted ? (
              <button
                key="submit-profile"
                type="submit"
                disabled={isPending || isCheckingNickname}
                onClick={(event) => {
                  const normalizedNickname = normalizeNicknameInput(nickname);
                  if (!normalizedNickname) {
                    setClientError(getNicknameFormatError());
                    event.preventDefault();
                    return;
                  }

                  if (isCheckingNickname) {
                    setClientError("רק רגע, אנחנו עדיין בודקים את הכינוי.");
                    event.preventDefault();
                  }
                }}
                className="wc-button-primary px-6 py-3 text-sm font-bold disabled:opacity-50"
              >
                {isPending ? "שומרים..." : "נכנסים למשחק"}
              </button>
            ) : step === 0 ? (
              <button
                key="continue-profile"
                type="button"
                disabled={isCheckingNickname}
                onClick={(event) => {
                  void goToWinnerStep(event);
                }}
                className="wc-button-primary px-6 py-3 text-sm font-bold disabled:opacity-50"
              >
                {isCheckingNickname ? "בודקים..." : "ממשיכים לזוכה"}
              </button>
            ) : step === 1 ? (
              <button
                key="continue-winner"
                type="button"
                onClick={goToTopScorerStep}
                className="wc-button-primary px-6 py-3 text-sm font-bold"
              >
                ממשיכים למלך השערים
              </button>
            ) : (
              <button
                key="submit-onboarding"
                type="submit"
                disabled={isPending || isCheckingNickname}
                onClick={(event) => {
                  const normalizedNickname = normalizeNicknameInput(nickname);
                  if (!normalizedNickname) {
                    setClientError(getNicknameFormatError());
                    event.preventDefault();
                    return;
                  }

                  if (nicknameStatus === "taken") {
                    setClientError(getNicknameTakenError());
                    setStep(0);
                    event.preventDefault();
                    return;
                  }

                  if (!winnerId) {
                    setClientError("צריך לבחור נבחרת זוכה.");
                    setStep(1);
                    event.preventDefault();
                    return;
                  }

                  if (!topScorerName.trim()) {
                    setClientError("צריך לבחור מלך שערים.");
                    event.preventDefault();
                    return;
                  }

                  if (isCheckingNickname) {
                    setClientError("רק רגע, אנחנו עדיין בודקים את הכינוי.");
                    event.preventDefault();
                  }
                }}
                className="wc-button-primary px-6 py-3 text-sm font-bold disabled:opacity-50"
              >
                {isPending ? "שומרים..." : "סיימתי, תנו לשחק"}
              </button>
            )}
          </div>
        </div>
      </form>
    </main>
  );
}
