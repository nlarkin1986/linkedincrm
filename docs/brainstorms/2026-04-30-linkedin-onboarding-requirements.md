---
date: 2026-04-30
topic: linkedin-onboarding
---

# LinkedIn Onboarding

## Problem Frame
Signed-in users who have not connected LinkedIn, whose LinkedIn connection is broken, or whose profile/dashboard data cannot yet load should not see raw backend errors or demo dashboard content. The app should guide them through a dedicated setup experience that clearly separates Gladly app sign-in from LinkedIn authorization.

## Requirements

**Authentication Gates**
- R1. Users without a valid Gladly app session are redirected to the login page with a safe return path.
- R2. Users with a valid Gladly app session but no connected LinkedIn account see a dedicated onboarding screen instead of dashboard metrics.
- R3. Users with a LinkedIn account that requires reconnection see the same onboarding shell with reconnect-specific copy and a primary reconnect action.

**Onboarding Experience**
- R4. The onboarding screen is the first signed-in experience for users who need LinkedIn setup, not a small empty state buried in the dashboard table.
- R5. The screen explains the next action in plain language: connect or reconnect LinkedIn to start syncing relationship activity.
- R6. The primary action starts the existing LinkedIn hosted-auth connection flow.
- R7. The header continues to show the signed-in Gladly user identity when it can be loaded.
- R8. If the Gladly profile cannot be loaded, the page shows a clear account/session recovery path instead of low-level error text.

**Dashboard Readiness**
- R9. The dashboard renders relationship metrics and rows only when the user has a connected LinkedIn account and dashboard data can be loaded.
- R10. Users with a connected LinkedIn account but no synced relationships yet see a syncing or empty-data state that is distinct from "not connected."
- R11. Demo names, demo counts, and placeholder companies never appear in authenticated production dashboard states.

**Errors and Recovery**
- R12. Auth/session failures route users to login rather than showing raw Supabase or network errors.
- R13. Backend or sync failures that occur after the app session and LinkedIn account are valid show a retryable operational error state.
- R14. Error text should be user-facing and action-oriented; raw provider, DNS, or stack-style messages should not be the primary message.

## Success Criteria
- A signed-in user with no LinkedIn account lands on a polished setup screen with a clear "Connect LinkedIn" action.
- A signed-in user with a reconnect-required LinkedIn account lands on a clear "Reconnect LinkedIn" path.
- A user who is not signed into the Gladly app is sent to login, not shown dashboard or provider errors.
- A connected user with no synced relationships understands that sync is pending or no data exists yet.
- The screenshot failure mode is eliminated: no raw `getaddrinfo`, Supabase host, or similar infrastructure message appears as the main dashboard content.

## Scope Boundaries
- Do not build LinkedIn send, invite, or automation actions.
- Do not redesign the whole dashboard beyond the readiness/onboarding states.
- Do not add demo data as fallback content.
- Do not require a new app-auth provider flow unless planning proves the current Supabase session setup is misconfigured.

## Key Decisions
- Use a dedicated onboarding screen: This is clearer than a table empty state because LinkedIn authorization is a prerequisite, not missing table data.
- Keep Gladly app auth separate from LinkedIn auth: Users first authenticate into the app, then authorize LinkedIn through Unipile hosted auth.
- Treat not-connected as a normal setup state: It should not render as an error.

## Dependencies / Assumptions
- The existing Unipile hosted-auth flow remains the connection mechanism.
- The app can determine LinkedIn account state from the current user status already returned for authenticated users.
- Initial sync may take time after connection, so the product needs a distinct connected-but-syncing state.

## Outstanding Questions

### Resolve Before Planning
- None.

### Deferred to Planning
- [Affects R10][Technical] Determine whether existing sync timestamps are enough to distinguish syncing from connected-empty, or whether an additional sync status is needed.
- [Affects R8][Technical] Determine the best recovery behavior when the app profile cannot load because of environment or backend connectivity issues.

## Next Steps
-> /ce:plan for structured implementation planning.
