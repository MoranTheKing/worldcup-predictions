# Security Audit - 2026-04-23

## Scope

This audit covered:

- the current `master` branch
- open security-related pull requests in `MoranTheKing/worldcup-predictions`
- social prediction privacy, auth redirects, dev tooling, and DB write locks

Reviewed pull requests:

- `#2` Restore league-scoped RLS for predictions and league_members
- `#3` Restore scoped RLS SELECT policies for league and prediction tables
- `#4` Prevent pre-kickoff outright prediction data exposure
- `#5` Harden dev predictions reset endpoint access
- `#6` Restrict RLS SELECT policies on prediction and membership tables
- `#7` Enforce rate-limit on direct invite-code join page
- `#8` Lock outright_bets writes after tournament kickoff
- `#9` Enforce DB-level lock for tournament/outright prediction writes
- `#10` Enforce kickoff locks in prediction RLS policies
- `#11` Validate login `next` parameter to prevent open redirect
- `#12` Remove committed dev logs that leak local environment details
- `#13` Sanitize `next` in auth callback to prevent open redirects
- `#14` Prevent localhost-only dev guard bypass via spoofed forwarded host headers
- `#15` Restrict avatar URL validation so arbitrary same-origin paths cannot be stored as avatars
- `#17` Reject external origins that mimic private avatar URLs
- `#18` Restore RLS protection on tournament page
- `#19` Fix signup account-enumeration response

## Findings and remediations

### 1. Open redirect in login, signup, and auth callback

Affected files before the fix:

- `app/login/page.tsx`
- `app/signup/page.tsx`
- `app/auth/callback/route.ts`

What was vulnerable:

- the app accepted a raw `next` query parameter and reused it in client-side navigation and OAuth callback redirects
- values like `//evil.example` or crafted callback payloads could redirect users off-site after login

How it could be exploited:

- an attacker could send a phishing link to `/login?next=//evil.example`
- after a successful auth flow, the victim would be bounced to the attacker-controlled site while believing the redirect came from the app

What changed:

- added `lib/security/safe-redirect.ts`
- login, signup, and auth callback now allow only safe relative paths
- callback redirects are now built with `new URL(...)` instead of string concatenation
- the callback failure path also preserves the sanitized `next` value so the UX stays intact

PRs covered:

- `#11`
- `#13`
- plus an additional signup-path fix discovered during this audit

### 1.1 Auth default destination follow-up - 2026-04-28

Affected files:

- `lib/security/safe-redirect.ts`
- `proxy.ts`
- `app/login/page.tsx`
- `app/signup/page.tsx`

What was wrong:

- the safe redirect fallback still pointed at `/dashboard`
- authenticated users who opened `/login` or `/signup` after finishing onboarding were redirected to `/dashboard`
- the product's actual game entry is `/game`, which redirects to `/game/predictions`

What changed:

- the global safe redirect fallback is now `/game`
- auth-page redirects for users who already completed onboarding now use `/game`
- login/signup cross-links treat `/game` as the clean default, so first-time and returning flows stay on the game path unless a specific safe `next` path is provided

### 2. Pre-kickoff leakage of hidden outright picks

Affected files before the fix:

- `app/game/leagues/[id]/page.tsx`
- `app/game/users/[id]/page.tsx`

What was vulnerable:

- server-side code fetched other users' outright picks before tournament kickoff
- the UI visually hid those picks, but the values were still serialized into client props

How it could be exploited:

- a user could inspect the client payload or React props in DevTools and see "hidden" winner/top-scorer selections before kickoff

What changed:

- league view only loads all outright picks after kickoff
- before kickoff, it only loads the current viewer's own outright picks
- opponent page now sends `null` for hidden winner/top-scorer values before kickoff instead of sending real values and hiding them cosmetically

PR covered:

- `#4`

### 3. Direct invite-code join page could be brute-forced

Affected file before the fix:

- `app/game/join/[code]/page.tsx`

What was vulnerable:

