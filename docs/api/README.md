# API Conventions

All endpoints live under `app/api/**/route.ts`. Route handlers are thin:
verify session → validate body (Zod) → call a service → map result/error.
No Firestore/Cloudinary calls in route handlers directly.

## Response shape

Success:
```json
{ "course": { "...": "..." } }
```

Error:
```json
{ "error": { "code": "FORBIDDEN", "messageKey": "errors.forbidden" } }
```

## Endpoints

> Rewritten during the TASK-1802 audit (previously headed "Endpoints
> (MVP)" and listed 24 routes against 76 actual route files — stale
> since roughly the early feature phases). Grouped by area, in
> `docs/tasks/` phase order. The `Auth` column follows this codebase's
> path convention: an `/admin/*` path is Admin-only, `/teacher/*` is
> teacher-only, `/student/*` is student-only; a bare resource path
> (`/api/courses`, `/api/payments`, ...) means the role/ownership check
> happens inside the service layer instead of the path, per
> `authorization/README.md` — see each linked service for the exact
> rule. Public routes (no `requireSession()`) are marked `public`.

### Auth

| Method | Path | Purpose | Auth |
|---|---|---|---|
| POST | `/api/auth/session` | exchange Firebase ID token for a session cookie | public |
| POST | `/api/auth/resolve-login` | resolve an identifier (email/username) to a login email | public |
| POST | `/api/auth/logout` | clear the session cookie | authenticated |

### Admin — accounts, teachers, students

| Method | Path | Purpose | Auth |
|---|---|---|---|
| POST | `/api/admin/accounts` | create a teacher or student account | admin |
| GET | `/api/admin/teachers` | list all teachers | admin |
| GET/PATCH | `/api/admin/teachers/[teacherId]` | read/update one teacher's profile | admin |
| PATCH | `/api/admin/teachers/[teacherId]/permissions` | toggle a teacher's granted permissions | admin |
| GET | `/api/admin/teachers/[teacherId]/reviews` | reviews left for one teacher, for moderation (TASK-2704) | admin |
| GET | `/api/admin/students` | list all students (optionally scoped to one teacher, TASK-2403) | admin |
| GET/PATCH | `/api/admin/students/[studentId]` | read/update one student | admin |
| PATCH | `/api/admin/reviews/[reviewId]` | moderate a review (`hidden` flip only, TASK-2704) | admin |
| POST | `/api/admin/settings/password-reset-link` | generate a password-reset link for any account | admin |

### Admin — center configuration

| Method | Path | Purpose | Auth |
|---|---|---|---|
| GET/PATCH | `/api/admin/settings` | center-wide settings (name, branding) | admin |
| PATCH | `/api/admin/settings/avatar` | update center logo | admin |
| GET/POST | `/api/admin/education-stages` | list/create grade levels | admin |
| PATCH/DELETE | `/api/admin/education-stages/[stageId]` | edit/delete a grade level | admin |
| GET/POST | `/api/admin/subjects` | list/create subjects | admin |
| PATCH/DELETE | `/api/admin/subjects/[subjectId]` | edit/delete a subject | admin |

### Admin — dashboard & analytics (Phase 19)

| Method | Path | Purpose | Auth |
|---|---|---|---|
| GET | `/api/admin/stats` | `systemStats/global` denormalized counters | admin |
| GET | `/api/admin/analytics` | course/enrollment/revenue analytics overview | admin |
| GET | `/api/admin/courses` | center-wide read-only course list (TASK-2401) | admin |
| GET | `/api/admin/payments` | center-wide payments view (reuses teacher payments query, Admin bypass) | admin/teacher |

### Admin — teacher subscriptions & offerings

> See the TASK-1802 note in `tasks/phase-18-mvp-finalization.md` and
> the new entries in `database/collections.md` — this system exists
> and works, but as of this audit still needs its own `tasks/` phase
> file, `firestore.rules` entries, and UI (see the new `phase-29`
> note being opened alongside this doc pass).

