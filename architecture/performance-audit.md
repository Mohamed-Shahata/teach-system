# Performance Audit (TASK-3601)

> Read-only investigation. No network/Firestore-emulator access in this
> sandbox (same constraint noted across recent sessions — see
> `docs/tasks/README.md`'s history log), so this is a **static code
> review** measuring Firestore read *counts and shapes* from the
> repository/service source, not live wall-clock latency or a real
> production read-count trace. Findings are ranked by user-facing
> impact and how directly fixable they are; TASK-3602–3604 should
> re-validate against real Vercel/Firestore numbers once available,
> per this phase's own intro note.

## Method

Reviewed every service under `lib/server/services/` reachable from a
dashboard load, the student course/lesson player, and Phase 33's
analytics aggregations (the three areas this task calls out), grepping
for `.get()`/`.getAll()`/`.collection(...).get()` call sites and
checking whether each sits inside a loop over a prior query's results
(the N+1 shape) versus a single batched/parallel read.

## Findings, ranked by impact

### 1. `studentService.getCourseStudentsProgress` — genuine N+1 (highest impact)

`lib/server/services/studentService.ts` (TASK-2504, mounted on every
teacher's course detail page via `CourseStudentsPanel`): for each
enrolled student, calls
`lessonProgressRepository.listByStudentForLessons(studentId, lessonIds)`
inside `enrollments.map(async (enrollment) => ...)`. That repository
method itself is already efficient (a single `adminDb.getAll(...refs)`
batched read for one student's lessons), but it's invoked **once per
enrolled student**, so total round-trips scale as O(active students on
that course) — a 40-student course issues 40 separate `getAll` calls
where the data (all `lessonProgress` docs for those `(studentId,
lessonId)` pairs) could be fetched in one batched `getAll` across every
pair, or one `where("studentId", "in", chunk)` query per lesson if a
composite index existed. Parallelized via `Promise.all` today, so it
doesn't serialize latency, but it's still N Firestore round-trips
(and N reads-worth of billing) for what should be closer to 1.
**Recommended for TASK-3603**: flatten to a single `getAll` over the
full `(studentId, lessonId)` cross product, built once outside the
per-enrollment map.

### 2. Reference-data (`subjects`/`educationStages`) re-read on every request — no caching anywhere

`subjectRepository.list()` / `educationStageRepository.list()` are
called fresh, with no caching layer, from at least seven separate
services: `centerConfigService`, `teacherDirectoryService`,
`studentScheduleService`, `analyticsService`, `adminCourseOverviewService`,
`adminPaymentsService`, `studentManagementService`. Every dashboard/
directory/schedule/analytics page load re-reads both collections in
full, even though they're genuinely near-static (an Admin edits them
rarely, via `center-config-manager.tsx`). This is exactly the
candidate TASK-3602 already names. **Recommended for TASK-3602**:
`unstable_cache` (or a lightweight in-memory cache, given the
Vercel-free-tier constraints already noted elsewhere in this project)
keyed on nothing (whole-collection, small dataset), invalidated
on `center-config-manager`'s create/update/delete calls.

### 3. `adminOverviewService.getRecentActivity` / `adminUnsubscribedStudentsService.list` — unbounded full-collection scans for small results

Both call `userRepository.listByRole("student")` — every student
document, unfiltered — to either slice the newest 5
(`adminOverviewService`, TASK-3301) or filter down to the unsubscribed
subset (`adminUnsubscribedStudentsService`, TASK-3403).
`adminOverviewService` also pulls **every** course payment and **every**
subscription invoice (`paymentService.listForTeacher`/
`subscriptionInvoiceService.listForTeacher` with no admin-side limit)
just to keep the newest 5. Not N+1 (each is a single query), but reads
scale linearly with total students/payments regardless of how small
the displayed result is — the first collections to become genuinely
expensive as the center grows. **Recommended for TASK-3602/3603**: add
a `createdAt`-descending `.limit()` at the query level for the
overview's "recent" lists (student/payment/invoice collections are
already sorted client-side after a full fetch — pushing that `orderBy`
+ `limit` into the Firestore query removes the full scan entirely);
`adminUnsubscribedStudentsService` genuinely needs the full student set
(it's a completeness check, not a "recent N" list) so is lower priority
for this one but worth a `systemStats`-style denormalized counter if
the student base grows large enough to matter.

### 4. Phase 33 analytics aggregations (`analyticsRepository`) — already reasonably batched, not a priority finding

Explicitly called out in this task's description as a suspect (cross-
collection scans), so reviewed closely: `activeStudentCountsByTeacher`/
`activeStudentCountsBySubject`/`activeStudentIds` each issue exactly
two range-filtered collection queries (enrollments + subscriptions) in
parallel, plus — for the subject breakdown only — a chunked (`CHUNK =
30`) batched `in` query to resolve course→subject, the same pattern
`teacherProfileRepository.findByIds` already uses elsewhere in the
codebase. No per-row reads found. `analyticsService.getOverview`
parallelizes all nine of its `analyticsRepository`/other-repository
calls via two `Promise.all` batches. This area is **already in good
shape** — no action needed beyond re-confirming with real read-count
numbers once available (per this task's own caveat above).

### 5. Enrollment/course-join reads (`enrollmentService.listMyActiveCoursesWithProgress`, `studentService.getCourseStudentsProgress`'s own course reads) — already batched

Both use `courseRepository.findByIds`/`userRepository.findByIds`
(batched multi-get) rather than a per-row `findById` loop. No action
needed.

## Not investigated (out of this task's read-only scope)

Actual latency numbers, cold-start behavior, and Vercel function
execution time — all need a real deployed environment / Vercel
analytics, unavailable in this sandbox. TASK-3602's caching work and
TASK-3604's client-side fetch audit should re-derive priority against
real numbers once accessible, per this phase's intro note; the ranking
above is a reads-and-shape-based proxy, not a measured one.