- the direct join page queried leagues by invite code with the admin client
- unlike the join server action, it did not apply the join-attempt rate limit or record failed guesses

How it could be exploited:

- an authenticated attacker could script requests to `/game/join/ABCD`, `/game/join/ABCE`, and so on
- valid codes revealed league existence and metadata, making invite-code enumeration practical

What changed:

- the direct join page now uses the same rate-limit model as the join action
- failed guesses are recorded
- blocked users get a `404`, which avoids confirming whether a code is valid
- the rate-limit logic was moved into `lib/game/league-join-rate-limit.ts` so the page and action cannot silently drift apart later

PR covered:

- `#7`

### 4. Dev-only mutation routes were reachable remotely in non-production

Affected surface before the fix:

- `app/api/dev/*`
- `app/dev-tools/page.tsx`
- `components/DevToolsFloatingButton.tsx`

What was vulnerable:

- the previous guard only checked `NODE_ENV !== "production"`
- any non-production deployment exposed destructive service-role routes to remote callers

How it could be exploited:

- a reachable staging or dev deployment could be used to reset predictions, clear matches, randomize tournament data, or patch individual matches remotely

What changed:

- added `lib/security/local-request.ts`
- `app/api/dev/_guard.ts` now blocks non-localhost requests by trusting only `Host`, `Origin`, and the request URL instead of attacker-controlled forwarded host headers
- all dev route handlers now pass the request into that guard
- `proxy.ts` returns `404` for `/dev-tools` and `/api/dev/*` when they are requested via a non-local host, preventing login redirects from masking the real access control
- the dev tools page and floating button are also hidden unless the request originates from localhost
- `X-Forwarded-Host` is no longer used when deciding whether a request is local, which closes a spoofing path where a remote caller could forge `localhost`

PR covered:

- `#5` identified one endpoint
- this audit expanded the same protection to the full dev tooling surface
- `#14` later narrowed the hostname resolution logic so localhost gating no longer trusts spoofable forwarded-host input

### 4.1 Dev clear endpoint hardening follow-up - 2026-04-28

Reviewed PR:

- `#32` Harden dev match clear endpoint authorization

Importance:

- high, because `POST /api/dev/matches/clear` deletes predictions, tournament picks, legacy bets, score totals, match state and odds
- localhost-only checks reduce remote exposure, but they do not fully protect against same-machine CSRF or another local web app triggering the destructive POST

What changed locally:

- added `isSameOriginRequest()` in `lib/security/local-request.ts`
- unlike the PR's first version, the check compares full origin, including scheme and port, so `http://localhost:4000` cannot masquerade as `http://localhost:3000`
- `app/api/dev/matches/clear/route.ts` now requires a logged-in Supabase user whose email matches `DEV_TOOLS_ADMIN_EMAIL` or the fallback `admin@moran65.com`
- destructive writes still use the service-role admin client, but only after the same-origin and admin-session checks pass

Residual note:

- local admin users should set `DEV_TOOLS_ADMIN_EMAIL` when using a different admin mailbox

### 4.2 Dev bulk match update scoring integrity - 2026-04-28

Reviewed PR:

- `#28` Prevent duplicate bulk match entries from clearing finished match scores

Importance:

- high for local/dev data integrity, because a duplicated `match_number` in one bulk request could put the same match into scoring and clearing paths

What changed locally:

- bulk updates are validated once, stored as pending updates, and applied in request order
- duplicate entries now update an in-memory final match state before validating the next entry
- scoring and clearing sets are derived from the final state that will actually be written, not from stale pre-request rows

This addresses the review concern on the PR that a later duplicate entry without `status` could otherwise fall back to the original row status.

### 4.3 Minor dev/API safety fixes - 2026-04-28

Reviewed PRs:

- `#21` Avoid empty-string exact matches when finding Bzzoiro players
- `#22` Prevent double-decode crash in player profile route
- `#31` Expand matches.minute DB constraint to 0..135

What changed locally:

