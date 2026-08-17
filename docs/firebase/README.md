# Firebase Architecture

## Services used

- **Firebase Authentication** — email/password (MVP).
- **Firestore** (Native mode) — primary database.
- **Firebase Security Rules** — Firestore access control.
- **Firebase Admin SDK** — server-only, used in repositories and
  middleware for privileged reads/writes and session verification.
- **Firebase Cloud Messaging** — client-side push notifications
  (TASK-2601, Phase 26). Service worker at `public/firebase-messaging-sw.js`,
  client wiring in `lib/client/firebaseMessaging.ts`. Not yet wired into
  any UI — see that file's own doc comment and the Phase 26 task notes.

## Client vs Admin SDK usage

| Context | SDK | Purpose |
|---|---|---|
| Client components (auth forms) | Firebase Client SDK | sign-in/up, `onAuthStateChanged`, password reset |
| Middleware, Route Handlers, Server Components | Firebase Admin SDK | session verification, all Firestore reads/writes for owner data |

The client SDK is **not** used to read/write Firestore directly for
owner-owned collections in the MVP — all such access goes through the
server (Admin SDK), which keeps Security Rules as a pure defense-in-depth
layer rather than the primary access path, and avoids exposing Firestore
query shape/business logic to the client bundle.

## Admin SDK initialization (serverless-safe)

```ts
// lib/server/firebaseAdmin.ts
import { getApps, initializeApp, cert } from "firebase-admin/app";

function getAdminApp() {
  const apps = getApps();
  if (apps.length) return apps[0];
  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

export const adminApp = getAdminApp();
```

Guarded with `getApps().length` so repeated invocations in the same
serverless container (or hot reload in dev) don't re-initialize.

## Firestore indexes

Composite indexes required (declared in `firestore.indexes.json`,
deployed via `firebase deploy --only firestore:indexes`):

| Collection | Fields |
|---|---|
| courses | `teacherId asc, status asc` |
| courses | `teacherId asc, createdAt desc` |
| schedule | `teacherId asc, dayOfWeek asc` |
| schedule | `stageId asc, subjectId asc, dayOfWeek asc` |
| lessons | `courseId asc, order asc` |
| enrollments | `studentId asc, status asc` |
| enrollments | `teacherId asc, courseId asc` |
| quizAttempts | `studentId asc, quizId asc` |

## Security Rules

Full rules live in `firestore.rules` at the project root (TASK-601 plus
later feature phases). They currently cover `users`, `teacherProfiles`,
`educationStages`, `subjects`, `courses`, and `schedule`; later phases
extend the same pattern to `lessons`, `enrollments`, `quizzes`, `questions`, `quizAttempts`,
`files`, `payments`). Structure:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() {
      return request.auth != null;
    }
    function callerRole() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
    }
    function isAdmin() {
      return isSignedIn() && callerRole() == 'admin';
    }
    function isTeacher() {
      return isSignedIn() && callerRole() == 'teacher';
    }
    function isOwner(teacherId) {
      return isAdmin() || (isSignedIn() && callerRole() == 'teacher' && request.auth.uid == teacherId);
    }

    match /users/{uid} {
      allow read: if isAdmin() || (isSignedIn() && request.auth.uid == uid);
      allow create: if false; // only the Admin SDK creates users — no public sign-up
      allow update: if (isAdmin() || (isSignedIn() && request.auth.uid == uid))
        && request.resource.data.role == resource.data.role
        && request.resource.data.createdBy == resource.data.createdBy; // role/createdBy immutable
      allow delete: if false;
    }

    match /teacherProfiles/{teacherId} {
      allow read: if resource.data.isPublic == true || isOwner(teacherId);
      allow write: if isOwner(teacherId);
    }

    match /educationStages/{stageId} { allow read: if true; allow write: if isAdmin(); }
    match /subjects/{subjectId}      { allow read: if true; allow write: if isAdmin(); }

    match /courses/{courseId} {
      allow read: if resource.data.status == 'published' || isOwner(resource.data.teacherId);
      allow create: if isTeacher() && request.resource.data.teacherId == request.auth.uid;
      allow update, delete: if isOwner(resource.data.teacherId)
        && request.resource.data.teacherId == resource.data.teacherId; // ownership can't be reassigned
    }

    // lessons, schedule, enrollments, quizzes, questions, files, payments
    // follow the same isOwner(resource.data.teacherId) pattern, added in
    // their own phases; enrollments/payments additionally check
    // studentId == request.auth.uid for student-scoped reads/writes.
  }
}
```

Since the MVP routes almost all Firestore access through the Admin SDK on
the server (which bypasses rules), these rules exist primarily as a
safety net against future direct-client-access features and must be kept
in sync with the service-layer authorization logic
(`lib/auth/guards.ts`) and the repository-layer scoping helpers
(`lib/server/repositories/base.ts`, TASK-602).

## Environment variables

See `deployment/environment-variables.md` for the full list.

## Project

Firebase project id: `teach-system-601ce` (Auth + Firestore enabled).
Credentials live only in local `.env.local` / Vercel env vars — never in
the repo (see TASK-104).
