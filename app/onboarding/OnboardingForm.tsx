"use client";
import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { completeOnboarding, type OnboardingActionState } from "@/app/actions/onboarding";
import UserAvatar from "@/components/UserAvatar";
import PlayerPicker from "@/components/pickers/PlayerPicker";
import TeamPicker from "@/components/pickers/TeamPicker";
import { getAvatarOptions, normalizeAvatarUrl } from "@/lib/profile/avatar-options";

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

  const avatarOptions = useMemo(
    () => getAvatarOptions(initialAvatarUrl),
    [initialAvatarUrl],
  );
  const sortedTeams = useMemo(
    () =>
      [...teams].sort((left, right) =>
        (left.name_he ?? left.name).localeCompare(right.name_he ?? right.name, "he"),
      ),
    [teams],
  );

  const initialSelectedPlayer =
    players.find((player) => player.name === tournamentPrediction?.predictedTopScorerName) ?? null;

  const [step, setStep] = useState(() => {
    if (!existingDisplayName) {
      return 0;
    }

    if (tournamentStarted || tournamentPrediction?.predictedWinnerTeamId) {
      return tournamentStarted ? 0 : 2;
    }

    return 1;
  });
  const [nickname, setNickname] = useState(existingDisplayName);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [winnerId, setWinnerId] = useState(tournamentPrediction?.predictedWinnerTeamId ?? "");
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(initialSelectedPlayer);
  const [topScorerName, setTopScorerName] = useState(
    tournamentPrediction?.predictedTopScorerName ?? "",
  );
  const [clientError, setClientError] = useState<string | null>(null);

  const hasPlayers = players.length > 0;
  const steps = tournamentStarted
    ? ["Profile"]
    : ["Profile", "Winner", "Top Scorer"];
  const selectedAvatarLabel = avatarOptions.find((option) => option.src === avatarUrl)?.label ?? null;

  useEffect(() => {
    if (!state?.success) {
      return;
    }

    router.push(nextPath);
    router.refresh();
  }, [nextPath, router, state?.success]);

  function validateIdentityStep() {
    const normalizedNickname = normalizeNickname(nickname);
    if (!normalizedNickname) {
      setClientError("יש לבחור כינוי באורך 2-20 תווים.");
      return false;
    }

    setNickname(normalizedNickname);
    setClientError(null);
    return true;
  }

  function goToWinnerStep() {
    if (!validateIdentityStep()) {
      return;
    }

    setStep(1);
  }

  function goToTopScorerStep() {
    if (!winnerId) {
      setClientError("צריך לבחור נבחרת זוכה.");
      return;
    }

    setClientError(null);
    setStep(2);
  }

  function selectPlayer(player: Player | null) {
    setSelectedPlayer(player);
    setTopScorerName(player?.name ?? "");
  }

  return (
    <main className="wc-page flex min-h-screen items-center justify-center px-4 py-10">
      <form action={formAction} className="w-full max-w-3xl">
        <input type="hidden" name="nickname" value={nickname} />
        <input type="hidden" name="avatar_url" value={avatarUrl ?? ""} />
        <input type="hidden" name="winner_team_id" value={winnerId} />
        <input type="hidden" name="top_scorer" value={topScorerName} />
        <input type="hidden" name="top_scorer_player_id" value={selectedPlayer?.id ?? ""} />

        <div className="mb-8 text-center">
          <div className="wc-badge mx-auto w-fit text-sm text-wc-fg2">
            <span className="text-wc-neon">Profile Setup</span>
          </div>
          <h1 className="wc-display mt-5 text-5xl text-wc-fg1">Finish Your Setup</h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-wc-fg2">
            Choose a unique nickname, add an optional avatar, and set your tournament picks before
            you start playing.
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
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
                <div className="flex flex-col items-center gap-3 text-center lg:w-56">
                  <UserAvatar
                    name={nickname || "Player"}
                    src={avatarUrl}
                    size={112}
                    roundedClassName="rounded-[2rem]"
                    priority
                  />
                  <div className="text-xs text-wc-fg3">
                    {selectedAvatarLabel ? `Avatar: ${selectedAvatarLabel}` : "No avatar selected"}
                  </div>
                </div>

                <div className="flex-1 space-y-5">
                  <div>
                    <label
                      htmlFor="nickname"
                      className="text-[11px] font-semibold uppercase tracking-[0.18em] text-wc-fg3"
                    >
                      Unique Nickname
                    </label>
                    <input
                      id="nickname"
                      type="text"
                      value={nickname}
                      onChange={(event) => setNickname(event.target.value)}
                      maxLength={20}
                      autoFocus
                      className="mt-2 w-full rounded-[1.2rem] border border-white/10 bg-[rgba(255,255,255,0.05)] px-4 py-3 text-sm text-wc-fg1 outline-none placeholder:text-wc-fg3 focus:border-wc-neon/40"
                      placeholder="For example: GoalKing"
                    />
                    <p className="mt-2 text-xs text-wc-fg3">
                      This nickname appears in leagues and standings, so it must be unique.
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-wc-fg3">
                        Optional Avatar
                      </p>
                      <button
                        type="button"
                        onClick={() => setAvatarUrl(null)}
                        className="text-xs font-semibold text-wc-fg3 transition hover:text-wc-fg1"
                      >
                        Remove Avatar
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
                        <div className="mt-2 text-[11px] font-semibold text-wc-fg2">No image</div>
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
                  Tournament picks are already locked, so this setup will save only your profile.
                </div>
              ) : null}
            </section>
          ) : null}

          {!tournamentStarted && step === 1 ? (
            <section className="space-y-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-wc-fg3">
                  Tournament Winner
                </p>
                <h2 className="mt-2 text-3xl font-black text-wc-fg1">Who wins the World Cup?</h2>
                <p className="mt-2 text-sm text-wc-fg2">
                  This pick is locked at tournament kickoff.
                </p>
              </div>

              <TeamPicker teams={sortedTeams} value={winnerId} onChange={setWinnerId} />
            </section>
          ) : null}

          {!tournamentStarted && step === 2 ? (
            <section className="space-y-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-wc-fg3">
                  Top Scorer
                </p>
                <h2 className="mt-2 text-3xl font-black text-wc-fg1">Who finishes as top scorer?</h2>
                <p className="mt-2 text-sm text-wc-fg2">
                  If players are available, the winner nation is prioritised in the picker.
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
                  }}
                  className="w-full rounded-[1.2rem] border border-white/10 bg-[rgba(255,255,255,0.05)] px-4 py-3 text-sm text-wc-fg1 outline-none placeholder:text-wc-fg3 focus:border-wc-neon/40"
                  placeholder="Type a player name"
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
              Back
            </button>

            {tournamentStarted ? (
              <button
                type="submit"
                disabled={isPending}
                onClick={(event) => {
                  if (!validateIdentityStep()) {
                    event.preventDefault();
                  }
                }}
                className="wc-button-primary px-6 py-3 text-sm font-bold disabled:opacity-50"
              >
                {isPending ? "Saving..." : "Finish Setup"}
              </button>
            ) : step === 0 ? (
              <button
                type="button"
                onClick={goToWinnerStep}
                className="wc-button-primary px-6 py-3 text-sm font-bold"
              >
                Continue
              </button>
            ) : step === 1 ? (
              <button
                type="button"
                onClick={goToTopScorerStep}
                className="wc-button-primary px-6 py-3 text-sm font-bold"
              >
                Continue
              </button>
            ) : (
              <button
                type="submit"
                disabled={isPending}
                onClick={(event) => {
                  if (!validateIdentityStep()) {
                    event.preventDefault();
                    return;
                  }

                  if (!winnerId) {
                    setClientError("צריך לבחור נבחרת זוכה.");
                    event.preventDefault();
                    return;
                  }

                  if (!topScorerName.trim()) {
                    setClientError("צריך לבחור מלך שערים.");
                    event.preventDefault();
                  }
                }}
                className="wc-button-primary px-6 py-3 text-sm font-bold disabled:opacity-50"
              >
                {isPending ? "Saving..." : "Start Playing"}
              </button>
            )}
          </div>
        </div>
      </form>
    </main>
  );
}

function normalizeNickname(value: string) {
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length >= 2 && normalized.length <= 20 ? normalized : null;
}
