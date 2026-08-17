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
- Status: Not Started

## TASK-3602: Server-side response caching for read-heavy, slow-changing data
- Description: Apply caching (Next.js route segment caching / `unstable_cache` / a lightweight in-memory or edge cache, chosen based on TASK-3601's findings and the Vercel free-tier constraints already noted elsewhere in this project) to endpoints serving data that changes infrequently relative to read volume — the clearest candidates being `educationStages`/`subjects` (near-static reference data), the public teacher directory (Phase 23), and Phase 33's analytics aggregations (cache per filter-range, invalidate on a schedule rather than per-write).
- Dependencies: TASK-3601 (to confirm these are actually the hot paths, and to catch any others)
- Affected modules: the specific routes TASK-3601 flags — likely `app/api/subjects/route.ts`, `app/api/education-stages/route.ts`, `app/api/teachers/route.ts` (directory), `app/api/admin/analytics/*`
- Acceptance criteria: cached endpoints show a measured latency/read-count improvement over TASK-3601's baseline; cache invalidation is correct (no stale reference data shown after an Admin edits stages/subjects).
- Testing requirements: cache-hit/miss unit tests; an invalidation test per cached route.
- Documentation requirements: `docs/architecture/performance-audit.md` updated with what was cached and why.
- Status: Not Started

## TASK-3603: Firestore read reduction pass on the newest features
- Description: The Phase 30–35 features add several new list/aggregation queries (recent students/payments, analytics breakdowns, unsubscribed/renewal-due lists). Review each for N+1 query patterns (a list query followed by a per-row lookup) and denormalize or batch-fetch where it matters, following the project's existing denormalization conventions (e.g. `teacherId` already denormalized onto `courses`/`enrollments`).
- Dependencies: TASK-3301–3307, TASK-3403, TASK-3404 (this task reviews their implementations once built)
- Affected modules: whichever repositories TASK-3601/implementation reveal as N+1-prone
- Acceptance criteria: no new list endpoint from this feature batch performs a per-row Firestore read inside a loop; measured read count per page load is reasonable relative to result-set size.
- Testing requirements: repository tests asserting a bounded number of reads for a given input size (e.g. "listing 50 students issues at most K queries, not 50+K").
- Documentation requirements: `docs/architecture/performance-audit.md`.
- Status: Not Started

## TASK-3604: Client-side data fetching review (avoid redundant refetches)
- Description: Audit dashboard/analytics pages for redundant client-side fetches (e.g. the same `systemStats` or profile data fetched independently by multiple mounted components) and consolidate via existing data-fetching patterns already used elsewhere in the app (shared query/cache layer if one exists, or lifting fetches to a common parent/context).
- Dependencies: TASK-3601
- Affected modules: dashboard/analytics page components across Admin/Teacher/Student
- Acceptance criteria: no page issues duplicate network requests for the same data on a single load (verifiable via browser network panel).
- Testing requirements: manual/network-panel verification noted in the findings doc; component test if a shared-fetch abstraction is introduced.
- Documentation requirements: `docs/architecture/performance-audit.md`.
- Status: Not Started
