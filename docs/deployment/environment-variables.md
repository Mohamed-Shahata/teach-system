# Environment Variables

## Public (safe to expose to the browser)

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase client SDK config |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase client SDK config |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase client SDK config |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase Cloud Messaging (TASK-2601) — required alongside the three above for `getMessaging()` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase Cloud Messaging (TASK-2601) |
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | Web Push certificate key pair, from Firebase Console → Cloud Messaging (TASK-2601) — used by `getToken()` |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | used to build delivery/upload URLs client-side |
| `NEXT_PUBLIC_CLOUDINARY_API_KEY` | required alongside a server-generated signature for signed uploads |

## Server-only secrets — NEVER exposed to the client

| Variable | Purpose |
|---|---|
| `FIREBASE_PROJECT_ID` | Admin SDK |
| `FIREBASE_CLIENT_EMAIL` | Admin SDK service account |
| `FIREBASE_PRIVATE_KEY` | Admin SDK service account (newline-escaped) |
| `CLOUDINARY_CLOUD_NAME` | server-side operations (may duplicate the public one) |
| `CLOUDINARY_API_KEY` | server-side signature generation |
| `CLOUDINARY_API_SECRET` | server-side signature generation — **critical secret** |
| `SESSION_COOKIE_SECRET` | (if used) additional signing for session cookie handling |
| `CRON_SECRET` | shared secret checked by `app/api/cron/*` routes — Vercel Cron sends it as `Authorization: Bearer <CRON_SECRET>`; any request without a match is rejected (TASK-2001) |

## Rule

Any variable without the `NEXT_PUBLIC_` prefix is server-only by Next.js
convention; this project treats that prefix as a hard boundary — a code
reviewer/AI agent must reject any change that reads a non-`NEXT_PUBLIC_`
variable inside a file executed in the browser (Client Component without
`"use server"`, or any code shipped in the client bundle).

`.env.example` at the project root lists all of the above as empty
placeholders; real values are never committed.
