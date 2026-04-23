# World Cup 2026 Predictions

Hebrew-first, RTL, mobile-first Next.js PWA for World Cup 2026 predictions, private leagues, tournament brackets, and social competition.

## Current state

As of 2026-04-23, the project has three major slices in active use:

- tournament engine and knockout progression
- social predictions hub under `/game`
- private leagues, opponent view, and invite-code flows

New player onboarding now runs before entry into the protected game flow:

- all newly authenticated users are routed through `/onboarding`
- onboarding requires a unique public nickname before league play
- if the tournament is still open, onboarding also collects winner and top-scorer picks
- avatar setup is optional and supports built-in defaults plus the current Google profile photo when available
- onboarding now always opens on the profile step first, even when an auth provider pre-fills data, so the player can review and edit before continuing

## Security status

A full security audit was completed on 2026-04-23.

Fixed or hardened areas:

- open redirects in login, signup, and auth callback flows
- pre-kickoff exposure of hidden outright predictions
- brute-forceable direct invite-code join page
- remotely reachable dev-only mutation routes in non-production environments
- localhost-only dev guards no longer trust spoofable `X-Forwarded-Host` headers
- committed local log files that exposed workstation paths and internal network details
- missing DB-level privacy and kickoff locks for prediction data
- server-side match prediction lock drift when kickoff time had passed but match status was still `scheduled`

Full details live in:

- `SECURITY_AUDIT_2026-04-23.md`

## Required Supabase migrations

These migrations must be applied on the active Supabase project:

- `20260422000010_phase1_social_auth.sql`
- `20260422000012_fix_rls_recursion.sql`
- `20260422000013_repair_phase2_social_schema.sql`
- `20260422000014_harden_game_social_security.sql`
- `20260422000015_force_flat_prediction_rls.sql`
- `20260422000016_enable_social_prediction_selects.sql`
- `20260423000018_restore_social_prediction_privacy.sql`
- `20260423000019_enforce_prediction_lock_windows.sql`
- `20260423000020_enforce_unique_profile_handles.sql`

The two `20260423000018/19` migrations are the important security remediations from the latest audit.
The `20260423000020` migration adds DB-level protection so no two users can claim the same nickname with case-only variations.

## Local development

Install dependencies:

```powershell
npm.cmd install
```

Run the app locally:

```powershell
npm.cmd run dev
```

Default local URL:

- `http://localhost:3000`

## Key implementation files

- `app/game/leagues/[id]/page.tsx`
- `app/game/users/[id]/page.tsx`
- `app/actions/league.ts`
- `app/actions/predictions.ts`
- `app/auth/callback/route.ts`
- `app/onboarding/page.tsx`
- `app/onboarding/OnboardingForm.tsx`
- `app/actions/onboarding.ts`
- `app/login/page.tsx`
- `app/signup/page.tsx`
- `app/api/dev/_guard.ts`
- `proxy.ts`
- `lib/game/tournament-start.ts`
- `lib/supabase/onboarding.ts`
- `lib/profile/avatar-options.ts`

## Project notes

- Social opponent viewing is intentionally anti-cheat: scheduled matches stay hidden and outright picks stay hidden until tournament kickoff.
- Tournament and match prediction locks are enforced in both application logic and the database.
- Dev tools are intended for localhost development only.
- Profile avatars fall back to initials if the selected image is missing or unsupported.
- The predictions hub now uses a tighter outright-picks layout with less explanatory copy and a more compact save flow.
- The outright-picks block shows a single clean editable layout instead of repeating the same chosen values twice.

## Next phase

- finish the scoring engine for `points_earned`
- sync `profiles.total_score` from resolved predictions
- expand league history and analytics
- run broader QA across mobile, RTL, live states, and joker flows
