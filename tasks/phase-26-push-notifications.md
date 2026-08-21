# Phase 26 — Real Push Notifications (FCM / Web Push)

> Added post-MVP, suggested alongside Phases 20–24. Phase 20 makes the
> `notifications` collection populate itself automatically, but a
> notification that only shows up inside the dashboard's bell icon is
> useless if the student or teacher doesn't have the tab open when a
> class starts. This phase delivers the same notification events as an
> actual OS/browser push, using Firebase Cloud Messaging (already in
> the stack via Firebase Auth/Firestore). Depends on Phase 20 existing
> first — it's a new delivery channel for the same notification writes,
> not a replacement for the in-app bell.

## TASK-2601: FCM setup + service worker
- Description: Register a Firebase Messaging service worker (`public/firebase-messaging-sw.js`), wire up `getToken`/`onMessage` from the Firebase JS SDK, and request browser notification permission from the user at an appropriate point (not on first load — after a relevant action, e.g. enabling notifications in settings).
- Dependencies: none (independent of TASK-2001, but reads the same events as Phase 20 once both exist)
- Affected modules: `public/firebase-messaging-sw.js`, `lib/client/firebaseMessaging.ts`
- Status: Done

> `firebase-messaging-sw.js` reads its Firebase config from query-string
> params on its own registration URL (`registerPushServiceWorker` in
> `firebaseMessaging.ts` builds them from `clientApp.options`) rather than
> hardcoding a second copy of the public config, since a static
> `public/` file can't read `process.env` at build time. Three new
> `NEXT_PUBLIC_*` vars added (`FIREBASE_MESSAGING_SENDER_ID`,
> `FIREBASE_APP_ID`, `FIREBASE_VAPID_KEY`) — `.env.example` and
> `deployment/environment-variables.md` updated; `firebaseClient.ts`'s
> `firebaseConfig` gained `messagingSenderId`/`appId` (both required by
> `getMessaging()`, previously omitted since only Auth needed the
> config). Exports `requestPushToken()` (permission → register SW →
> `getToken`, returns `null` on any unsupported-browser/denied/missing-
> key case rather than throwing) and `listenForForegroundMessages()`
> (wraps `onMessage`); the service worker's own `onBackgroundMessage`
> handles the tab-closed case with `showNotification` +
> `notificationclick` → focus/open.
> **Deliberately not called from any component yet.** The task's own
> "appropriate point" (e.g. enabling notifications in settings) is
> TASK-2604's settings toggle, Not Started; calling `requestPushToken`
> before that exists would prompt users with no opt-out UI and no
> server (TASK-2602, Not Started) to send the token to. Both remaining
> tasks in this phase are unblocked by this one and are the next work.
> `getMessaging()`/`isSupported()` are loaded lazily via dynamic
> `import("firebase/messaging")` inside the exported functions, not at
> module load — `getMessaging()` throws in unsupported browsers/SSR, and
> this module is reachable from client components that also render
> server-side. Unit tests in `firebaseMessaging.test.ts` (mocked
> `firebase/messaging` + stubbed `navigator`/`window`/`Notification`
> globals) cover the supported/unsupported/denied/missing-key paths for
> both exports. Full verification: `npx vitest run` (94 files / 585
> tests passing), `npx eslint` clean, `npx next build` (production,
> Turbopack) succeeded and resolved `tsc --noEmit` clean, `npm run
> check-translations` (792 keys in sync) and `npm run check-rtl` both
> pass — no new client-visible strings or physical LTR/RTL classes were
> introduced.

## TASK-2602: Store device tokens per user
- Description: New subcollection `users/{uid}/fcmTokens/{tokenId}` (or an array field) so a user can have multiple registered devices/browsers; token refresh and cleanup on `onTokenRefresh`/expiry.
- Dependencies: TASK-2601
- Affected modules: `docs/database/collections.md`, `firestore.rules`
- Status: Done

