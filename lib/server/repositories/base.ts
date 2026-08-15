import "server-only";
import type { Query, CollectionReference, DocumentData } from "firebase-admin/firestore";
import { ForbiddenError } from "@/lib/errors";
import type { Session } from "@/lib/auth/session";

/**
 * Repository-layer teacher-isolation helpers — TASK-602.
 *
 * Per docs/architecture/ownership-model.md, `teacherId` on a teacher-owned
 * collection (`courses`, `lessons`, `schedule`, `quizzes`, `questions`,
 * `files`, ...) is a real access boundary between teachers now, not just an
 * audit field. These helpers are the one place that boundary is
 * implemented at the repository layer, so every collection repository
 * applies it the same way instead of hand-rolling a `.where("teacherId",
 * ...)` (or forgetting to).
 *
 * This is defense-in-depth alongside — not a replacement for — the
 * service-layer guards in lib/auth/guards.ts (e.g.
 * assertTeacherOwnsResource), which remain the primary place business
 * rules and ownership are enforced, per docs/architecture/overview.md's
 * layering rules. Repositories stay "Firestore I/O only"; these helpers
 * just make the correct I/O the path of least resistance.
 */

/** Minimal shape of anything with a `teacherId` owner field. */
export interface OwnedByTeacher {
  teacherId: string;
}

/**
 * Scopes a Firestore query (or collection reference, which is itself a
 * `Query`) to the session's own `teacherId`, unless the session is an
 * Admin — in which case the query is returned unscoped so an Admin's
 * "list all" queries see every teacher's data.
 *
 * Use for every read query against a teacher-owned collection:
 *
 * ```ts
 * const snap = await scopeToTeacher(adminDb.collection("courses"), session).get();
 * ```
 *
 * Throws if called with a non-teacher, non-admin session (e.g. a
 * student) — callers should only reach a teacher-owned repository method
 * after a role check (`assertRole`), so this is a defensive backstop,
 * not the primary role gate.
 */
export function scopeToTeacher<T extends Query<DocumentData> | CollectionReference<DocumentData>>(
  query: T,
  session: Session,
): Query<DocumentData> {
  if (session.role === "admin") return query;
  if (session.role === "teacher") return query.where("teacherId", "==", session.uid);
  throw new ForbiddenError();
}

/**
 * Asserts a specific document may be written by `session`: the Admin, or
 * the teacher who owns it (`doc.teacherId == session.uid`). Use before any
 * update/delete on a teacher-owned document, at the repository layer, as a
 * second check independent of the service-layer guard that (should have)
 * already run.
 */
export function assertWritableByTeacher(session: Session, doc: OwnedByTeacher): void {
  if (session.role === "admin") return;
  if (session.role === "teacher" && doc.teacherId === session.uid) return;
  throw new ForbiddenError();
}

/**
 * Returns the `teacherId` a new teacher-owned document should be created
 * with: the Admin must supply one explicitly (they don't own courses
 * themselves), while a Teacher may only ever create documents owned by
 * themselves — `explicitTeacherId` is ignored/rejected for a Teacher
 * caller so they can't set `teacherId` to another teacher's uid.
 */
export function resolveOwnerTeacherId(session: Session, explicitTeacherId?: string): string {
  if (session.role === "teacher") return session.uid;
  if (session.role === "admin") {
    if (!explicitTeacherId) {
      throw new ForbiddenError();
    }
    return explicitTeacherId;
  }
  throw new ForbiddenError();
}