| Method | Path | Purpose | Auth |
|---|---|---|---|
| GET | `/api/admin/offerings` | list all teacher offerings (subject+stage+price) | admin |
| PATCH/DELETE | `/api/admin/offerings/[offeringId]` | edit/remove one offering | admin |
| GET/POST | `/api/admin/teachers/[teacherId]/offerings` | list/create offerings for one teacher | admin |
| GET/POST | `/api/admin/students/[studentId]/subscriptions` | list/create a student's subscriptions | admin |
| DELETE | `/api/admin/subscriptions/[subscriptionId]` | cancel a subscription | admin |
| GET/POST | `/api/admin/subscriptions/[subscriptionId]/invoices` | list invoices / generate this period's invoice | admin |
| GET/PATCH | `/api/admin/subscription-invoices/[invoiceId]` | read / manually review (confirm-reject) one invoice | admin |
| POST | `/api/admin/subscription-invoices/generate` | bulk-generate the current period's invoices | admin |
| GET | `/api/teacher/subscription-invoices` | a teacher's own students' invoices | teacher |
| GET | `/api/student/subscription-invoices` | a student's own invoice history | student |

### Courses & lessons (Phases 8–9)

| Method | Path | Purpose | Auth |
|---|---|---|---|
| GET/POST | `/api/courses` | list/create the signed-in teacher's courses | teacher |
| GET/PATCH/DELETE | `/api/courses/[courseId]` | read/update/delete one course | teacher (owner), Admin, or enrolled student (read) |
| GET/POST/PATCH | `/api/courses/[courseId]/lessons` | list/create/reorder lessons | teacher (owner, write) / student (enrolled, read) |
| PATCH/DELETE | `/api/lessons/[lessonId]` | edit/delete a lesson | teacher (owner) |
| PATCH | `/api/lessons/[lessonId]/progress` | report watch progress (TASK-2502) | student (enrolled) |
| GET | `/api/courses/[courseId]/students` | enrolled students + per-lesson progress (TASK-2504) | teacher (owner) |

### Enrollment & payments (Phase 11)

| Method | Path | Purpose | Auth |
|---|---|---|---|
| GET | `/api/enrollments` | the signed-in student's own enrollments | student |
| GET/PATCH | `/api/enrollments/[enrollmentId]` | read one enrollment / mark a lesson complete | owning student, owning teacher, or Admin (read); student (write) |
| GET/POST | `/api/payments` | own payment history / submit a manual payment (`vodafone_cash`/`bank_transfer` only — `card`/`fawry` blocked, TASK-1105 `Blocked`) | student |
| GET | `/api/payments/[paymentId]` | read one payment | owning student, owning teacher, or Admin |
| GET | `/api/teacher/payments` | a teacher's pending/all manual payments queue | teacher, or admin (via `scopeToTeacher` bypass) |
| PATCH | `/api/teacher/payments/[paymentId]` | confirm/reject a manual payment (triggers enrollment) | owning teacher or Admin |

> No online-payment (`card`/`fawry`) creation/webhook routes exist —
> `POST /api/courses/[courseId]/pay` and `POST /api/payments/webhook`
> are `TASK-1105`, `Blocked` on a gateway-choice ADR. No direct
> enrollment-creation route either: enrollment is always a side effect
> of a payment reaching `succeeded`/`confirmed`.

### Quizzes & exams (Phases 12, 21)

