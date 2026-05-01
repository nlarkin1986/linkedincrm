# CRM Integration Audit

Created: 2026-05-01

## Purpose

Use this runbook to verify that the LinkedIn CRM is wired end to end after auth, Unipile Hosted Auth, webhooks, and Inngest changes. The goal is to separate code failures from deployment, Supabase, Unipile, Inngest, and data-state failures without exposing secrets.

## Safety Rules

- Start with read-only checks when inspecting live systems.
- Do not paste access tokens, service-role keys, Unipile API keys, webhook secrets, Inngest signing keys, or bearer tokens into this document.
- Record only safe evidence: route names, environment variable names, public origins, webhook source names, row counts, job IDs, and timestamps.
- Do not delete, reassign, or backfill production rows during this audit. Use `docs/ops/linkedin-auth-user-cleanup.md` for cleanup work.
- Treat app auth and LinkedIn auth as separate trust boundaries. Supabase identifies the app user; Unipile identifies the connected LinkedIn account.

## Expected Wiring

| Surface | Code or Config | Expected State |
|---------|----------------|----------------|
| App auth | Supabase browser session and bearer-auth API routes | Requests resolve one durable `app_users.id` before user-owned reads or writes. |
| App origin | `APP_BASE_URL` and Supabase Auth redirect allowlist | Same canonical origin for login, Hosted Auth redirects, and callbacks. |
| Hosted Auth | `app/api/linkedin/connect-url/route.ts` | Creates Unipile links with absolute success, failure, and notify URLs. |
| Hosted Auth callback | `app/api/linkedin/connection-callback/route.ts` | Authenticates callback, persists one owned `linkedin_accounts` row, and queues initial sync. |
| Browser claim repair | `app/api/linkedin/claim-connected-account/route.ts` | Verifies signed claim token before confirming account ownership. |
| Unipile webhooks | `app/api/webhooks/unipile/*` plus Unipile dashboard/API registration | Messaging, account-status, and user/relation webhook sources call the deployed app with the expected auth header. |
| Inngest serving | `app/api/inngest/route.ts` | Inngest can discover and execute all CRM sync and webhook functions. |
| Sync jobs | `inngest/functions/*` and `src/server/jobs/linkedin-sync.ts` | Initial and partial syncs persist chats, messages, people, relationships, and sync timestamps idempotently. |
| Webhook processors | `src/server/webhooks/runtime-processing.ts` | Raw events move to processed or failed with useful error detail. |
| Dashboard | `/api/me`, `/api/dashboard`, and dashboard UI | Signed-in user sees only their real account readiness and CRM rows. |

## Local Code Audit

Check these before live configuration:

- Authenticated routes use `requireRequestAppUser` before accessing user-owned data:
  - `app/api/me/route.ts`
  - `app/api/dashboard/route.ts`
  - `app/api/import/artifact/route.ts`
  - `app/api/linkedin/connect-url/route.ts`
  - `app/api/linkedin/accounts/[id]/sync/route.ts`
  - `app/api/linkedin/accounts/[id]/resync-full/route.ts`
- User-owned account operations check ownership before queueing sync, import, reconnect, or dashboard reads.
- Hosted Auth link creation sends `name=app_users.id` and uses `APP_BASE_URL` for all callback URLs.
- Hosted Auth callback and Unipile webhook routes fail closed when the webhook secret is missing outside tests.
- Webhook events are persisted before expensive processing and are safe to receive more than once.
- Inngest functions are exported from a central registry and served through the App Router endpoint.
- Sync and webhook processors update account state, raw event state, relationship state, and sync timestamps through repository modules.

## Deployment Configuration Audit

Verify these values in the deployment platform. Do not copy secret values into the audit notes.

