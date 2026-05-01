# Gladly LinkedIn CRM

Production scaffold for a Gladly-styled LinkedIn Relationship Tracker.

## Local Setup

Install dependencies:

```bash
npm install --legacy-peer-deps
```

The legacy peer flag is currently needed because the Inngest package tree exposes optional framework peers that conflict with the Vite version used by Vitest.

## Environment

Server code validates these variables before using external services:

- `DATABASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_BASE_URL`
- `UNIPILE_DSN`
- `UNIPILE_API_KEY`
- `UNIPILE_WEBHOOK_SECRET`
- `INNGEST_EVENT_KEY`
- `INNGEST_SIGNING_KEY`
- `AI_API_KEY`

Do not expose service-role, Unipile, Inngest signing, or AI keys to client components.

Unipile is configured with `UNIPILE_DSN=api17.unipile.com:14746`; keep the matching access token in `.env.local` or your deployment secret store as `UNIPILE_API_KEY`.

`APP_BASE_URL` must be the canonical app origin users sign in from. Supabase browser sessions are origin-scoped, and Unipile Hosted Auth uses this value for success, failure, and callback URLs. Keep this value aligned with the Supabase Auth redirect allowlist.

Copy `.env.example` to `.env.local` for local development, then fill in the non-Unipile service values.

## Integration Audit

Use `docs/ops/crm-integration-audit.md` to verify the CRM pipeline end to end across Supabase auth, Unipile Hosted Auth, Unipile webhooks, Inngest workers, Postgres persistence, and dashboard readiness.

The audit separates code checks from live configuration checks. Keep secret values in the deployment platform or local environment; record only safe evidence such as public origins, route names, webhook source names, row counts, job IDs, and timestamps.

## Verification

```bash
npm run typecheck
npm test
npm run lint
npm run build
```

## Current Scope

Implemented foundation covers:

- Next.js App Router scaffold
- Gladly UI primitives and dashboard placeholder
- Drizzle schema and initial SQL migration
- artifact import preparation
- authenticated, account-scoped artifact import persistence
- auth/session/ownership helpers
- relationship freshness, stage, and recompute logic
- Unipile account connection, sync, webhook processing, and API client coverage
