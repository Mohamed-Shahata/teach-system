# Security

Security is treated as a core architectural requirement, prioritized
above all other concerns per the project's engineering principles.

## Threat model summary

| Threat | Mitigation |
|---|---|
| Teacher A reading/modifying Teacher B's data | `teacherId` scoping enforced at service, repository, and Firestore Security Rules layers (see `architecture/ownership-model.md`) |
| Student accessing unpurchased/unenrolled course content | `assertStudentHasCourseAccess` (`lib/auth/guards.ts`) gates lesson content on an active enrollment OR subscription (`courseService.hasActiveSubscriptionForCourse`), checked in `lessonService` before returning video/file data; never inferred from client state |
| Student tampering with quiz answers/score | Score always computed server-side from stored `correctOptionIds`; client never receives correct answers before submission |
| Client sending a forged `role`/`teacherId`/`isAdmin` | Ignored; server derives identity from verified session only |
| Secrets leaking to client bundle | `CLOUDINARY_API_SECRET`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL` are never in `NEXT_PUBLIC_*` vars; verified by `scripts/check-env-exposure.ts` (Phase 15 task) |
| Session hijacking | `HttpOnly`, `Secure`, `SameSite=Lax` session cookie; 5-day expiry + refresh-token revocation on logout (`adminAuth.revokeRefreshTokens`) |
| Injection via unvalidated input | All external input validated with Zod server-side, regardless of client-side validation |
| Enumeration of other users' data via IDs | List/get methods for owner-owned collections always additionally filter by `teacherId`/`studentId` — a guessed document ID alone is insufficient |

## Firestore Security Rules

See `firebase/security-rules.md` (within `firebase/README.md`) — the
non-bypassable enforcement layer, kept in sync with service-layer logic.

## Validation

See `security/validation.md`.

## Error handling

See `security/error-handling.md`.