- Bzzoiro exact-name matching no longer treats a missing alias as an empty-string expected name
- `/dashboard/players/[id]` no longer double-decodes already-decoded Next.js dynamic route params
- added migration `20260428000035_expand_matches_minute_range_to_135.sql` so the DB constraint matches app validation for extra-time stoppage up to minute 135

### 4.4 Outright scorer odds tampering follow-up - 2026-04-28

Reviewed PRs:

- `#23` Validate top-scorer name/ID to prevent odds/name mismatch
- `#29` Bind top-scorer odds lookup to submitted player name to prevent tampering

Importance:

- high for scoring integrity, because a crafted form could try to pair a visible scorer name with another player's higher odds

What changed locally:

- onboarding and tournament prediction saves resolve the submitted `top_scorer_player_id` to the canonical player name before persisting
- if both ID and name are submitted, the server compares normalized names and rejects real mismatches
- odds are read by player ID after the identity check, preserving valid picks even when display casing, accents or spacing differ
- if an odds column is unavailable in a partially migrated environment, the save degrades to `null` odds instead of blocking the whole submission

This combines the security intent of both PRs while avoiding the review regressions noted on each PR.

### 4.5 PRs intentionally not applied as-is - 2026-04-28

Reviewed PRs:

- `#24` Mitigate standings scenario enumeration DoS
- `#25` Reinstate bounded global leaderboard member query
- `#26` Restrict global leaderboard visibility to shared-league members
- `#27` Restrict global leaderboard visibility to shared-league members
- `#30` Fix IDOR: remove global query bypass on opponent view

Decision:

- `#24` was not applied as-is because it drops high-score scenarios for the final one or two pending group matches. That can mislabel qualification/elimination states when goal-difference swings matter.
- `#25`, `#26`, and `#27` were not applied as-is because the app currently has an intentional global leaderboard experience. Query-time caps or shared-league-only filters can hide the current user, produce incorrect projected-live ranks, or turn the global leaderboard into a private-league view.
- `#30` was not applied as-is because `/game/leaderboard` intentionally links global rows to `/game/users/[id]?league=global`. Removing that bypass would break the current global comparison flow.

Recommended future fix:

- redesign global leaderboard privacy as an explicit product decision: either keep global profiles public to signed-in users with a paginated/ranked API, or remove global opponent links and show only aggregate public fields. Avoid partial caps before projected-score ranking.

### 5. Social prediction tables had permissive SELECT RLS

Affected migrations and policies:

- `20260422000012_fix_rls_recursion.sql`
- `20260422000013_repair_phase2_social_schema.sql`
- `20260422000014_harden_game_social_security.sql`
- `20260422000015_force_flat_prediction_rls.sql`
- `20260422000016_enable_social_prediction_selects.sql`

What was vulnerable:

- later migrations recreated `league_members`, `predictions`, and `tournament_predictions` SELECT policies with `using (true)`
- that allowed authenticated users to read rows outside their own leagues

How it could be exploited:

- a logged-in user could query prediction rows for unrelated users and leagues directly through Supabase APIs
- this exposed private league membership and hidden prediction data

What changed:

- added `20260423000018_restore_social_prediction_privacy.sql`
- new `SECURITY DEFINER` helpers restore shared-league visibility without recursive RLS failures
- SELECT is now limited to the owner or users sharing a league

Why this approach was chosen:

- some PRs modified historical migration files in place
- that does not reliably fix already-deployed databases
- the final remediation uses a new migration so active environments can actually be repaired

PRs covered:

- `#2`
- `#3`
- `#6`

### 6. Prediction writes were not locked reliably at kickoff

Affected tables and paths:

- `predictions`
- `tournament_predictions`
- `outright_bets`
- `bets`
- `app/actions/predictions.ts`

What was vulnerable:

- DB policies allowed post-kickoff writes, or relied on older broad `FOR ALL` owner policies
- the match prediction server action used a service-role client and only checked `status !== "scheduled"`, so a stale `scheduled` status could allow late edits even after kickoff time passed

How it could be exploited:

