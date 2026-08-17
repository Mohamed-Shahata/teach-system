import "server-only";
import { assertRole } from "@/lib/auth/guards";
import type { Session } from "@/lib/auth/session";
import { ForbiddenError } from "@/lib/errors";
import { enrollmentRepository } from "@/lib/server/repositories/enrollmentRepository";
import { reviewRepository, type ReviewDoc } from "@/lib/server/repositories/reviewRepository";
import { userRepository } from "@/lib/server/repositories/userRepository";
import type { UpsertReviewInput } from "@/lib/validation/review.schema";

/** One review as shown on the public teacher page (TASK-2703) — student identified by first name only, per that task's description. */
export interface PublicReview {
  id: string;
  rating: number;
  comment?: string;
  studentFirstName: string;
  createdAt: number;
}

export interface TeacherReviewSummary {
  averageRating: number;
  reviewCount: number;
  reviews: PublicReview[];
}

/**
 * Review service — TASK-2702/2703. A student-only upsert gated on eligibility
 * (an active or past, i.e. non-`cancelled`, enrollment with the target
 * teacher — TASK-2701's dependency on TASK-1101) plus the read side each
 * page needs. `hidden` (TASK-2704 moderation) is never touched here —
 * only `adminReviewService`/an Admin-only path sets it.
 */
export const reviewService = {
  /**
   * Mirrors `teacherDirectoryService`'s "no relationship collection"
   * approach (see that service's doc comment): eligibility is derived
   * from the student's own enrollments rather than a separate
   * `studentId -> teacherId` join, since `enrollments` already carries
   * that pair. A `cancelled` enrollment doesn't count — same semantics
   * `teacherDirectoryService.groupByTeacher` uses for "my teachers".
   */
  async assertEligible(studentId: string, teacherId: string): Promise<void> {
    const enrollments = await enrollmentRepository.listByStudent(studentId);
    const eligible = enrollments.some((e) => e.teacherId === teacherId && e.status !== "cancelled");
    if (!eligible) throw new ForbiddenError("errors.forbidden");
  },

  /** The caller's own review for this teacher, if any — prefills the edit form. */
  async getMyReview(session: Session, teacherId: string): Promise<ReviewDoc | null> {
    assertRole(session, "student");
    return reviewRepository.findByTeacherAndStudent(teacherId, session.uid);
  },

  /**
   * Upserts the caller's single review for `teacherId`. Not split into
   * separate "submit"/"edit" operations — the composite doc id (TASK-2701)
   * already makes a second submission an edit of the first, so one
   * method covers both, same as `lessonProgressRepository.upsert`.
   */
  async upsertReview(session: Session, teacherId: string, input: UpsertReviewInput): Promise<ReviewDoc> {
    assertRole(session, "student");
    await this.assertEligible(session.uid, teacherId);

    const existing = await reviewRepository.findByTeacherAndStudent(teacherId, session.uid);
    const now = Date.now();

    return reviewRepository.upsert({
      teacherId,
      studentId: session.uid,
      rating: input.rating,
      comment: input.comment,
      hidden: existing?.hidden ?? false,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
  },

  /**
   * TASK-2703 — public teacher page's average rating + review list.
   * Computed on read from `listVisibleByTeacher` (already hidden==false,
   * newest first) rather than maintained as a denormalized field on the
   * teacher profile doc — this collection is small per teacher and this
   * keeps the number always consistent with what's actually visible,
   * with no trigger/write-path to keep in sync. Anonymous-safe: no
   * `Session` param, same as `publicService`, and only ever exposes
   * `studentFirstName` (never the student's uid/full profile) alongside
   * the review — joined via `userRepository.findByIds`, same batch-fetch
   * pattern as `studentService`'s roster joins.
   */
  async getPublicSummary(teacherId: string): Promise<TeacherReviewSummary> {
    const reviews = await reviewRepository.listVisibleByTeacher(teacherId);
    if (reviews.length === 0) {
      return { averageRating: 0, reviewCount: 0, reviews: [] };
    }

    const students = await userRepository.findByIds(reviews.map((r) => r.studentId));
    const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

    return {
      averageRating: Math.round(averageRating * 10) / 10,
      reviewCount: reviews.length,
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        studentFirstName: (students.get(r.studentId)?.displayName ?? "").split(" ")[0] || "—",
        createdAt: r.createdAt,
      })),
    };
  },

  /** TASK-2704 — Admin's per-teacher moderation queue: every review, hidden or not. */
  async listForModeration(session: Session, teacherId: string): Promise<ReviewDoc[]> {
    assertRole(session, "admin");
    return reviewRepository.listAllByTeacher(teacherId);
  },

  /** TASK-2704 — Admin-only hide/unhide. Never touches rating/comment. */
  async setHidden(session: Session, reviewId: string, hidden: boolean): Promise<void> {
    assertRole(session, "admin");
    await reviewRepository.setHidden(reviewId, hidden);
  },
};
