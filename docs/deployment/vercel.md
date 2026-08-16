# Deployment (Vercel)

## Serverless constraints respected by the architecture

- No in-memory session/cache shared across requests (Admin SDK app
  instance is memoized per-container via `getApps()`, not relied on
  across containers).
- No writes to the local filesystem at runtime (Cloudinary handles all
  media persistence).
- Admin SDK credentials provided entirely via environment variables (no
  service-account JSON file committed or read from disk).
- Cold-start friendly: Admin SDK and any heavy imports are lazy /
  memoized, not instantiated at module top-level where avoidable.

## Environments

| Environment | Branch | Firebase project | Notes |
|---|---|---|---|
| Production | `main` | `teacher-app-prod` | |
| Preview | any PR branch | `teacher-app-staging` | Vercel preview deployments use a shared staging Firebase project |
| Local development | — | `teacher-app-dev` (or emulators) | Firebase Local Emulator Suite recommended for Firestore + Auth |

## Build

Standard Next.js build (`next build`) — no custom server, fully
compatible with Vercel's Next.js runtime. No Node APIs requiring a
custom server are used.

## Cron jobs (TASK-2001)

`vercel.json` registers `/api/cron/class-notifications` on a per-minute
schedule (`* * * * *`), used by Phase 20's automated class notifications.

> **Plan caveat:** Vercel's Hobby (free) tier only runs cron jobs once
> per day, regardless of what `vercel.json` says — per-minute schedules
> need a Pro plan or higher. Confirm the deployment's plan before
> relying on this firing every minute in production.

The route itself checks `Authorization: Bearer <CRON_SECRET>` (see
`environment-variables.md`) — Vercel adds this header automatically for
routes listed under `crons`, so no extra configuration is needed beyond
setting the `CRON_SECRET` env var in the Vercel dashboard.

## Environment variables

Configured per-environment in the Vercel dashboard (Production, Preview,
Development). See `deployment/environment-variables.md` for the full
list and `.env.example` at the project root for local development.
