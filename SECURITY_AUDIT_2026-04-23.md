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
- `/mfa/setup` now removes stale unverified TOTP factors before creating a new QR, so refreshes during setup do not leave users blocked by an unfinished enrollment
- onboarding checks for an unfinished TOTP enrollment and redirects back to `/mfa/setup` before profile completion, preserving the user's explicit MFA choice
- the global MFA assurance check is now visually silent while it is still checking; the challenge screen is shown only after Supabase reports that `aal2` is required
- the root layout performs an initial MFA assurance check server-side, preventing protected page content from flashing before the TOTP challenge appears
- dev live refresh polling now checks `/api/dev/matches/version` and calls `router.refresh()` only when match data changed, reducing unnecessary dev re-renders

## Post-audit hardening landed later on 2026-04-23

Not tied to a specific open PR, but implemented as a direct follow-up:

- personal avatar uploads no longer need a public bucket or public URL
- uploaded avatars are limited to JPG, PNG, and WebP
- the server validates both the declared MIME type and the file signature before storing the image
- uploaded avatars are stored in a private Supabase bucket and served back only through an authenticated internal route
- SVG uploads are intentionally rejected to avoid scriptable image payloads
- nickname uniqueness checks were reused for post-login profile editing as well, so editing later cannot bypass the onboarding guarantees