- users could bypass UI locks and write directly through Supabase APIs
- if match status lagged behind real kickoff, the server action itself could still accept writes after kickoff because it bypassed RLS via the admin client

What changed:

- added `20260423000019_enforce_prediction_lock_windows.sql`
- new DB helper functions enforce:
  - match predictions only before the specific match kickoff
  - tournament and outright predictions only before tournament kickoff
- both social tables and legacy dashboard tables are covered
- server-side match prediction logic now checks kickoff time as well, not just status

PRs covered:

- `#8`
- `#9`
- `#10`

### 7. Committed logs leaked local environment details

Affected files before the fix:

- `.codex-dev.stdout.log`
- `.codex-dev.stderr.log`

What was vulnerable:

- tracked logs contained local Windows paths, developer machine details, and internal network addresses

How it could be exploited:

- attackers or casual observers could learn workstation naming, folder layout, or internal IP conventions
- that information is not usually enough for direct compromise, but it is unnecessary environment disclosure

What changed:

- removed the tracked log files from the repository
- added local log patterns to `.gitignore`

PR covered:

- `#12`

### 8. Avatar URLs could be abused for stored same-origin GET requests

Affected area before the fix:

- `lib/profile/avatar-options.ts`
- `lib/profile/avatar-policy.ts`
- avatar persistence in onboarding/profile flows

What was vulnerable:

- the app previously allowed broad same-origin local paths as avatar URLs
- values like `/auth/callback?code=...` could be stored and later rendered as `<img src="...">`
- after private uploads were added, the private-avatar URL parser accepted absolute URLs whose path and query looked like the internal route

How it could be exploited:

- an attacker could save a crafted same-origin path as their avatar
- when another authenticated user viewed that attacker in the UI, the victim's browser would request the path with the victim's cookies
- if the target path performed meaningful GET-side effects, this became a stored same-origin request gadget, including login-CSRF or other CSRF-style abuse
- for PR `#17`, a crafted value such as `https://evil.example/api/profile/avatar/<uuid>?v=1` could be treated as an approved private avatar while still rendering from an attacker-controlled origin if it ever reached profile storage

What changed:

- the old "any relative path" behavior was removed
- the app now accepts only:
  - exact built-in avatar assets under `/avatars/...`
  - Google-hosted avatar URLs matching the existing allowlist
  - authenticated private avatar routes created by the new personal-upload flow
- private avatar routes are also ownership-checked, so one user cannot submit another user's private avatar route as their own stored value
- private avatar URLs must now be relative app routes beginning with `/api/profile/avatar/`
- absolute URLs, protocol-relative URLs, spoofed external origins, synthetic `https://avatars.local/...` URLs, and URL fragments are rejected before path/query validation

Why the final fix is stronger than the PR:

- PR `#15` proposed narrowing local paths to `/avatars/<file>`
- the landed remediation goes further by removing arbitrary local-path support entirely and replacing personal uploads with a private authenticated route
- PR `#17` proposed an origin check after parsing
- the landed remediation also rejects absolute values up front, so only routes produced by `buildPrivateAvatarUrl` are accepted

PR covered:

- `#15`
- `#17`

### 9. Weak email/password signup policy allowed trivial passwords

Affected area before the fix:

- `app/signup/page.tsx`
- Supabase Auth password policy configuration

What was vulnerable:

- the signup UI only required 6 characters
- passwords such as `123456` could be submitted from the app
- if Supabase password security settings stayed permissive, weak passwords could become valid credentials

How it could be exploited:

- attackers could use credential stuffing and password-spraying against accounts with common passwords
- users reusing leaked passwords would be at higher risk if leaked-password protection was not enabled in Supabase

What changed:

- added `lib/security/password-policy.ts`
- signup now blocks submission until the password has at least 10 characters, lowercase and uppercase English letters, a number, a symbol, and no obvious sequence or email-derived value
- signup now also requires a matching password confirmation field before submitting to Supabase
- the UI now shows a live Hebrew password-strength panel so users know exactly what is missing before submitting
- login now shows a clearer message if Supabase returns a weak-password error after server-side policy hardening

