# Feature: Real Push Notifications (FCM / Web Push)

## Purpose
Deliver the same events already written to the `notifications`
collection (Phase 20's automated class-start/reminder writes, and the
manual "send meeting link" click, see `features/schedule.md`) as an
actual OS/browser push via Firebase Cloud Messaging — not just the
in-app bell icon, which is useless if the recipient doesn't have the
tab open. See `docs/tasks/phase-26-push-notifications.md`.

## User stories
- As a student or teacher, I can turn push notifications on from my
  own settings page; turning it on registers this browser/device.
- As a student or teacher, once enabled, I get an OS-level
  notification for the same events that already land in my in-app
  bell (a class starting soon, a meeting link being sent).
- As a student or teacher, I can turn push off again without losing
  the in-app bell — the two are independent; disabling push never
  disables the in-app notification list itself.

## Data
- `users/{uid}/fcmTokens/{tokenId}` — one doc per registered
  browser/device, id = `sha256(token)` so re-registering the same
  device upserts instead of duplicating. See `database/collections.md`.
- `users/{uid}.pushEnabled` (boolean, absent/`undefined` treated as
  `true`) — the per-user on/off toggle.

## Flow
1. `lib/client/firebaseMessaging.ts`'s `requestPushToken()` asks
   browser permission, registers `public/firebase-messaging-sw.js`,
   and gets an FCM token (returns `null` on any unsupported-browser/
   denied/missing-VAPID-key case rather than throwing).
2. `syncPushToken(token)` POSTs it to
   `POST /api/notifications/fcm-tokens`, persisting it under the
   caller's own `fcmTokens` subcollection.
3. Both calls are wired into the "Push notifications" toggle on the
   student/teacher settings forms (`student-settings-form.tsx` /
   `teacher-settings-form.tsx`) — not called anywhere else, so no
   token is registered without an explicit opt-in.
4. Whenever the app writes to `notifications` (the manual meeting-link
   send, or Phase 20's two automated triggers), `pushDispatchService
   .dispatchForNotifications` runs right after — it groups the batch
   by recipient, skips anyone with `pushEnabled === false` before ever
   reading their tokens, sends via the Admin SDK's
   `sendEachForMulticast` (`pushRepository`), and prunes any token FCM
   reports back as dead.

## Authorization
A user can only register, list, or remove their own tokens
(`fcmTokenService`, no role gate — push isn't role-specific) and only
toggle their own `pushEnabled` flag. `firestore.rules` has an
owner-only `fcmTokens` match nested under `users/{uid}` as a
defense-in-depth backstop; the real read/write path is the Admin SDK
(`pushRepository`, `fcmTokenRepository`), same as every other
Admin-SDK-backed collection in this project.

## Localization
Push copy (the OS-level notification title/body) is generated
server-side in `pushDispatchService`, localized off `users/{uid}.locale`
— it deliberately does **not** go through `messages/en.json`/`ar.json`,
since nothing under `messages/` renders it (it's not a client-rendered
`next-intl` string). The settings-page toggle's own label *is* a
client-rendered string and does live in `messages/*.json`
(`studentDashboard.settings.push.*` / `teacherDashboard.settings.push.*`).

## Edge cases
- A push failure is always best-effort: `dispatchForNotifications`
  never throws, so a broken/expired token can never fail the
  `notifications` write it rides on.
- Until a user opts in via the settings toggle, their token set is
  empty and they simply receive no push (the in-app bell is
  unaffected either way).