> Chose the subcollection over an array field — same reasoning
> `collections.md` already applies elsewhere (`lessonProgress`,
> `enrollments`): per-device docs let one device's token be added/removed
> without a read-modify-write race against another device registering at
> the same time, and there's no need to ever load the whole set except
> for dispatch (TASK-2603) or the owner's own list.
>
> Landed the full read/write path, not just the docs/rules the task
> description names — those alone would leave nothing to actually call:
> `fcmTokenRepository` (`users/{uid}/fcmTokens/{tokenId}`, id =
> `sha256(token)` so re-registering the same device upserts instead of
> duplicating — `collections.md` documents why a raw token isn't used as
> the id directly), `fcmTokenService` (register/list/remove, all scoped
> to the caller's own uid, no role gate since push isn't role-specific),
> `POST`/`GET /api/notifications/fcm-tokens` and
> `DELETE /api/notifications/fcm-tokens/[tokenId]`. `firestore.rules`
> gained an owner-only `fcmTokens` match nested under `users/{uid}`,
> matching every other collection's "Admin SDK is the real path, rules
> are the safety net" pattern.
> `lib/client/firebaseMessaging.ts` gained `syncPushToken(token)` — POSTs
> a token to the new endpoint, `false` on any failure rather than
> throwing — as the natural client-side half of "store device tokens",
> reusing TASK-2601's `requestPushToken()` return value. Still not
> called from anywhere: same reasoning as TASK-2601 (TASK-2604's
> settings toggle is the real call site).
> "Token refresh... on `onTokenRefresh`" from the description: the
> modern Firebase JS SDK (v11, already in use) has no `onTokenRefresh`
> event — `getToken()` itself returns the current valid token, refreshed
> transparently by the SDK, so the intended behavior is just calling
> `requestPushToken()` + `syncPushToken()` again periodically/on load,
> which `upsert`'s re-registration-safe semantics already support; no
> separate refresh listener needed. "Cleanup... on expiry" is
> TASK-2603's job (pruning a token FCM reports as dead after a failed
> `send`) — noted on `fcmTokenRepository.remove` and in `collections.md`,
> not implemented here since there's no dispatch code yet to report a
> dead token.
> Full verification: `npx vitest run` (98 files / 602 tests, up from 94/585),
> `npx eslint` clean (no new warnings), `npx next build` (production,
> Turbopack) succeeded, `npx tsc --noEmit` clean, `npm run
> check-translations` (792 keys, unchanged — no new client-visible
> strings) and `npm run check-rtl` both pass.

