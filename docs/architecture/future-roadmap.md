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
