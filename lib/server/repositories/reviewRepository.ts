import "server-only";
import { adminDb } from "@/lib/server/firebaseAdmin";

/** See `docs/database/collections.md` — `reviews/{teacherId_studentId}`. */
export interface ReviewDoc {
  id: string;
  teacherId: string;
  studentId: string;
  rating: number;
  comment?: string;
  hidden: boolean;
  createdAt: number;
  updatedAt: number;
}

export type UpsertReviewDoc = Omit<ReviewDoc, "id">;

const COLLECTION = "reviews";

/** Deterministic doc id — same composite-key pattern as `enrollments/{studentId}_{courseId}`. */
function reviewId(teacherId: string, studentId: string): string {
  return `${teacherId}_${studentId}`;
}

function toReviewDoc(id: string, data: FirebaseFirestore.DocumentData): ReviewDoc {
  return {
    id,
    teacherId: String(data.teacherId),
    studentId: String(data.studentId),
    rating: Number(data.rating),
    comment: data.comment ? String(data.comment) : undefined,
    hidden: Boolean(data.hidden),
    createdAt: Number(data.createdAt),
    updatedAt: Number(data.updatedAt),
  };
}

export const reviewRepository = {
  async findByTeacherAndStudent(teacherId: string, studentId: string): Promise<ReviewDoc | null> {
    const snap = await adminDb.collection(COLLECTION).doc(reviewId(teacherId, studentId)).get();
    return snap.exists ? toReviewDoc(snap.id, snap.data() ?? {}) : null;
  },

  /**
   * Public "this teacher's reviews" list (TASK-2703) — non-hidden only,
   * newest first. Uses the `(teacherId, hidden, createdAt desc)`
   * composite index (`firestore.indexes.json`). Capped at 50 — see
   * `reviewService.getPublicSummary`'s note on why true pagination is
   * deferred.
   */
  async listVisibleByTeacher(teacherId: string): Promise<ReviewDoc[]> {
    const snap = await adminDb
      .collection(COLLECTION)
      .where("teacherId", "==", teacherId)
      .where("hidden", "==", false)
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();
    return snap.docs.map((doc) => toReviewDoc(doc.id, doc.data()));
  },

  /**
   * Admin moderation queue (TASK-2704) — every review for a teacher,
   * hidden or not, newest first. Uses its own `(teacherId, createdAt
   * desc)` composite index (`firestore.indexes.json`) — distinct from
   * `listVisibleByTeacher`'s, since that one's `hidden` equality filter
   * would otherwise force this admin-only query through it and exclude
   * hidden reviews from the moderation view.
   */
  async listAllByTeacher(teacherId: string): Promise<ReviewDoc[]> {
    const snap = await adminDb
      .collection(COLLECTION)
      .where("teacherId", "==", teacherId)
      .orderBy("createdAt", "desc")
      .get();
    return snap.docs.map((doc) => toReviewDoc(doc.id, doc.data()));
  },

  /** TASK-2704 — Admin-only hide/unhide, never the rating/comment. */
  async setHidden(id: string, hidden: boolean): Promise<void> {
    await adminDb.collection(COLLECTION).doc(id).update({ hidden, updatedAt: Date.now() });
  },

  /**
   * Creates or overwrites the student's review for this teacher —
   * `.set()` (not `.create()`), since editing an existing review is
   * the expected steady state here (TASK-2701's "editable, not
   * stackable" rule), not a race to guard against.
   */
  async upsert(review: UpsertReviewDoc): Promise<ReviewDoc> {
    const id = reviewId(review.teacherId, review.studentId);
    await adminDb.collection(COLLECTION).doc(id).set(review);
    return { id, ...review };
  },
};
