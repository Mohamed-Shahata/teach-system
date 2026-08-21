import "server-only";
import { adminDb } from "@/lib/server/firebaseAdmin";
import { NotFoundError } from "@/lib/errors";
import { createMemoryCache } from "@/lib/server/cache/memoryCache";

export interface LocalizedText {
  en: string;
  ar: string;
}

export type EducationStageCategory = "nursery" | "primary" | "prep" | "secondary";

export interface EducationStageDoc {
  id: string;
  order: number;
  name: LocalizedText;
  category: EducationStageCategory;
}

export type CreateEducationStageDoc = Omit<EducationStageDoc, "id">;
export type UpdateEducationStageDoc = Partial<Omit<EducationStageDoc, "id">>;

const COLLECTION = "educationStages";

/** TASK-3602: near-static reference data, re-read on every request from at least seven services — see `memoryCache.ts`. */
const listCache = createMemoryCache<EducationStageDoc[]>(5 * 60 * 1000);

function toDoc(id: string, data: FirebaseFirestore.DocumentData): EducationStageDoc {
  return {
    id,
    order: Number(data.order),
    name: data.name as LocalizedText,
    category: data.category as EducationStageCategory,
  };
}

/**
 * Repository for `educationStages/{stageId}` — see
 * `docs/database/collections.md`. Not teacher-owned (no `teacherId`
 * field, no `scopeToTeacher`/`assertWritableByTeacher` from `base.ts`):
 * this is a center-wide lookup collection, gated at the service layer by
 * `assertRole(session, "admin")` for writes, but readable by any
 * authenticated role (teachers/students need it for course filters).
 */
export const educationStageRepository = {
  async list(): Promise<EducationStageDoc[]> {
    const cached = listCache.get();
    if (cached) return cached;
    const snap = await adminDb.collection(COLLECTION).get();
    const stages = snap.docs.map((doc) => toDoc(doc.id, doc.data())).sort((a, b) => a.order - b.order);
    listCache.set(stages);
    return stages;
  },

  async findById(id: string): Promise<EducationStageDoc | null> {
    const snap = await adminDb.collection(COLLECTION).doc(id).get();
    return snap.exists ? toDoc(snap.id, snap.data() ?? {}) : null;
  },

  async create(stage: CreateEducationStageDoc): Promise<EducationStageDoc> {
    const ref = adminDb.collection(COLLECTION).doc();
    await ref.create(stage);
    listCache.invalidate();
    return { id: ref.id, ...stage };
  },

  async update(id: string, patch: UpdateEducationStageDoc): Promise<EducationStageDoc> {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundError();
    await adminDb.collection(COLLECTION).doc(id).update(patch);
    listCache.invalidate();
    return { ...existing, ...patch };
  },

  async delete(id: string): Promise<EducationStageDoc> {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundError();
    await adminDb.collection(COLLECTION).doc(id).delete();
    listCache.invalidate();
    return existing;
  },
};
