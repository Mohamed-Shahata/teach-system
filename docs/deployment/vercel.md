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
| Production | `main` | `teacher-saas-prod` | |
| Preview | any PR branch | `teacher-saas-staging` | Vercel preview deployments use a shared staging Firebase project |
| Local development | — | `teacher-saas-dev` (or emulators) | Firebase Local Emulator Suite recommended for Firestore + Auth |

## Build

Standard Next.js build (`next build`) — no custom server, fully
compatible with Vercel's Next.js runtime. No Node APIs requiring a
custom server are used.

## Environment variables

Configured per-environment in the Vercel dashboard (Production, Preview,
Development). See `deployment/environment-variables.md` for the full
list and `.env.example` at the project root for local development.