Operational note:

- Supabase must also be configured under `Authentication -> Settings -> Password Security`
- recommended settings are minimum length `10`, required lowercase/uppercase/numbers/symbols, and leaked-password protection when the project is on Pro or above

### 10. Public tournament page used the service-role client

Affected area before the fix:

- `app/dashboard/tournament/page.tsx`
- RLS configuration for public tournament reads

What was vulnerable:

- `/dashboard/tournament` is intentionally public, but it loaded `matches` and `teams` with `createAdminClient()`
- the admin client uses the Supabase service-role key and bypasses Row-Level Security
- even though the selected columns were tournament-only, the route depended on privileged credentials for anonymous traffic

How it could be exploited:

- a future code change on the same public route could accidentally expand the admin query and expose private data because RLS would not protect it
- any bug in the route would have service-role read power instead of the limited anonymous/session context

What changed:

- added `20260424000021_public_tournament_projection.sql`
- created read-only public views:
  - `public.public_tournament_matches`
  - `public.public_tournament_teams`
- those views expose only non-user tournament data needed by the public page: schedule, team metadata, scores, live status, minute, extra-time and penalty fields
- `app/dashboard/tournament/page.tsx` now uses the regular server Supabase client from `@/lib/supabase/server`
- the page no longer imports or uses the service-role admin client

User-facing behavior:

- anonymous users can still see the public tournament page
- live match data remains visible when it is present in `matches`
- no user profiles, league membership, predictions, tournament picks or private avatar data are exposed by these views

PR covered:

- `#18`

### 11. Signup response leaked existing-account state

Affected area before the fix:

- `app/signup/page.tsx`

What was vulnerable:

- the signup flow handled Supabase's "existing verified email" shape with a distinct user-facing message
- a caller could compare responses for different email addresses and infer whether an account already existed

How it could be exploited:

- an attacker could submit a list of email addresses through the signup form
- addresses that produced the distinct "already registered / log in instead" path were likely existing accounts
- this is account enumeration: it does not compromise an account directly, but it helps phishing, targeting and credential-stuffing attacks

What changed:

- signup now moves non-error/non-session responses into a neutral verification screen
- the copy says a code was sent only if the address can continue registration
- the same screen offers a clear "log in to an existing account" action so legitimate users are not trapped in OTP verification when no signup OTP was issued
- invalid-code and resend messages were made neutral as well

Why this is safer than the PR-only patch:

- PR `#19` removed the revealing branch but forced existing users into an OTP-only dead end
- the landed version keeps the response neutral while preserving a usable login path for real users

PR covered:

- `#19`

## Files changed in the final remediation

- `app/auth/callback/route.ts`
- `app/dashboard/tournament/page.tsx`
- `app/login/page.tsx`
- `app/signup/page.tsx`
- `app/actions/league.ts`
- `app/actions/predictions.ts`
- `app/game/join/[code]/page.tsx`
- `app/game/leagues/[id]/page.tsx`
- `app/game/users/[id]/page.tsx`
- `app/api/dev/_guard.ts`
- `app/api/dev/matches/*`
- `app/api/dev/predictions/reset/route.ts`
- `app/dev-tools/page.tsx`
- `components/DevToolsFloatingButton.tsx`
- `lib/game/league-join-rate-limit.ts`
- `lib/game/tournament-start.ts`
- `lib/security/password-policy.ts`
- `lib/security/local-request.ts`
- `lib/security/safe-redirect.ts`
- `.gitignore`
- `supabase/migrations/20260423000018_restore_social_prediction_privacy.sql`
- `supabase/migrations/20260423000019_enforce_prediction_lock_windows.sql`
- `supabase/migrations/20260424000021_public_tournament_projection.sql`

## Operational note

Code changes alone are not enough for the database fixes.

The active Supabase project must run:

- `20260423000018_restore_social_prediction_privacy.sql`
- `20260423000019_enforce_prediction_lock_windows.sql`
- `20260424000021_public_tournament_projection.sql`

