---
title: fix: Repair LinkedIn hosted auth redirect origin
type: fix
status: completed
date: 2026-04-30
---

# fix: Repair LinkedIn hosted auth redirect origin

## Overview

Fix the LinkedIn Hosted Auth close flow so Unipile redirects users back to the app after account connection instead of navigating to a malformed `https/linkedin/connected?...` URL.

## Problem Frame

After LinkedIn account authentication succeeds, the Unipile Hosted Auth screen shows "Account successfully added." Pressing Close should navigate to the app's success landing page. Instead, the browser navigates to a non-existent `https` host. Local investigation found the linked Vercel project had `APP_BASE_URL` configured as an empty string for preview and production, while the Hosted Auth payload depends on the app base URL to build `success_redirect_url`, `failure_redirect_url`, and `notify_url`.

## Requirements Trace

- R1. Hosted Auth success redirects must use the public app origin and land on `/linkedin/connected`.
- R2. Hosted Auth failure redirects and notify callbacks must use the same public app origin.
- R3. The codebase must have regression coverage proving the actual Unipile request body contains valid absolute callback URLs.
- R4. Deployment configuration must not leave `APP_BASE_URL` blank for preview or production.

## Scope Boundaries

- Do not change the Unipile account connection product flow.
- Do not change Supabase authentication or dashboard access control.
- Do not add LinkedIn send/invite automation.

## Context & Research

### Relevant Code and Patterns

- `app/api/linkedin/connect-url/route.ts` creates the Hosted Auth link after resolving the authenticated user.
- `src/server/unipile/connection.ts` builds the Hosted Auth callback URLs from `appBaseUrl`.
- `src/server/unipile/client.ts` maps the internal request to Unipile's snake_case JSON body.
- `src/server/http/app-origin.ts` validates app origins and rejects non-HTTPS origins outside localhost.
- `tests/api/linkedin-connect-url.test.ts` covers helper-level Hosted Auth payload construction.
- `tests/server/unipile/client.test.ts` covers the Unipile client request behavior.

### Institutional Learnings

- No `docs/solutions/` entries exist in this repo.

### External References

- Unipile Hosted Auth documentation confirms `success_redirect_url`, `failure_redirect_url`, and `notify_url` are the integration points for post-auth redirects and callbacks.

## Key Technical Decisions

- Treat `APP_BASE_URL` as the source of truth for deployed Hosted Auth callbacks: the user-facing Close action happens outside the app, so Unipile needs a stable public origin.
- Keep localhost allowed for local development only: this matches the existing validation in `src/server/http/app-origin.ts`.
- Add request-body regression coverage in `tests/server/unipile/client.test.ts`: the previous tests verified helper output but did not assert the JSON body sent to Unipile contained callback URLs.

## Open Questions

### Resolved During Planning

- What public origin should production use? Resolved: `https://linkedincrm-delta.vercel.app`.
- Is this a code-only issue? Resolved: no. The immediate missing link was Vercel `APP_BASE_URL`, but tests should also cover the outgoing Unipile body.

### Deferred to Implementation

- Whether a future custom domain should replace the Vercel app URL: defer until a domain is configured.

## Implementation Units

- [x] **Unit 1: Restore Hosted Auth deployment origin**

**Goal:** Ensure preview and production Hosted Auth links use the deployed app origin.

**Requirements:** R1, R2, R4

**Dependencies:** None

**Files:**
- Modify: Vercel project environment configuration

**Approach:**
- Set `APP_BASE_URL` for production and preview to `https://linkedincrm-delta.vercel.app`.
- Redeploy after the env update so serverless functions generate Hosted Auth links with the corrected origin.

**Patterns to follow:**
- Existing `.env.example` documents `APP_BASE_URL` as the configured app origin.

**Test scenarios:**
- Happy path: after auth success, pressing Close navigates to `https://linkedincrm-delta.vercel.app/linkedin/connected?account_id=...`.
- Error path: if the app origin is blank, link generation should fail visibly instead of silently producing malformed redirect URLs.

**Verification:**
- Vercel env pull shows `APP_BASE_URL="https://linkedincrm-delta.vercel.app"` for preview and production.
- The deployed app responds at `https://linkedincrm-delta.vercel.app`.

- [x] **Unit 2: Cover the outgoing Unipile callback URL payload**

**Goal:** Prevent regressions where helper output is valid but the actual Unipile API body omits or corrupts callback URLs.

**Requirements:** R1, R2, R3

**Dependencies:** Unit 1

**Files:**
- Modify: `tests/server/unipile/client.test.ts`
- Test: `tests/server/unipile/client.test.ts`

**Approach:**
- Extend the Hosted Auth client test to parse the JSON request body and assert `success_redirect_url`, `failure_redirect_url`, and `notify_url` are passed through unchanged.

**Patterns to follow:**
- Existing `tests/server/unipile/client.test.ts` request inspection style.

**Test scenarios:**
- Happy path: provided absolute callback URLs appear exactly in the JSON sent to `/hosted/accounts/link`.
- Edge case: the test should fail if the client sends camelCase callback keys or drops callback fields.

**Verification:**
- Focused Unipile client tests pass.

## System-Wide Impact

- **Interaction graph:** `LinkedInConnectButton` -> `app/api/linkedin/connect-url/route.ts` -> Unipile Hosted Auth -> Unipile Close action -> app success/failure route.
- **Error propagation:** invalid app origin should fail link creation rather than producing a hosted-auth URL with broken callbacks.
- **State lifecycle risks:** the notify callback can still persist the account even if the browser redirect fails; fixing the redirect restores user-facing completion feedback.
- **API surface parity:** success, failure, and notify URLs must all use the same origin.
- **Integration coverage:** request-body tests prove the app sends the fields Unipile uses for Close redirects.
- **Unchanged invariants:** account persistence, initial sync queuing, and Supabase session ownership behavior remain unchanged.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Vercel env updates do not affect existing immutable deployments | Redeploy after updating the env value. |
| Preview deployments redirect to production when using the shared app URL | Accept for this immediate fix; revisit if preview-specific external callback testing becomes important. |
| Future custom domain changes are missed | Keep `APP_BASE_URL` as the single deployment knob. |

## Documentation / Operational Notes

- No user-facing docs are required for this fix.
- Deployment operators should keep `APP_BASE_URL` non-empty and aligned with the public app origin.

## Sources & References

- Related code: `app/api/linkedin/connect-url/route.ts`
- Related code: `src/server/unipile/connection.ts`
- Related code: `src/server/unipile/client.ts`
- Related tests: `tests/server/unipile/client.test.ts`
- External docs: `https://developer.unipile.com/docs/hosted-auth`
