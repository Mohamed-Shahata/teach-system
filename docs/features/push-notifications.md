# Feature: Real Push Notifications (FCM / Web Push)

## Purpose
Deliver the same events already written to the `notifications`
collection (Phase 20's automated class-start/reminder writes, and the
manual "send meeting link" click, see `features/schedule.md`) as an
actual OS/browser push via Firebase Cloud Messaging — not just the
in-app bell icon, which is useless if the recipient doesn't have the
tab open. See `docs/tasks/phase-26-push-notifications.md` and, for the
TASK-3001 change below, `docs/tasks/phase-30-notifications-ux.md`.

> **TASK-3001 update:** students no longer have a push on/off toggle.
> In-app notifications were already mandatory-on for every role; this
> just closes the one opt-out students had (push specifically) so a
> student can't end up silently missing a class link because they
> toggled push off once. Teachers and admins are unaffected — they
> keep the toggle described below. Everywhere this doc says "student or
> teacher" for the toggle-related behavior, read "teacher (and admin)
> only" going forward.

## User stories
- As a teacher (or admin), I can turn push notifications on from my
  own settings page; turning it on registers this browser/device. I
  can turn it off again without losing the in-app bell — the two are
  independent.
- As a student, push registration happens automatically in the
  background the first time I open my settings page (best-effort,
  silently retried, never blocks the page) — there's nothing for me to
  turn on or off.
- As a student or teacher, once registered, I get an OS-level
  notification for the same events that already land in my in-app
  bell (a class starting soon, a meeting link being sent).

## Data
- `users/{uid}/fcmTokens/{tokenId}` — one doc per registered
  browser/device, id = `sha256(token)` so re-registering the same
  device upserts instead of duplicating. See `database/collections.md`.
- `users/{uid}.pushEnabled` (boolean, absent/`undefined` treated as
  `true`) — the per-user on/off toggle. **Read by `pushDispatchService`
  for teacher/admin recipients only** since TASK-3001; a student
  recipient always receives push regardless of what's stored here
  (legacy `false` values from before this change are simply ignored).

## Flow
1. `lib/client/firebaseMessaging.ts`'s `requestPushToken()` asks
   browser permission, registers `public/firebase-messaging-sw.js`,
   and gets an FCM token (returns `null` on any unsupported-browser/
   denied/missing-VAPID-key case rather than throwing).
2. `syncPushToken(token)` POSTs it to
   `POST /api/notifications/fcm-tokens`, persisting it under the
   caller's own `fcmTokens` subcollection.
3. For teachers/admins, both calls are wired into the "Push
   notifications" toggle (`teacher-settings-form.tsx`) — an explicit
   opt-in, same as before. For students (TASK-3001), both calls run
   automatically on mount of `student-settings-form.tsx` — no toggle,
   no separate opt-in step; the browser's own permission prompt is
   still what actually asks the student once.
4. Whenever the app writes to `notifications` (the manual meeting-link
   send, or Phase 20's two automated triggers), `pushDispatchService
   .dispatchForNotifications` runs right after — it groups the batch
   by recipient, skips a teacher/admin recipient with
   `pushEnabled === false` before ever reading their tokens (never
   skips a student recipient on that basis), sends via the Admin SDK's
   `sendEachForMulticast` (`pushRepository`), and prunes any token FCM
   reports back as dead.

## Authorization
A user can only register, list, or remove their own tokens
(`fcmTokenService`, no role gate — push isn't role-specific). Only
teachers/admins can toggle their own `pushEnabled` flag —
`PATCH /api/student/settings/push` no longer exists (TASK-3001).
`firestore.rules` has an owner-only `fcmTokens` match nested under
`users/{uid}` as a defense-in-depth backstop; the real read/write path
is the Admin SDK (`pushRepository`, `fcmTokenRepository`), same as
every other Admin-SDK-backed collection in this project.

## Localization
Push copy (the OS-level notification title/body) is generated
server-side in `pushDispatchService`, localized off `users/{uid}.locale`
— it deliberately does **not** go through `messages/en.json`/`ar.json`,
since nothing under `messages/` renders it (it's not a client-rendered
`next-intl` string). The settings-page toggle's own label *is* a
client-rendered string and lives in `messages/*.json`
(`teacherDashboard.settings.push.*`; the student equivalent
`studentDashboard.settings.push.*` now describes the always-on state
rather than a toggle, per TASK-3001).

## Edge cases
- A push failure is always best-effort: `dispatchForNotifications`
  never throws, so a broken/expired token can never fail the
  `notifications` write it rides on.
- Teacher/admin: until they opt in via the settings toggle, their
  token set is empty and they simply receive no push (the in-app bell
  is unaffected either way).
- Student: if the browser denies the permission prompt (or push isn't
  supported), `requestPushToken()` returns `null` and registration is
  silently skipped — the student still gets everything via the in-app
  bell, which was never conditional on push in the first place.