## 2026-04-24 follow-up

The initial 2026-04-24 browser QA pass did not require a new migration. The later PR `#18` remediation added `20260424000021_public_tournament_projection.sql` so the public tournament page can avoid service-role reads.

Security-relevant follow-up:

- signup now treats the Supabase "no new identity" response shape with a neutral check-email/OTP screen and a visible login action, instead of a distinct existing-account error
- the copy is generic enough to guide the user without confirming whether the submitted address is already registered
- `/dashboard/tournament` originally used a server-side admin read for public projection data; after PR `#18`, it uses explicit public projection views instead
- social prediction privacy remains governed by the RLS/audit fixes above; the public tournament read does not expose user prediction rows

Additional 2026-04-24 remediation after PRs `#18` and `#19`:

- the public tournament route no longer uses the service-role client
- public tournament reads now go through explicit public projection views for teams and matches
- signup no longer reveals existing-account state while still giving real users an obvious login path
- optional Supabase TOTP MFA was added for users who choose Authenticator during signup
- TOTP is enforced only after a verified factor exists, so Google and regular email users are not surprised by an unavailable extra step

## 2026-04-25 auth follow-up

Security-relevant follow-up:

- the signup Authenticator choice now appears before both Google and email/password, so the extra TOTP setup can apply to either signup path
- signup redirects now preserve the intended flow as `/mfa/setup?next=/onboarding?...`, preventing MFA setup from skipping the required profile onboarding step
- Google OAuth started from `/login` is marked as a login flow; if the account has not yet started app registration, the session is signed out and the user is redirected to `/signup` with a clear registration message
- existing Google users who already completed app registration continue through login normally, while first-time Google users do not silently land inside the app
- 2026-04-29 follow-up: added `20260429000036_stop_oauth_name_prefill_on_signup.sql` so the Auth signup trigger no longer copies Google `full_name` into the unique public `profiles.display_name` field. This prevents first-time Google signup from failing with `Database error saving new user` when the returned Google name collides with an existing nickname; onboarding remains the place where a unique public nickname is chosen.
- 2026-04-29 follow-up: auth redirect normalization now collapses stale `/onboarding?next=/onboarding?...` chains and maps legacy `/dashboard` defaults back to `/game`, so failed/retried signup flows do not keep wrapping old destinations.
- `/mfa/setup` now removes stale unverified TOTP factors before creating a new QR, so refreshes during setup do not leave users blocked by an unfinished enrollment
- onboarding checks for an unfinished TOTP enrollment and redirects back to `/mfa/setup` before profile completion, preserving the user's explicit MFA choice
- the global MFA assurance check is now visually silent while it is still checking; the challenge screen is shown only after Supabase reports that `aal2` is required
- the root layout performs an initial MFA assurance check server-side, preventing protected page content from flashing before the TOTP challenge appears
- dev live refresh polling now checks `/api/dev/matches/version` and calls `router.refresh()` only when match data changed, reducing unnecessary dev re-renders
- email OTP resend/signup cooldown now shows a user-friendly 60-second countdown instead of exposing Supabase/SMTP rate-limit details
- TOTP setup verification now uses Supabase `challengeAndVerify` as one atomic operation, preventing email/password signup users from failing between challenge creation and QR-code verification
- first-time Google OAuth attempts started from `/login` now delete the unused Google-only Auth user before redirecting to `/signup`, preventing a ghost Supabase user from blocking email/password signup with the same email
- the client AuthProvider now validates the current Supabase user on focus, visibility return and a short interval; if an admin deleted the user while the browser still holds a stale session, the local session/profile are cleared and the UI stops showing authenticated controls
- TOTP enrollment preparation is now deduplicated per browser tab, preventing duplicate React dev effects from creating and deleting competing unverified factors; `Factor not found` during setup triggers a fresh QR instead of a dead-end error
- existing real Google accounts are no longer treated like a dead-end signup collision: when a user tries to add email/password with the same address, signup now sends a real `signInWithOtp` code with `shouldCreateUser: false`, verifies ownership, and only then links the chosen password through `updateUser`
- `/mfa/setup` now requires the explicit signup marker `user_metadata.mfa_setup_requested`; an unverified TOTP factor alone is not enough to open enrollment, and the marker is cleared after successful QR verification

