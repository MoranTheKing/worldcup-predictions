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
- `app/api/dev/_guard.ts` now blocks non-localhost requests
- all dev route handlers now pass the request into that guard
- the dev tools page and floating button are also hidden unless the request originates from localhost

PR covered:

- `#5` identified one endpoint
- this audit expanded the same protection to the full dev tooling surface

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

## Files changed in the final remediation

- `app/auth/callback/route.ts`
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
- `lib/security/local-request.ts`
- `lib/security/safe-redirect.ts`
- `.gitignore`
- `supabase/migrations/20260423000018_restore_social_prediction_privacy.sql`
- `supabase/migrations/20260423000019_enforce_prediction_lock_windows.sql`

## Operational note

Code changes alone are not enough for the database fixes.

The active Supabase project must run:

- `20260423000018_restore_social_prediction_privacy.sql`
- `20260423000019_enforce_prediction_lock_windows.sql`