## TASK-2603: Server-side push dispatch on notification write
- Description: Wherever the app writes to `notifications` (manual send today, Phase 20's automated triggers once shipped), also call the Firebase Admin SDK's messaging `send`/`sendEachForMulticast` against the recipient's tokens from TASK-2602. Failed/expired tokens get pruned.
- Dependencies: TASK-2602
- Affected modules: `lib/server/services/notificationService.ts`
- Status: Done

> Landed as two new modules rather than inline in `notificationService.ts`,
> following `architecture/folder-structure.md`'s "repositories are the only
> layer touching an Admin API" rule (FCM is an Admin API, same as
> Firestore/Cloudinary):
> `pushRepository` (`sendMulticast` — thin `sendEachForMulticast` wrapper,
> tokens in / per-token `{success, errorCode}` out, never throws for a
> per-token failure) and `pushDispatchService` (business logic — groups a
> `NotificationDoc[]` batch by recipient, looks up each recipient's
> devices via TASK-2602's `fcmTokenRepository`, builds the push copy,
> and prunes any token FCM reports back as dead via `messaging/
> registration-token-not-registered` and friends, per `collections.md`'s
> cleanup note).
> Wired into both places that write `notifications` today —
> `notificationService.sendMeetingLink` and `classNotificationsJob`'s two
> auto-fire paths (TASK-2002/2003) — right after `createMany`, since
> `createMany` itself is a repository and repositories don't call
> services/other repositories in this codebase (no existing precedent for
> it, unlike the `repositories/base` helper pattern).
> `dispatchForNotifications` is deliberately best-effort and never
> throws: a push failure must never fail the notification write it rides
> on. Push copy is localized off the new `users/{uid}.locale` field
> (added to `UserDoc` — it was already documented in `collections.md` but
> missing from the interface) with `en`/`ar` strings kept local to
> `pushDispatchService` rather than added to `messages/en.json`/`ar.json`,
> since nothing under `messages/` renders them (they're OS-level push
> copy generated server-side, not a client-rendered next-intl string) —
> `npm run check-translations` isn't affected.
> TASK-2604 (per-user push on/off toggle) remains `Not Started` and is
> next (its only dependency, this task, is now `Done`) — until it ships,
> every registered device gets every push, which is acceptable since
> nothing calls `requestPushToken`/`syncPushToken` from any UI yet
> (TASK-2601/2602's notes) so the token set is still empty in practice.
> Verification: added `pushRepository.test.ts` and
> `pushDispatchService.test.ts`, and extended
> `notificationService.test.ts`/`classNotificationsJob.test.ts` to assert
> `pushDispatchService.dispatchForNotifications` is called with the
> created docs. Could not run `npx vitest`/`npx tsc --noEmit`/`npx
> eslint`/`npx next build` in this sandbox (no network access to install
> `node_modules`) — please run the full verification suite before
> merging.

## TASK-2604: Notification preferences
- Description: Simple per-user toggle (settings page) for whether push is enabled, separate from the in-app bell which always stays on — some users may want the badge but not the OS-level interruption.
- Dependencies: TASK-2603
- Affected modules: `components/student/settings-panel.tsx`, `components/teacher/settings-panel.tsx`
- Status: Done

> Landed as `users/{uid}.pushEnabled` (added to `UserDoc`; absent/`undefined`
> treated as `true`, same "no migration needed" convention as
> `canCreateStudents`) with `userRepository.updatePushEnabled`,
> `studentSettingsService`/`teacherSettingsService.updatePushPreference`
> (self-service only, same shape as `updateAvatar`), and new
> `PATCH /api/student/settings/push` / `PATCH /api/teacher/settings/push`
> routes (`updatePushEnabledSchema` in `account.schema.ts`).
> `pushDispatchService.dispatchForNotifications` (TASK-2603) now skips a
> recipient outright when their `pushEnabled === false`, before ever
> reading their tokens — the in-app bell entry the caller already wrote
> is unaffected, only the OS-level push is suppressed.
> The actual affected components ended up being
> `components/student/student-settings-form.tsx` and
> `components/teacher/teacher-settings-form.tsx` — this project has no
> `*-settings-panel.tsx` files; the task description's filenames don't
> match anything in the codebase and were treated as a naming mismatch
> from an earlier planning pass, not a request to create parallel
> "panel" components alongside the existing "form" ones already wired
> into `student/settings`/`teacher/settings`.
> Each form gained a "Push notifications" card (a `Switch`, matching the
> other cards' style) that, on enabling, finally calls TASK-2601's
> `requestPushToken()` and TASK-2602's `syncPushToken()` — both were
> deliberately left unwired pending this exact call site (see their
> phase notes above) — before persisting the flag; disabling just PATCHes
> the flag, since there's no need to unregister the device (a later
> re-enable reuses the same registered token via `syncPushToken`'s
> upsert semantics). A failed `requestPushToken`/`syncPushToken` (denied
> permission, unsupported browser, missing VAPID key) surfaces an error
> and leaves the toggle off rather than persisting `true` with no working
> device behind it.
> Push copy strings (`push.title`/`description`/`enableLabel`, plus two
> new `errors.*` keys) added to both `studentDashboard.settings` and
> `teacherDashboard.settings` in `messages/en.json`/`ar.json` — this is
> genuinely a client-rendered next-intl string (the toggle's own label),
> unlike TASK-2603's server-generated push notification copy, which
> stays in `pushDispatchService`.
> Verification: added/extended `userRepository.test.ts`,
> `studentSettingsService.test.ts`, `teacherSettingsService.test.ts`,
> `pushDispatchService.test.ts` (opt-out cases), and new route tests for
> both `push/route.ts` files. No component-level tests exist for either
> settings form in this codebase (none did before this change either),
> so none were added. Could not run `npx vitest`/`npx tsc --noEmit`/`npx
> eslint`/`npx next build`/`npm run check-translations`/`npm run
> check-rtl` in this sandbox (no network access to install
> `node_modules`) — please run the full verification suite before
> merging. All four tasks in this phase (TASK-2601–2604) are now `Done`.
