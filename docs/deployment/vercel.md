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

`app/api/cron/class-notifications/route.ts` needs to be hit once a
minute, used by Phase 20's automated class notifications ("class
starting" push to students, teacher reminder 10 minutes before).

> **Not using Vercel's native `crons` config.** `vercel.json` originally
> registered this route on a per-minute schedule (`* * * * *`) via
> Vercel Cron, but Vercel's Hobby (free) tier doesn't just silently
> downgrade a finer-than-daily schedule — it now **rejects the deploy
> outright** ("Hobby accounts are limited to daily cron jobs"). A
> once-a-day trigger defeats the point of this job (it exists to catch
> a class starting *this minute*), so instead of downgrading the
> schedule, `vercel.json`'s `crons` array was removed entirely (`{}`)
> and the per-minute trigger now comes from an **external cron
> service** hitting the deployed route directly over HTTPS.

### Setting up the external cron (cron-job.org, free)

The route only checks for a valid `Authorization: Bearer <CRON_SECRET>`
header (see `environment-variables.md`) — it doesn't care who's calling
it, so any scheduler that can send a custom header works. Steps for
[cron-job.org](https://cron-job.org) (free, no card required):

1. Create an account and click **Create cronjob**.
2. **URL:** `https://<your-production-domain>/api/cron/class-notifications`
3. **Schedule:** every 1 minute (`* * * * *` — cron-job.org's free tier
   allows this, unlike Vercel Hobby).
4. **Request method:** `GET`.
5. Under **Advanced → Headers**, add:
   `Authorization: Bearer <the same value as your CRON_SECRET env var>`
6. Save and enable the job. cron-job.org shows a run history/response
   log per execution — use it to confirm `{ "ok": true, ... }` responses
   and catch any 401s (wrong/missing secret) or 5xxs early.

Any other external scheduler (EasyCron, GitHub Actions on a schedule,
a small VPS with `cron`, etc.) works the same way — the only
requirement is the `Authorization` header on every call.

> Revisit switching back to `vercel.json`'s native `crons` (simpler,
> one less third-party dependency) if/when the project moves to Vercel
> Pro, which removes the daily-only limit.

## Environment variables

Configured per-environment in the Vercel dashboard (Production, Preview,
Development). See `deployment/environment-variables.md` for the full
list and `.env.example` at the project root for local development.
