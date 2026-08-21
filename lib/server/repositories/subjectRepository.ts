import "server-only";
import { adminDb } from "@/lib/server/firebaseAdmin";
import { NotFoundError } from "@/lib/errors";
import { createMemoryCache } from "@/lib/server/cache/memoryCache";

export interface LocalizedText {
  en: string;
  ar: string;
}

export interface SubjectDoc {
  id: string;
  name: LocalizedText;
  createdAt: number;
}

export type CreateSubjectDoc = Omit<SubjectDoc, "id">;
export type UpdateSubjectDoc = Partial<Pick<SubjectDoc, "name">>;

const COLLECTION = "subjects";

/** TASK-3602: near-static reference data, re-read on every request from at least seven services — see `memoryCache.ts`. */
const listCache = createMemoryCache<SubjectDoc[]>(5 * 60 * 1000);

function toDoc(id: string, data: FirebaseFirestore.DocumentData): SubjectDoc {
  return {
    id,
    name: data.name as LocalizedText,
    createdAt: Number(data.createdAt),
  };
}

/**
 * Repository for `subjects/{subjectId}` — see `docs/database/collections.md`.
 * Same non-teacher-owned shape as `educationStageRepository`: a center-wide
 * lookup collection, admin-write / any-role-read, gated at the service layer.
 */
export const subjectRepository = {
  async list(): Promise<SubjectDoc[]> {
    const cached = listCache.get();
    if (cached) return cached;
    const snap = await adminDb.collection(COLLECTION).get();
    const subjects = snap.docs.map((doc) => toDoc(doc.id, doc.data())).sort((a, b) => a.name.en.localeCompare(b.name.en));
    listCache.set(subjects);
    return subjects;
  },

  async findById(id: string): Promise<SubjectDoc | null> {
    const snap = await adminDb.collection(COLLECTION).doc(id).get();
    return snap.exists ? toDoc(snap.id, snap.data() ?? {}) : null;
  },

  async create(subject: CreateSubjectDoc): Promise<SubjectDoc> {
    const ref = adminDb.collection(COLLECTION).doc();
    await ref.create(subject);
    listCache.invalidate();
    return { id: ref.id, ...subject };
  },

  async update(id: string, patch: UpdateSubjectDoc): Promise<SubjectDoc> {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundError();
    await adminDb.collection(COLLECTION).doc(id).update(patch);
    listCache.invalidate();
    return { ...existing, ...patch };
  },

  async delete(id: string): Promise<SubjectDoc> {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundError();
    await adminDb.collection(COLLECTION).doc(id).delete();
    listCache.invalidate();
    return existing;
  },
};
