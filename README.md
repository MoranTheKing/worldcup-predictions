# World Cup 2026 Predictions

Hebrew-first, RTL, mobile-first Next.js PWA for World Cup 2026 predictions, private leagues, tournament brackets, and social competition.

## Current state

As of 2026-04-23, the project has three major slices in active use:

- tournament engine and knockout progression
- social predictions hub under `/game`
- private leagues, opponent view, and invite-code flows

## Security status

A full security audit was completed on 2026-04-23.

Fixed or hardened areas:

- open redirects in login, signup, and auth callback flows
- pre-kickoff exposure of hidden outright predictions
- brute-forceable direct invite-code join page
- remotely reachable dev-only mutation routes in non-production environments
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

The two `20260423000018/19` migrations are the important security remediations from the latest audit.

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
- `app/login/page.tsx`
- `app/signup/page.tsx`
- `app/api/dev/_guard.ts`
- `proxy.ts`
- `lib/game/tournament-start.ts`

## Project notes

- Social opponent viewing is intentionally anti-cheat: scheduled matches stay hidden and outright picks stay hidden until tournament kickoff.
- Tournament and match prediction locks are enforced in both application logic and the database.
- Dev tools are intended for localhost development only.

## Next phase

- finish the scoring engine for `points_earned`
- sync `profiles.total_score` from resolved predictions
- expand league history and analytics
- run broader QA across mobile, RTL, live states, and joker flows
