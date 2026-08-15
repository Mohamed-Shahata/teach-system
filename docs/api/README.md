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

## Endpoints (MVP)

| Method | Path | Purpose | Auth |
|---|---|---|---|
| POST | `/api/auth/session` | exchange ID token for session cookie | public |
| POST | `/api/auth/logout` | clear session | authenticated |
| POST | `/api/admin/accounts` | create a teacher or student account | admin |
| POST | `/api/teacher/students` | create a student account | teacher |
| GET/POST | `/api/courses` | list/create teacher's courses | teacher |
| GET/PATCH/DELETE | `/api/courses/[courseId]` | manage one course | teacher (owner) |
| GET/POST | `/api/courses/[courseId]/lessons` | list/create lessons | teacher (owner) / student (enrolled, read) |
| PATCH/DELETE | `/api/lessons/[lessonId]` | edit/delete a lesson | teacher (owner) |
| POST | `/api/courses/[courseId]/enroll` | student enrolls | student |
| GET | `/api/students` | teacher's students overview | teacher |
| GET/POST | `/api/courses/[courseId]/quizzes` | list/create quizzes | teacher (owner) / student (read, published only) |
| POST | `/api/quizzes/[quizId]/attempts` | submit a quiz attempt | student (enrolled) |
| POST | `/api/uploads/sign` | get a signed Cloudinary upload | teacher |
| POST | `/api/files` | persist uploaded file metadata | teacher |
| GET | `/api/public/teachers/[slug]` | public teacher profile | public |
| GET | `/api/public/courses/[slug]` | public course page | public |

Full request/response schemas live alongside each Zod schema in
`lib/validation/*` and are considered the authoritative contract.