## 2026-04-25 match-state and signup hardening follow-up

Security and correctness follow-up:

- the same-email Google-account password-link flow no longer keeps the chosen password in React state while waiting for the email OTP; the user re-enters the password and confirmation, and the password policy is validated before OTP verification starts, reducing both sensitive client state and partial-auth edge cases
- live match display no longer infers halftime from minute 45; `matches.match_phase` now represents `first_half`, `halftime`, `second_half`, `extra_time` and `penalties`, so stoppage-time states such as `45+2` and `90+3` can be represented without ambiguous minute-only logic
- Dev Tools `LIVE`, `FINISH` and `RESET` status buttons now persist immediately through the guarded dev APIs and run the existing tournament sync pipeline, reducing the chance that an operator thinks a state was applied while it only exists locally in the browser
- `20260425000022_add_match_phase.sql` adds the DB constraint for allowed `match_phase` values and extends the public tournament projection without exposing user prediction rows
- the same migration now also constrains `match_phase` to live matches, clears minute for halftime/penalties, and prevents extra-time/penalty phases before knockout matches
- Dev Tools phase controls no longer include a fake "regular" phase; first-half, second-half and extra-time minute ranges are enforced in UI and API, ET appears only for knockout matches, and penalties require a knockout draw
- `/mfa/setup` is server-gated so only a signup flow that explicitly requested Authenticator can open enrollment; verified users, completed users, or stale sessions with only a leftover unverified factor are redirected onward

## PR #20 - server-side MFA enforcement for `/game`

Finding:

- MFA-protected accounts were primarily guarded by the client AuthProvider and the root server layout. That prevented visible UI flashes, but did not provide a dedicated server authorization boundary before `/game` layouts/pages or game server actions used admin reads/writes.

Attack path:

- An attacker with valid first-factor credentials for a TOTP-protected account could obtain an `aal1` Supabase session and then issue fast/direct requests to `/game` routes or server actions before completing the Authenticator code.
- Because the sensitive game code used a valid session plus server/admin data access, the attacker could potentially read game profile/league/prediction data or submit game actions inside the MFA race window.
- The PR branch attempted to redirect unauthenticated MFA state to `/?next=/game`, but `/` is an MFA-neutral path in this app. That would avoid the challenge screen instead of reliably presenting it.

Fix:

- added `lib/auth/mfa-server.ts` as a shared server-side MFA assurance helper
- `/game` layout and game pages now call `requireServerMfa()` before admin reads
- league and prediction server actions now call the same guard before DB writes
- failed assurance checks now fail closed to an MFA challenge instead of allowing protected children to render
- added `/mfa/challenge` as a non-neutral challenge route that redirects onward only after Supabase reports `aal2`

Migration required:

- `20260425000022_add_match_phase.sql`

## Post-audit hardening landed later on 2026-04-23

Not tied to a specific open PR, but implemented as a direct follow-up:

- personal avatar uploads no longer need a public bucket or public URL
- uploaded avatars are limited to JPG, PNG, and WebP
- the server validates both the declared MIME type and the file signature before storing the image
- uploaded avatars are stored in a private Supabase bucket and served back only through an authenticated internal route
- SVG uploads are intentionally rejected to avoid scriptable image payloads
- nickname uniqueness checks were reused for post-login profile editing as well, so editing later cannot bypass the onboarding guarantees

## Product/privacy follow-up from 2026-04-26

- League leaderboards now expose member predictions only for matches that are already `live`, where prediction edits are locked by kickoff rules.
- Scheduled-match predictions remain hidden from other users; the live leaderboard caps display to two concurrent live matches and queries only those match IDs.
- Joker and score-hit colors in live views are presentation-only and do not expose odds, hidden scheduled picks, or unlocked private data.