- `DATABASE_URL` is present for the target environment.
- `NEXT_PUBLIC_SUPABASE_URL` is present and points at the intended Supabase project.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` is present.
- `SUPABASE_SERVICE_ROLE_KEY` is present only as a server-side secret.
- `APP_BASE_URL` is non-empty and equals the public app origin users sign in from.
- `UNIPILE_DSN` points at the expected Unipile DSN.
- `UNIPILE_API_KEY` is present only as a server-side secret.
- `UNIPILE_WEBHOOK_SECRET` is present and matches the header configured in Unipile webhooks.
- `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` are present in environments that execute jobs.
- `AI_API_KEY` is present only if AI-backed features are enabled.

## Supabase Audit

- The app origin in `APP_BASE_URL` is allowed in Supabase Auth redirects.
- Login and callback paths stay on the same origin so browser sessions remain available after redirects.
- The signed-in user's Supabase auth ID maps to exactly one `app_users.auth_user_id`.
- API routes use bearer token verification with Supabase `getUser`, not unverified client session data.

## Unipile Audit

Verify the Unipile account configuration without exposing the API key.

- Hosted Auth success URL points to `${APP_BASE_URL}/linkedin/connected`.
- Hosted Auth failure URL points to `${APP_BASE_URL}/linkedin/error`.
- Hosted Auth notify URL points to `${APP_BASE_URL}/api/linkedin/connection-callback`.
- Webhook authentication uses the expected header name, preferably `Unipile-Auth`, with the configured secret.
- Required webhook registrations exist for:
  - message events to `${APP_BASE_URL}/api/webhooks/unipile/messaging`
  - account-status or account lifecycle events to `${APP_BASE_URL}/api/webhooks/unipile/account-status`
  - user/new-relation events to `${APP_BASE_URL}/api/webhooks/unipile/users`
- Any webhook registration verifier should report missing, duplicate, or wrong-origin registrations as operational failures, not route-processing failures.

## Inngest Audit

- The deployed app exposes the Inngest serve endpoint at `/api/inngest`.
- The served function registry includes:
  - `sync-linkedin-account-initial`
  - `sync-linkedin-account-partial`
  - `process-unipile-message-webhook`
  - `process-unipile-account-status-webhook`
  - `process-unipile-user-webhook`
  - `import-chat-messages`
- Hosted Auth callback and browser claim events queue initial sync with a duplicate-safe event identity.
- Webhook intake queues processor events with a duplicate-safe event identity tied to the stored webhook event or external event ID.
- Failed jobs expose enough information to identify whether the failure was missing data, Unipile API failure, database failure, or parser failure.

## Database State Audit

Use read-only queries or dashboard views to confirm:

- The real user has one `app_users` row.
- The real user's `linkedin_accounts` row points to that `app_users.id`.
- Connected accounts have stable `unipile_account_id` values and accurate reconnect state.
- Healthy connected accounts may report `OK`, `SYNC_SUCCESS`, `CREATION_SUCCESS`, or `RECONNECTED`; `CREDENTIALS` should require reconnect.
- Initial sync completion updates the intended sync timestamp.
- Webhook intake creates `unipile_webhook_events` rows with `pending`, `processed`, or `failed` status, and duplicate external event IDs should resolve to the same stored event.
- Duplicate Unipile message IDs and duplicate webhook event IDs do not create duplicate messages, people, relationships, or unbounded jobs.
- Dashboard rows are filtered by the current `app_users.id`.

## End-to-End Smoke

1. Sign in on the canonical app origin.
2. Open `/settings/linkedin` and confirm the signed-in identity is real, not demo data.
3. Start LinkedIn connect or reconnect through the Hosted Auth button.
4. Complete Hosted Auth and return to `/linkedin/connected`.
5. Confirm the callback or browser claim created or reused one `linkedin_accounts` row for the signed-in app user.
6. Confirm the initial sync event is queued and processed by Inngest.
7. Confirm initial sync persisted at least account sync state. If there are known chats, confirm chats/messages/relationships were imported.
8. Send or receive a safe LinkedIn message event, or replay a staging webhook fixture.
9. Confirm webhook intake stores one raw event and queues the processor.
10. Confirm processing updates message and relationship state or records a useful failed status.
11. Refresh `/api/me` and `/api/dashboard`.
12. Confirm the dashboard shows the right connected, reconnect, syncing, empty, or data-ready state for the current user only.

## Failure Classification

| Symptom | Likely Owner |
|---------|--------------|
| Login succeeds but API routes return `401` | Supabase session/origin mismatch or bearer token verification. |
| Hosted Auth Close returns to the wrong URL | `APP_BASE_URL` or Unipile Hosted Auth callback URL generation. |
| Connected account appears in Unipile but not in app | Hosted Auth callback, browser claim token, app-user mapping, or account ownership persistence. |
| Webhook route never receives events | Unipile webhook registration or deployed app reachability. |
| Webhook route returns `401` | Webhook secret mismatch or wrong auth header configuration. |
| Raw webhook events stay pending | Inngest serving, queue dispatch, or processor failure. |
| Sync jobs never run | Inngest serve endpoint, event key/signing key, or function registry. |
| Messages import but directions are wrong | Missing connected account provider user ID or message normalization issue. |
| Dashboard stays syncing after sync | Sync timestamp/account status propagation issue. |
| Dashboard shows another user's rows | Ownership filter or repository query bug. |

## Audit Notes Template

Use this shape for safe notes:

```text
Date:
Environment:
Public app origin:
Checked by:

Code checks:
- [ ] Auth routes
- [ ] Hosted Auth routes
- [ ] Webhook routes
- [ ] Inngest route
- [ ] Dashboard routes

External config checks:
- [ ] Supabase redirect allowlist
- [ ] Unipile Hosted Auth callbacks
- [ ] Unipile webhooks
- [ ] Inngest registered functions
- [ ] Deployment environment variable presence

Smoke result:
- Outcome:
- Failed surface, if any:
- Safe evidence:
- Follow-up:
```
