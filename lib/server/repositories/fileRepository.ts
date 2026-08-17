import "server-only";
import { adminDb } from "@/lib/server/firebaseAdmin";
import { assertWritableByTeacher } from "@/lib/server/repositories/base";
import type { Session } from "@/lib/auth/session";
import { NotFoundError } from "@/lib/errors";

/** `files/{fileId}` — see docs/database/collections.md. */
export interface FileDoc {
  id: string;
  teacherId: string;
  courseId?: string;
  lessonId?: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  url: string;
  publicId: string;
  createdAt: number;
}

export type CreateFileDoc = Omit<FileDoc, "id">;

const COLLECTION = "files";

function toFileDoc(id: string, data: FirebaseFirestore.DocumentData): FileDoc {
  return {
    id,
    teacherId: String(data.teacherId),
    ...(data.courseId ? { courseId: String(data.courseId) } : {}),
    ...(data.lessonId ? { lessonId: String(data.lessonId) } : {}),
    fileName: String(data.fileName),
    fileType: String(data.fileType),
    fileSize: Number(data.fileSize),
    url: String(data.url),
    publicId: String(data.publicId),
    createdAt: Number(data.createdAt),
  };
}

export const fileRepository = {
  async findById(id: string): Promise<FileDoc | null> {
    const snap = await adminDb.collection(COLLECTION).doc(id).get();
    return snap.exists ? toFileDoc(snap.id, snap.data() ?? {}) : null;
  },

  async listByCourse(courseId: string): Promise<FileDoc[]> {
    const snap = await adminDb.collection(COLLECTION).where("courseId", "==", courseId).get();
    return snap.docs.map((doc) => toFileDoc(doc.id, doc.data())).sort((a, b) => b.createdAt - a.createdAt);
  },

  async listByLesson(lessonId: string): Promise<FileDoc[]> {
    const snap = await adminDb.collection(COLLECTION).where("lessonId", "==", lessonId).get();
    return snap.docs.map((doc) => toFileDoc(doc.id, doc.data())).sort((a, b) => b.createdAt - a.createdAt);
  },

  /**
   * Every file this teacher has ever uploaded, across every course/
   * lesson — backs the standalone `/teacher/files` page (TASK-1304).
   * `teacherId` is always server-derived from the session, never a
   * client-supplied query param, same rule `listByCourse`/`listByLesson`
   * rely on their callers (`fileService`) to enforce via ownership
   * checks before calling in.
   */
  async listByTeacher(teacherId: string): Promise<FileDoc[]> {
    const snap = await adminDb.collection(COLLECTION).where("teacherId", "==", teacherId).get();
    return snap.docs.map((doc) => toFileDoc(doc.id, doc.data())).sort((a, b) => b.createdAt - a.createdAt);
  },

  async create(file: CreateFileDoc): Promise<FileDoc> {
    const ref = adminDb.collection(COLLECTION).doc();
    await ref.create(file);
    return { id: ref.id, ...file };
  },

  async delete(session: Session, id: string): Promise<FileDoc> {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundError();
    assertWritableByTeacher(session, existing);
    await adminDb.collection(COLLECTION).doc(id).delete();
    return existing;
  },
};
