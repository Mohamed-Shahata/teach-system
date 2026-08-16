import "server-only";
import { adminDb } from "@/lib/server/firebaseAdmin";
import { NotFoundError } from "@/lib/errors";

/**
 * Repository for `teacherOfferings/{offeringId}` — added alongside
 * `database/collections.md`'s existing collections to price a teacher's
 * subject per grade level: e.g. "Physics, Grade 3 Secondary — 350 EGP /
 * month". Priced **monthly**, not per-lesson, per the center's billing
 * model (see `paymentService`/`enrollmentService` for the subscription
 * flow this feeds).
 *
 * One offering per `(teacherId, subjectId, stageId)` triple — enforced at
 * the service layer, not by document id, since Firestore has no
 * composite-key documents.
 */
export interface TeacherOfferingDoc {
  id: string;
  teacherId: string;
  subjectId: string;
  stageId: string;
  /** Price in the smallest whole currency unit the center uses (EGP, no decimals). */
  monthlyPrice: number;
  createdAt: number;
  updatedAt: number;
}

export type CreateTeacherOfferingDoc = Omit<TeacherOfferingDoc, "id">;
export type UpdateTeacherOfferingDoc = Partial<Pick<TeacherOfferingDoc, "monthlyPrice" | "updatedAt">>;

const COLLECTION = "teacherOfferings";

function toDoc(id: string, data: FirebaseFirestore.DocumentData): TeacherOfferingDoc {
  return {
    id,
    teacherId: String(data.teacherId),
    subjectId: String(data.subjectId),
    stageId: String(data.stageId),
    monthlyPrice: Number(data.monthlyPrice),
    createdAt: Number(data.createdAt),
    updatedAt: Number(data.updatedAt),
  };
}

export const teacherOfferingRepository = {
  /** All priced (subject, stage) offerings for one teacher — Admin/teacher management UI, and the student subscribe flow. */
  async listByTeacher(teacherId: string): Promise<TeacherOfferingDoc[]> {
    const snap = await adminDb.collection(COLLECTION).where("teacherId", "==", teacherId).get();
    return snap.docs.map((doc) => toDoc(doc.id, doc.data()));
  },

  /** Every teacher's offering for one grade level — Admin's subscribe-a-student picker, scoped to the student's own stage. */
  async listByStage(stageId: string): Promise<TeacherOfferingDoc[]> {
    const snap = await adminDb.collection(COLLECTION).where("stageId", "==", stageId).get();
    return snap.docs.map((doc) => toDoc(doc.id, doc.data()));
  },

  async findById(id: string): Promise<TeacherOfferingDoc | null> {
    const snap = await adminDb.collection(COLLECTION).doc(id).get();
    return snap.exists ? toDoc(snap.id, snap.data() ?? {}) : null;
  },

  /** Used to enforce the one-offering-per-(teacher,subject,stage) rule at the service layer. */
  async findByTeacherSubjectStage(
    teacherId: string,
    subjectId: string,
    stageId: string,
  ): Promise<TeacherOfferingDoc | null> {
    const snap = await adminDb
      .collection(COLLECTION)
      .where("teacherId", "==", teacherId)
      .where("subjectId", "==", subjectId)
      .where("stageId", "==", stageId)
      .limit(1)
      .get();
    const first = snap.docs[0];
    return first ? toDoc(first.id, first.data()) : null;
  },

  async create(offering: CreateTeacherOfferingDoc): Promise<TeacherOfferingDoc> {
    const ref = adminDb.collection(COLLECTION).doc();
    await ref.create(offering);
    return { id: ref.id, ...offering };
  },

  async update(id: string, patch: UpdateTeacherOfferingDoc): Promise<TeacherOfferingDoc> {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundError();
    await adminDb.collection(COLLECTION).doc(id).update(patch);
    return { ...existing, ...patch };
  },

  async delete(id: string): Promise<TeacherOfferingDoc> {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundError();
    await adminDb.collection(COLLECTION).doc(id).delete();
    return existing;
  },
};
