# Future Security Scan Prompt

Use this as the "Additional context" for the next automated PR/security scan:

```text
This is a Next.js 16 / Supabase World Cup predictions app.

Important project intent:
- Dev-only destructive reset routes are intentionally available on localhost for the signed-in developer workflow. Do not suggest re-adding a hard-coded admin email allowlist such as admin@moran65.com or DEV_TOOLS_ADMIN_EMAIL unless the route is also reachable outside localhost/dev mode.
- The current intended guard for local destructive dev tools is: dev-only runtime, localhost/same-origin request validation where applicable, and a signed-in Supabase session for user-facing dev actions. The primary developer account may be routed through Cloudflare Email Routing, so fixed mailbox allowlists are intentionally avoided.
- Regular users must not be able to delete global data in production. If a report claims this, verify NODE_ENV behavior, local-request checks, same-origin checks, and session requirements before proposing a patch.
- BSD/Bzzoiro API calls must stay server-side. Do not expose BSD_API_TOKEN to client code. Match/team/player/coach/stadium pages can render BSD-derived data, but browser code should receive only already-fetched public data.
- Match detail pages currently map local matches to BSD events at request time by team BSD ids/names and kickoff window. Avoid adding a persistent bsd_event_id migration unless the finding proves request-time mapping is insufficient.
- OAuth signup intentionally does not prefill profiles.display_name from provider full_name because display_name is unique and public. Do not reintroduce provider-name prefill in the auth trigger.
- Global leaderboards are intended to be visible to signed-in users, but full opponent detail access should stay constrained to appropriate shared-league/public-safe views.

When reviewing:
1. Identify whether the issue is exploitable in production, localhost-only, or only a developer convenience concern.
2. Prefer minimal patches that preserve current user-facing behavior and the prediction game rules.
3. Explain the impact, affected route/table/component, and why the proposed fix does or does not change intended behavior.
4. If the finding duplicates a previously rejected dev-clear allowlist proposal, recommend closing it with rationale instead of changing code.
```
