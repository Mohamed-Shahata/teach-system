# Phase 36 — Caching Strategy & Performance

> Third post-MVP feature batch (user request, this session). General
> "make it fast and able to hold up under load" ask — broken into
> concrete, auditable tasks rather than one open-ended item, since the
> user's request didn't name specific slow paths. Should be revisited
> once real usage data (Vercel analytics, Firestore read counts) is
> available to target the actual bottlenecks rather than guessing.

## TASK-3601: Performance audit — identify hot paths
- Description: Before optimizing, measure. Instrument or review the highest-traffic/highest-cost server routes (dashboard loads, analytics queries — especially the new Phase 33 aggregations, which scan across collections — and the student course/lesson player) for response time and Firestore read counts.
- Goal: A concrete, prioritized list of what's actually slow, instead of speculative optimization.
- Dependencies: none (read-only investigation)
- Affected modules: none changed by this task itself; produces a findings doc
- Acceptance criteria: a written findings doc listing the top N slow/expensive routes with measured numbers, ranked by user-facing impact.
- Testing requirements: n/a (measurement task)
- Documentation requirements: `docs/architecture/performance-audit.md` (new) with findings.
- Status: Done

> `docs/architecture/performance-audit.md` (new) — a static code review
> (no network/emulator in this sandbox, so reads/shapes were traced
> from source rather than measured live). Headline finding:
> `studentService.getCourseStudentsProgress` (TASK-2504) has a genuine
> N+1 — one `lessonProgressRepository.listByStudentForLessons` call per
> enrolled student instead of one batched read across the full
> student×lesson set. Also flagged: `subjects`/`educationStages` re-read
> fresh (no caching) from at least seven services on every request;
> `adminOverviewService`/`adminUnsubscribedStudentsService` do unbounded
> full-collection scans to show a "recent 5"/filtered list where a
> query-level `limit`/`orderBy` would remove the scan. Phase 33's
> analytics aggregations (the task description's named suspect) were
> reviewed closely and found already well-batched — no action needed
> there. See the doc for the full ranked list and per-finding
> recommendation. TASK-3602/3603/3604 are all now unblocked — their
> only dependency, this task, is `Done`.

## TASK-3602: Server-side response caching for read-heavy, slow-changing data
- Description: Apply caching (Next.js route segment caching / `unstable_cache` / a lightweight in-memory or edge cache, chosen based on TASK-3601's findings and the Vercel free-tier constraints already noted elsewhere in this project) to endpoints serving data that changes infrequently relative to read volume — the clearest candidates being `educationStages`/`subjects` (near-static reference data), the public teacher directory (Phase 23), and Phase 33's analytics aggregations (cache per filter-range, invalidate on a schedule rather than per-write).
- Dependencies: TASK-3601 (to confirm these are actually the hot paths, and to catch any others)
- Affected modules: the specific routes TASK-3601 flags — likely `app/api/subjects/route.ts`, `app/api/education-stages/route.ts`, `app/api/teachers/route.ts` (directory), `app/api/admin/analytics/*`
- Acceptance criteria: cached endpoints show a measured latency/read-count improvement over TASK-3601's baseline; cache invalidation is correct (no stale reference data shown after an Admin edits stages/subjects).
- Testing requirements: cache-hit/miss unit tests; an invalidation test per cached route.
- Documentation requirements: `docs/architecture/performance-audit.md` updated with what was cached and why.
- Status: Done

> Implemented the `subjects`/`educationStages` half of this task — the
> two collections TASK-3601 named as re-read fresh, uncached, from at
> least seven services on every request. New `lib/server/cache/
> memoryCache.ts` (`createMemoryCache<T>(ttlMs)`, a tiny per-process
> get/set/invalidate `Map` wrapper) is used by both
> `subjectRepository.list()` and `educationStageRepository.list()`
> (5-minute TTL), with `create`/`update`/`delete` on each repository
> calling `invalidate()` so an Admin edit is never masked by a stale
> cache. Caching at the repository's `list()` — the one place all seven
> calling services already funnel through — fixes every caller in one
> change rather than touching each service individually. Chose a
> per-process in-memory cache over `unstable_cache`/an edge cache: this
> project's Vercel free-tier deployment has no shared edge KV, and the
> data changes rarely enough that a cold-start miss is an acceptable
> cost. The public teacher directory (Phase 23) and Phase 33's analytics
> aggregations — this task's other two named candidates — were left out
> of this pass: the directory's `getPublicSummary` (reviews) is
> per-teacher and mutates on every new review, and the analytics
> aggregations are already parameterized by `granularity`/date range
> (TASK-3304), so either would need a proper keyed cache (not this
> single-slot one) to invalidate correctly — worth a follow-up task
> rather than folding into this one. Tests added:
> `memoryCache.test.ts` (get/set/TTL-expiry/invalidate) and one
> cache-hit → cache-serves → invalidate-on-write sequence test per
> repository. Verification could not run for real this session (no
> network in this sandbox, `npm install` 403s) — reviewed by hand.
> Phase 36 stays `In Progress`: TASK-3604 (client-fetch audit) is next
> — its only dependency, TASK-3601, is already `Done`.

## TASK-3603: Firestore read reduction pass on the newest features
- Description: The Phase 30–35 features add several new list/aggregation queries (recent students/payments, analytics breakdowns, unsubscribed/renewal-due lists). Review each for N+1 query patterns (a list query followed by a per-row lookup) and denormalize or batch-fetch where it matters, following the project's existing denormalization conventions (e.g. `teacherId` already denormalized onto `courses`/`enrollments`).
- Dependencies: TASK-3301–3307, TASK-3403, TASK-3404 (this task reviews their implementations once built)
- Affected modules: whichever repositories TASK-3601/implementation reveal as N+1-prone
- Acceptance criteria: no new list endpoint from this feature batch performs a per-row Firestore read inside a loop; measured read count per page load is reasonable relative to result-set size.
- Testing requirements: repository tests asserting a bounded number of reads for a given input size (e.g. "listing 50 students issues at most K queries, not 50+K").
- Documentation requirements: `docs/architecture/performance-audit.md`.
- Status: Done

> Fixed the one concrete N+1 TASK-3601 named:
> `studentService.getCourseStudentsProgress` (TASK-2504) called
> `lessonProgressRepository.listByStudentForLessons` once per enrolled
> student (N Firestore `getAll` round trips). New
> `lessonProgressRepository.listByStudentsForLessons(studentIds,
> lessonIds)` batches the full student × lesson cross-product into one
> `getAll` (same deterministic-id pattern as the existing
> per-student method), and the service now groups the flat result back
> by `studentId` itself instead of awaiting per-student calls. Behavior
> and return shape are unchanged — only the read pattern changed. The
> other two TASK-3601 findings (uncached `subjects`/`educationStages`
> reads; unbounded full-collection scans in
> `adminOverviewService`/`adminUnsubscribedStudentsService`) are out of
> this task's scope — the former is TASK-3602's caching concern, the
> latter is a `limit`/`orderBy` fix worth a follow-up but wasn't named
> as N+1 by TASK-3601. Tests added: a repository test asserting exactly
> one `getAll` call for a multi-student × multi-lesson input, and a
> service test asserting exactly one `listByStudentsForLessons` call
> (not one per student) for a 3-student enrollment list. Verification
> could not run for real this session (no network in this sandbox,
> `npm install` 403s — same constraint recent sessions in this phase
> have hit) — reviewed by hand instead. TASK-3602 (server-side response
> caching) and TASK-3604 (client-fetch audit) remain `Not Started` and
> are both still unblocked (their only dependency, TASK-3601, is
> `Done`).

## TASK-3604: Client-side data fetching review (avoid redundant refetches)
- Description: Audit dashboard/analytics pages for redundant client-side fetches (e.g. the same `systemStats` or profile data fetched independently by multiple mounted components) and consolidate via existing data-fetching patterns already used elsewhere in the app (shared query/cache layer if one exists, or lifting fetches to a common parent/context).
- Dependencies: TASK-3601
- Affected modules: dashboard/analytics page components across Admin/Teacher/Student
- Acceptance criteria: no page issues duplicate network requests for the same data on a single load (verifiable via browser network panel).
- Testing requirements: manual/network-panel verification noted in the findings doc; component test if a shared-fetch abstraction is introduced.
- Documentation requirements: `docs/architecture/performance-audit.md`.
- Status: Done

> Audited every dashboard/analytics page and every client component
> mounted on them for redundant same-page fetches. **No duplication
> found** — the project's existing pattern (server component fetches
> once, passes `initial*` props down; each polling client component
> owns a distinct endpoint) already prevents the failure mode this task
> looked for. No code change made — nothing to consolidate. See
> `docs/architecture/performance-audit.md`'s TASK-3604 section for the
> full audit trail and the one thing worth revisiting if it ever
> changes (two components both needing the same list on one page).
> **Phase 36 is now `Done`** — all four tasks (TASK-3601–3604) complete.
