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
- Unipile account connection, sync, and webhook processing scaffolding