| Method | Path | Purpose | Auth |
|---|---|---|---|
| GET/POST | `/api/quizzes` | list/create quizzes (course-scoped or standalone stage-wide exams) | teacher |
| GET | `/api/exams` | student-facing list of standalone stage-wide exams (TASK-2103) | student |
| GET/PATCH/DELETE | `/api/quizzes/[quizId]` | read/update/delete one quiz | teacher (owner) / student (read, published only) |
| PATCH | `/api/quizzes/[quizId]/status` | publish/unpublish a quiz | teacher (owner) |
| GET/POST/PATCH | `/api/quizzes/[quizId]/questions` | list/create/reorder questions | teacher (owner, write) / student (read, no answers) |
| PATCH/DELETE | `/api/questions/[questionId]` | edit/delete one question | teacher (owner) |
| GET/POST | `/api/quizzes/[quizId]/attempts` | list attempts / submit an attempt | teacher (owner, read) / student (enrolled, both) |
| PATCH | `/api/quizzes/[quizId]/attempts/[attemptId]/grade` | manually grade an attempt (TASK-2102) | teacher (owner) |
| GET/POST | `/api/courses/[courseId]/quizzes` | course-scoped quiz list/create | teacher (owner) / student (read, published only) |
| GET | `/api/exams/[examId]/export` | export exam results as PDF/xlsx (TASK-2801) | teacher (owner) |

### Files & uploads (Phase 13)

| Method | Path | Purpose | Auth |
|---|---|---|---|
| POST | `/api/uploads/sign` | get a signed Cloudinary upload | teacher |
| GET/POST | `/api/files` | list / persist uploaded file metadata | teacher |
| DELETE | `/api/files/[fileId]` | delete a file | teacher (owner) |

### Teacher self-service

| Method | Path | Purpose | Auth |
|---|---|---|---|
| GET/POST/PATCH/DELETE | `/api/teacher/schedule` | manage recurring weekly schedule slots | teacher |
| POST | `/api/teacher/schedule/[scheduleId]/notify` | manually broadcast a meeting link for one slot | teacher (owner) |
| GET/POST | `/api/teacher/students` | teacher's students overview / create a student | teacher |
| GET | `/api/teacher/students/[studentId]` | one student's detail (teacher-scoped) | teacher |
| GET/PATCH | `/api/teacher/settings` | teacher's own account settings | teacher |
| PATCH | `/api/teacher/settings/avatar` | update teacher avatar | teacher |
| POST | `/api/teacher/settings/password-reset-link` | generate own password-reset link | teacher |
| PATCH | `/api/teacher/settings/push` | toggle push-notification preference (TASK-2604) | teacher |
| GET | `/api/teacher/notifications` | teacher's own notifications | teacher |
| PATCH | `/api/teacher/notifications/[notificationId]` | mark one notification read | teacher (owner) |

### Student self-service

| Method | Path | Purpose | Auth |
|---|---|---|---|
| GET/PATCH | `/api/student/settings` | student's own account settings | student |
| PATCH | `/api/student/settings/avatar` | update student avatar | student |
| POST | `/api/student/settings/password-reset-link` | generate own password-reset link | student |
| PATCH | `/api/student/settings/push` | toggle push-notification preference (TASK-2604) | student |
| GET | `/api/student/notifications` | student's own notifications | student |
| PATCH | `/api/student/notifications/[notificationId]` | mark one notification read | student (owner) |
| GET | `/api/student/teachers` | derived "my teachers" list (TASK-2301) | student |
| GET/PUT | `/api/teachers/[teacherId]/reviews/me` | read/submit-or-edit the student's own review of a teacher (TASK-2702) | student (must have a non-cancelled enrollment with that teacher) |

### Push notifications (Phase 26)

| Method | Path | Purpose | Auth |
|---|---|---|---|
| GET/POST | `/api/notifications/fcm-tokens` | list / register the caller's own FCM device tokens | authenticated |
| DELETE | `/api/notifications/fcm-tokens/[tokenId]` | remove one device token | authenticated (owner) |

### System

| Method | Path | Purpose | Auth |
|---|---|---|---|
| GET | `/api/cron/class-notifications` | scheduled trigger — auto-fires meeting-link notifications (Phase 20) | Vercel Cron (shared-secret header, not a user session) |

Full request/response schemas live alongside each Zod schema in
`lib/validation/*` and are considered the authoritative contract.

Public-facing pages (teacher profile, course landing pages) are
server-rendered directly from `publicService`/`reviewService`
(`app/[locale]/(public)/**`) rather than being fetched through a
`/api/public/*` JSON endpoint — there is no such endpoint in this
codebase; treat any reference to one (including in older docs) as
stale.
