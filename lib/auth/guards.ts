import "server-only";
import { ForbiddenError } from "@/lib/errors";
import type { Session } from "@/lib/auth/session";
import type { UserRole } from "@/lib/validation/auth.schema";

/**
 * Service-layer authorization guards — the fine-grained layer described in
 * docs/authorization/README.md, sitting below the coarse route-group check
 * in `proxy.ts` and above the Firestore Security Rules safety net.
 *
 * Each guard throws a `ForbiddenError` (-> HTTP 403 via `handleApiError`)
 * on failure rather than returning a boolean, so call sites can't
 * accidentally ignore the result. None of these ever read a role/owner id
 * from the request body — always from the verified `Session` or from the
 * resource's own stored fields, per the "never trust client-supplied
 * role/owner data" rule.
 */

/**
 * Asserts the session's role is one of `allowed`. Use for actions gated
 * purely by role (e.g. "only teachers or admins may create a course").
 */
export function assertRole(session: Session, ...allowed: UserRole[]): void {
  if (!allowed.includes(session.role)) {
    throw new ForbiddenError();
  }
}

/**
 * Shape shared by any resource that carries a denormalized `teacherId`
 * owner field (`courses`, `lessons`, `quizzes`, `questions`, `files` —
 * see docs/database/collections.md). Kept structural/minimal here rather
 * than importing each collection's full doc type, so this guard has no
 * dependency on domain modules that don't exist yet (Phase 6+).
 */
export interface OwnedByTeacher {
  teacherId: string;
}

/**
 * Asserts `session` is either an admin (who can act on any resource per
 * the permission matrix) or the teacher who owns `resource`.
 */
export function assertTeacherOwnsResource(session: Session, resource: OwnedByTeacher): void {
  if (session.role === "admin") return;
  if (session.role === "teacher" && resource.teacherId === session.uid) return;
  throw new ForbiddenError();
}

/** @deprecated Use {@link assertTeacherOwnsResource}; kept as an alias matching the name used in docs/authorization/README.md. */
export const assertTeacherOwnsCourse = assertTeacherOwnsResource;

/**
 * Minimal shape of an `enrollments/{enrollmentId}` doc needed to check
 * access — see docs/database/collections.md for the full doc shape.
 */
export interface EnrollmentLike {
  studentId: string;
  status: "active" | "completed" | "cancelled";
}

/**
 * Asserts `session` is the enrolled student (with a non-cancelled
 * enrollment) or an admin. `enrollment` is `null` when no enrollment doc
 * exists for this student/course pair, which is treated the same as "not
 * enrolled" rather than throwing a separate not-found error — the caller
 * decides whether to surface `NotFoundError` or `ForbiddenError` to avoid
 * leaking whether a course exists to a caller who isn't enrolled in it.
 */
export function assertStudentEnrolled(session: Session, enrollment: EnrollmentLike | null): void {
  if (session.role === "admin") return;
  if (
    enrollment &&
    session.role === "student" &&
    enrollment.studentId === session.uid &&
    enrollment.status !== "cancelled"
  ) {
    return;
  }
  throw new ForbiddenError();
}

/**
 * TASK-3204 — asserts `session` may access a course's lesson *content*
 * (video/files): a non-cancelled enrollment in the specific course, OR
 * an active subscription (Phase 29) covering the course's
 * teacher+subject+stage, OR an admin. `subscribed` is computed by the
 * caller (`courseService.hasActiveSubscriptionForCourse`) rather than
 * this guard reading Firestore itself, matching every other guard here
 * taking pre-fetched data rather than doing its own I/O.
 */
export function assertStudentHasCourseAccess(
  session: Session,
  enrollment: EnrollmentLike | null,
  subscribed: boolean,
): void {
  if (session.role === "admin") return;
  if (
    session.role === "student" &&
    enrollment &&
    enrollment.studentId === session.uid &&
    enrollment.status !== "cancelled"
  ) {
    return;
  }
  if (session.role === "student" && subscribed) return;
  throw new ForbiddenError();
}

/**
 * Asserts `session` may read progress for `enrollment`: the enrolled
 * student themselves, the owning teacher (read-only aggregate per the
 * permission matrix), or an admin.
 */
export function assertCanViewEnrollment(
  session: Session,
  enrollment: EnrollmentLike & { teacherId: string },
): void {
  if (session.role === "admin") return;
  if (session.role === "student" && enrollment.studentId === session.uid) return;
  if (session.role === "teacher" && enrollment.teacherId === session.uid) return;
  throw new ForbiddenError();
}
