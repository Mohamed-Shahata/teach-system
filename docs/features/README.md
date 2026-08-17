# Features

One document per feature area, each covering: purpose, user stories,
data touched, authorization rules, i18n/RTL notes, and edge cases.

- `authentication.md`
- `teacher-dashboard.md`
- `courses.md`
- `lessons.md`
- `schedule.md`
- `students.md`
- `enrollment.md`
- `payments.md`
- `quizzes.md`
- `files.md`
- `public-pages.md`
- `admin-dashboard.md`
- `push-notifications.md`
- `teacher-reviews.md`
- `exam-results-export.md`
- `subscriptions.md`
- `notifications.md`
- `teacher-profile.md`

Each corresponds 1:1 to a phase in `tasks/README.md`, with the
exception of most post-MVP extension batches (Phases 20, 22, 23, 24,
25), which are documented as extension notes inside the feature file
they build on rather than getting a dedicated file each. Phases 26–28
(push notifications, teacher reviews, exam export) each got their own
file instead, since none of them is a natural extension of an
existing feature area. Phase 29 (subscriptions) likewise now has its
own file (`subscriptions.md`, TASK-2910) covering `teacherOfferings`,
`subscriptions`, and `subscriptionInvoices`. Phase 30's clickable-links
work (TASK-3002) landed as a section inside `schedule.md` (the only
notification types that existed at the time were schedule-derived),
but TASK-3003's generic `audit` trail is genuinely its own thing —
`notifications.md` now covers the `notifications` collection as a
whole, including the two schedule-derived types that still live in
`schedule.md`'s own section.
