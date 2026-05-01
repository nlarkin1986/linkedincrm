# LinkedIn Auth User Cleanup

Created: 2026-04-30

## Purpose

Use this runbook after the app-user persistence fix is deployed. The goal is to remove or repair demo-owned LinkedIn auth data so the real signed-in user owns their connected Unipile account through `linkedin_accounts.user_id -> app_users.id`.

## Safety Rules

- Start with read-only audit queries.
- Do not delete or reassign a `linkedin_accounts` row until the `unipile_account_id` is confirmed to belong to the intended real user.
- Preserve relationship, chat, message, webhook, and sync history unless it is confirmed demo-only data.
- Record affected row IDs and counts before and after cleanup.
- Do not paste service keys, access tokens, or webhook secrets into this document.

## Audit Targets

Look for:

- `app_users.full_name` values matching `Daniel Torres` or other demo-only names.
- `app_users.email` values matching fixture/test addresses such as `daniel@example.com`.
- `linkedin_accounts.user_id` values that point to demo app users.
- `linkedin_accounts` rows whose owner does not match a real Supabase `auth_user_id`.
- Orphaned relationships, chats, messages, next actions, or webhook events linked to demo-owned LinkedIn accounts.

## Expected Fixed State

- The real Supabase user has exactly one durable `app_users` row.
- The connected LinkedIn account row points to that real `app_users.id`.
- `/settings/linkedin` shows the real signed-in user's display name or email.
- `/settings/linkedin` shows `Connected` for the real user's LinkedIn account after refresh and re-login.
- Production UI no longer renders `Daniel Torres`, `Danny Torres`, or `DT` as the authenticated user.

## Cleanup Strategy

1. Identify the real user's `app_users` row by `auth_user_id` and email.
2. Identify demo-like `app_users` rows by full name, email, and creation history.
3. Identify all `linkedin_accounts` rows and their `unipile_account_id` values.
4. Confirm which Unipile account belongs to the real user using Unipile account metadata or a fresh authenticated connection flow.
5. If a real Unipile account is attached to a demo app user, reassign that `linkedin_accounts.user_id` to the real `app_users.id`.
6. If demo-owned rows are orphaned and have no production dependencies, remove them after recording counts.
7. If dependencies exist, either reassign the full dependent graph to the real user or leave the rows in place and document why.

## Manual Verification

After cleanup:

- Sign in on the canonical app origin.
- Open `/settings/linkedin`.
- Confirm the page shows the real user's name or email, not demo data.
- Connect or reconnect LinkedIn through Unipile if needed.
- Return to `/linkedin/connected`.
- Refresh `/settings/linkedin`.
- Sign out and sign back in.
- Confirm the same LinkedIn account remains connected to the real user.
