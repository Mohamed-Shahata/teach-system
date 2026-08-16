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
- Status: Not Started

## TASK-2602: Store device tokens per user
- Description: New subcollection `users/{uid}/fcmTokens/{tokenId}` (or an array field) so a user can have multiple registered devices/browsers; token refresh and cleanup on `onTokenRefresh`/expiry.
- Dependencies: TASK-2601
- Affected modules: `docs/database/collections.md`, `firestore.rules`
- Status: Not Started

## TASK-2603: Server-side push dispatch on notification write
- Description: Wherever the app writes to `notifications` (manual send today, Phase 20's automated triggers once shipped), also call the Firebase Admin SDK's messaging `send`/`sendEachForMulticast` against the recipient's tokens from TASK-2602. Failed/expired tokens get pruned.
- Dependencies: TASK-2602
- Affected modules: `lib/server/services/notificationService.ts`
- Status: Not Started

## TASK-2604: Notification preferences
- Description: Simple per-user toggle (settings page) for whether push is enabled, separate from the in-app bell which always stays on — some users may want the badge but not the OS-level interruption.
- Dependencies: TASK-2603
- Affected modules: `components/student/settings-panel.tsx`, `components/teacher/settings-panel.tsx`
- Status: Not Started
