# Phase 12 — Quiz / Exam System

## TASK-1201: Quiz & question repository/service
- Description: CRUD for quizzes/questions; `correctOptionIds` never returned to student-facing reads.
- Dependencies: TASK-901
- Affected modules: `lib/validation/quiz.schema.ts`, `lib/server/repositories/quizRepository.ts`, `lib/server/repositories/questionRepository.ts`, `lib/server/services/quizService.ts`
- Status: Done

> Followed `lessonRepository`/`lessonService` (TASK-901) shape closely —
> `quizzes` and `questions` are separate collections/repositories per
> `database/collections.md`, joined through `quiz.questionIds` the same
> way a course holds `lessonOrder`. Teacher/Admin CRUD is
> `assertTeacherOwnsResource`-gated (TASK-602's ownership pattern);
> creating a quiz reuses `courseService.getCourse` for the course-
> ownership check rather than duplicating it, same as `lessonService`.
>
> `correctOptionIds`: kept on the full `QuestionDoc` (teacher/builder
> reads use it), but `questionRepository.toPublicQuestion` strips it,
> and `quizService.listQuestionsForStudent` is the *only* path that
> calls it — it also refuses to serve a `draft` quiz's questions at all
> (`NotFoundError`, not just a stripped read), and orders the result by
> `quiz.questionIds` rather than by document-insertion order. No route
> wires this up yet — deferred to TASK-1202 (attempt submission), which
> needs the same student-facing read on the way to grading, so putting
> the `GET` route there avoids two endpoints doing overlapping work.
>
> Publishing (`setQuizStatus`) rejects an empty quiz (`questionIds.length
> === 0`) — not in the task description verbatim, but implied by
> `features/quizzes.md`'s "let students take quizzes" story: a
> published quiz with nothing to answer isn't a real state to allow.
> `reorderQuestions` mirrors `lessonService.reorderLessons`'s full-
> replace-only contract (same id set required, no partial reconciliation).
> `deleteQuiz` cascades to delete every question under it first, since
> Firestore has no cascading delete and an orphaned `questions` doc with
> a dangling `quizId` would otherwise leak.
>
> Unit tests in `lib/server/services/quizService.test.ts` (mocked
> repositories, same pattern as `lessonService.test.ts`) — could not
> run `npx vitest`/`npx tsc` here (npm registry 403 in this sandbox, see
> TASK-1106's note), review before trusting. No i18n/RTL/theme surface —
> service layer only, no new client-visible strings; `quiz-builder`
> (TASK-1203) and `quiz-taking` (TASK-1204) UIs are what will need that
> pass.

## TASK-1202: Quiz attempt submission & grading service
- Description: Server-side scoring against stored correct answers; writes `quizAttempts`.
- Dependencies: TASK-1201, TASK-1101
- Affected modules: `lib/validation/quiz.schema.ts`, `lib/server/repositories/quizAttemptRepository.ts`, `lib/server/services/quizAttemptService.ts`
- Status: Done

> `quizAttempts` is its own repository/service, not folded into
> `quizService` — it's a student's history of attempts (can retake, so
> `(studentId, quizId)` is one-to-many, unlike enrollment's one-to-one
> pair), not a teacher-owned CRUD resource, so it didn't fit
> `quizService`'s `loadOwnedQuiz`-shaped methods.
>
> `submitAttempt` gates on: quiz exists and is `published` (else
> `NotFoundError`, same "don't leak draft existence" reasoning as
> `quizService.listQuestionsForStudent`), then `assertStudentEnrolled`
> against `enrollmentRepository.findByStudentAndCourse(session.uid,
> quiz.courseId)` (TASK-1101's lookup + TASK-1101's own guard, reused
> rather than reinvented) — a non-enrolled or cancelled-enrollment
> student gets `ForbiddenError`. Grading pulls the *full* `QuestionDoc`s
> (with `correctOptionIds`) via `questionRepository.findByIds`, server-
> side only — the client's `answers` are just `{ questionId,
> selectedOptionIds }`, no score field exists on the input schema at
> all, matching `features/quizzes.md`'s "client cannot submit a score
> directly."
>
> Grading model (MVP, not in the task description verbatim — filled in
> from `features/quizzes.md`'s "see my score after submitting"): each
> question is right only if the submitted option-id set exactly equals
> `correctOptionIds` (no partial credit within a question), and the
> quiz score is `correctCount / quiz.questionIds.length * 100`, rounded.
> An `answers` entry for a question id not in `quiz.questionIds` is
> silently ignored — ignored, not rejected, so extra/stale ids in the
> client payload can't manipulate the denominator; a missing answer for
> an in-quiz question just counts as wrong, not an error.
>
> `listAttemptsForQuiz` (teacher/Admin) checks quiz ownership via
> `assertTeacherOwnsResource` before listing — same ownership check
> `quizService` uses, so a teacher can't list another teacher's quiz
> attempts by attempt id guessing... except `getAttempt` doesn't
> re-derive ownership from the quiz at all, it trusts `attempt.teacherId`
> (denormalized at submit time from `quiz.teacherId`), which is safe
> only because that field is never client-writable and is set once at
> creation — same denormalization pattern `paymentRepository` uses for
> `teacherId`.
>
> No API routes yet — deferred to TASK-1204 (quiz-taking UI), which
> needs `GET` (questions, via TASK-1201's `listQuestionsForStudent`)
> and this task's `submitAttempt` behind the same page, so wiring both
> at once avoids two route-only commits.
>
> Unit tests in `lib/server/services/quizAttemptService.test.ts` (mocked
> repositories) cover full/partial/missing/extraneous-answer scoring,
> the draft/missing-quiz/not-enrolled/cancelled/non-student rejections,
> and `getAttempt`'s three-way access check — could not run
> `npx vitest`/`npx tsc` here (same npm registry 403 as TASK-1106/1201),
> review before trusting.

## TASK-1203: Quiz builder UI (teacher)
- Dependencies: TASK-1201, TASK-204
- Status: Done

> Routes: `POST/GET /api/courses/[courseId]/quizzes`,
> `GET/PATCH/DELETE /api/quizzes/[quizId]`,
> `PATCH /api/quizzes/[quizId]/status` (publish toggle, separate shape
> from a field update — same reasoning as the lesson-order PATCH),
> `GET/POST/PATCH /api/quizzes/[quizId]/questions` (list/create/
> reorder), `PATCH/DELETE /api/questions/[questionId]` — all thin
> wrappers over `quizService`, mirroring `app/api/courses/[courseId]/lessons`
> and `app/api/lessons/[lessonId]` exactly, each with a route test
> (mocked service, same pattern as the lesson route tests).
>
> UI: `QuizManager` (course detail page, list/create/edit/delete a
> course's quizzes, publish/unpublish `Switch`, link to a quiz's
> question builder) and `QuestionManager` (own page at
> `teacher/quizzes/[quizId]`, question CRUD with option editing and
> correct-answer selection via `Checkbox`, multi-select for
> `multiple_choice` and forced single-select for `true_false`).
> Reordering questions uses up/down buttons rather than
> `LessonManager`'s drag-and-drop — a quiz's question order matters far
> less to the teacher workflow than a course's lesson order — but
> calls the same full-replace `PATCH .../questions` contract either way.
>
> i18n: `teacherDashboard.quizzes` (+ nested `.questions`) added to
> both `messages/en.json` and `messages/ar.json`, key-parity checked
> against each other. Could not run `npx tsc`/`npx vitest` or
> `scripts/check-translations.ts`/`check-rtl-ltr.ts` here (same npm
> registry 403 as TASK-1201/1202/1106) — review before trusting,
> especially the new pages' RTL/theme surface.

## TASK-1204: Quiz-taking UI (student) & results view
- Dependencies: TASK-1202, TASK-204
- Affected modules: `lib/server/services/quizService.ts`, `app/api/quizzes/[quizId]/attempts/route.ts`, `app/[locale]/(protected)/student/courses/[courseId]/quizzes/[quizId]/page.tsx`, `components/quiz/quiz-taker.tsx`, `messages/en.json`, `messages/ar.json`
- Status: Done

> `quizService.getQuiz` extended to double as the student-facing single-
> quiz read (published + enrolled, via a new `loadQuizForStudent`
> helper using `enrollmentRepository` + `assertStudentEnrolled`) —
> same "one endpoint, role-branched service method" shape already used
> by `paymentService.getPayment`/enrollment's single-resource reads,
> rather than a new route per audience. `listQuestionsForStudent`
> (TASK-1202) is unchanged and reused as-is.
>
> New `POST/GET /api/quizzes/[quizId]/attempts` — `POST` submits an
> attempt via `quizAttemptService.submitAttempt` (grading unchanged
> from TASK-1202); `GET` returns the signed-in student's own attempt
> history (`listMyAttempts`) for the results view. A teacher/Admin
> "all attempts at this quiz" grading route was deliberately **not**
> added here — this task is the student-facing half only; revisit
> under `teacher/quizzes/[quizId]/attempts` if/when a grading UI is
> scheduled.
>
> UI: `QuizTaker` (client component) renders each question — `Radio`
> (single-select) for `true_false`, `Checkbox` (multi-select) for
> `multiple_choice`, matching `QuestionManager`'s `toggleCorrect`
> semantics on the teacher side — and posts answers to the attempts
> route on submit. Past attempts are shown as score badges with a
> "retake" action (a student may retake per `quizAttemptRepository`'s
> own doc comment); no client code ever fetches the raw
> `listQuestions` (teacher) endpoint, so `correctOptionIds` never
> reaches the browser.
>
> Page at `student/courses/[courseId]/quizzes/[quizId]/page.tsx` per
> `architecture/folder-structure.md`. **Not yet linked from student
> navigation** — there's no `student/courses/[courseId]/page.tsx` yet
> and the dashboard's course cards aren't clickable (TASK-1103 note),
> so this page is only reachable by direct URL for now. Revisit once a
> student course-detail page lands.
>
> i18n: new `studentQuiz` namespace in both `messages/en.json` and
> `messages/ar.json`, key-parity verified. Tests: `quizService.test.ts`
> extended for the student branch of `getQuiz` (enrolled/published/
> not-enrolled/draft cases); new
> `app/api/quizzes/[quizId]/attempts/route.test.ts`. No component test
> for `QuizTaker` — matches the rest of the codebase, which has no
> client-component tests (only services/routes). Could not run
> `npx vitest`/`npx tsc`/`check-translations`/`check-rtl` here — no
> `node_modules` and the npm registry returns 403 in this sandbox, the
> same limitation already noted on TASK-601/402/603/1106/1201-1203;
> `check-translations`'s parity check was instead done manually
> (`python3 -m json.tool` + a flatten-keys diff) and the `rtl-ltr`
> physical-property patterns were grepped by hand across the new files
> — review before trusting, especially the actual build/typecheck.
