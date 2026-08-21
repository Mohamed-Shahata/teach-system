# Future Roadmap (post-MVP)

Not implemented in the MVP; architecture is designed so these can be
added as new modules without rewriting existing code (see
`development/coding-rules.md` — Extensibility Rule).

- **Teacher subscriptions / course payments / student payments** — `course.enrollmentType` and `price` fields already exist; add a `payments` collection + provider integration (e.g. Stripe) behind a new `PaymentService`, extending `EnrollmentService.enroll()` rather than replacing it.
- **Custom domains & teacher branding** — `teacherProfiles.brandColor` reserved; add `customDomain` field + Vercel domain API integration.
- **Analytics** — new read-only aggregation service over existing collections; no schema changes required for basic analytics.
- **Notifications** — `notifications` collection + `notificationService` already ship a manual meeting-link push (Phase 6); Phase 20 (`docs/tasks/phase-20-notifications-automation.md`) makes it automatic (scheduled trigger) and adds a teacher-facing reminder.
- **Certificates** — generated from existing `enrollments.progress` data once `percent == 100`; new `CertificateService` + PDF generation.
- **Attendance / live classes** — new collections/modules; lesson `video.provider` union can extend to `"live"`.
- **AI educational tools** — new module calling an AI provider (pattern consistent with the author's other projects' AI-provider abstraction), isolated behind its own service.
- **Marketing tools / referral systems / email communication** — additive modules, no core schema changes expected.

## Explicit non-goals for MVP

Microservices, Kubernetes, complex event-driven architecture, advanced
caching layers, complex payment processing, advanced AI infrastructure —
see `development/coding-rules.md` "Do not overengineer".

## Extensibility review (TASK-1803)

A point-in-time check of three specific extensibility claims made
elsewhere in this doc/`ownership-model.md`, run once most feature
phases had actually landed (rather than trusting the original
day-one design intent).

- **Ownership model** (`architecture/ownership-model.md`) — confirmed
  ready. Its "Adding a new collection" checklist has already been
  exercised by every post-MVP collection added since (`reviews`,
  `teacherOfferings`/`subscriptions`/`subscriptionInvoices`,
  `lessonProgress`, `fcmTokens`) with no changes needed to the model
  itself — each just followed the same `teacherId` +
  `role == "admin" || teacherId == uid` shape. Attendance/live-classes
  (a new collection, per this doc's own roadmap entry) would follow
  the identical checklist.
- **`course.enrollmentType`** (`"free" | "paid"`) — confirmed ready,
  and already proven rather than just argued: Phase 29's teacher
  subscriptions landed as a parallel access path
  (`teacherOfferings`/`subscriptions`) rather than a third
  `enrollmentType` value — `courseService.hasActiveSubscriptionForCourse`
  and `assertStudentHasCourseAccess` (TASK-3204) check "enrolled OR
  actively subscribed" independently of the enum. Any future access
  model (e.g. a bundle/package purchase) can follow the same pattern
  without touching `enrollmentType` or its schema.
- **`question.type`** (`"multiple_choice" | "true_false"`,
  `lib/validation/quiz.schema.ts`) — **not** genuinely ready without a
  rewrite, unlike the two points above. Both existing types share one
  model end to end — `QuestionDoc.options`/`correctOptionIds` and
  `quizGrading.isAnswerCorrect`'s exact-set comparison — because
  `true_false` is really just a two-option `multiple_choice`. A
  free-response type (short answer, essay) doesn't fit that shape at
  all: it has no `options`/`correctOptionIds` to compare, and grading
  it isn't a data problem `isAnswerCorrect` can absorb — it needs
  either a teacher-facing manual-grading path (`quizAttemptService`/
  `ExamResultsPanel` already have one for stage-wide exams, Phase 21 —
  the closest existing precedent) or an AI-grading module (this doc's
  own "AI educational tools" entry). Adding such a type is a genuine,
  scoped follow-up task (new `QuestionDoc` fields, a non-`options`
  question-authoring UI, and a grading-path decision), not a same-shape
  enum extension — flagged here rather than silently treated as covered.
