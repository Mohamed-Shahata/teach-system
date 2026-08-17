import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/server/firebaseAdmin";

export interface LocalizedText {
  en?: string;
  ar?: string;
}

export interface TeacherProfileSocialLinks {
  facebook?: string;
  youtube?: string;
  whatsapp?: string;
  instagram?: string;
  tiktok?: string;
  website?: string;
}

export interface TeacherProfileDoc {
  teacherId: string;
  slug: string;
  displayName: string;
  /** TASK-3101 migrated this from a plain string to a bilingual map. `normalizeBio` below reads a legacy plain-string `bio` (pre-TASK-3101 docs) as `{ en: <string> }` so old profiles remain valid without a migration script. */
  bio?: LocalizedText;
  avatarUrl?: string;
  isPublic: boolean;
  /** refs into `subjects` — the subject(s) this teacher is assigned to teach, set by an Admin at creation or later edited (TASK-2402; previously a single `subjectId`). */
  subjectIds?: string[];
  stats?: TeacherProfileStats;
  createdAt: number;
  /** TASK-3101 — the richer fields shown on the directory (TASK-2302) and public profile (Phase 27). All optional; existing profiles without them remain valid. */
  headline?: LocalizedText;
  yearsOfExperience?: number;
  specialization?: string;
  socialLinks?: TeacherProfileSocialLinks;
}

export interface TeacherProfileStats {
  totalStudents: number;
  totalCourses: number;
  totalPublishedCourses: number;
  totalLessons: number;
  totalEnrollments: number;
}

export const EMPTY_TEACHER_PROFILE_STATS: TeacherProfileStats = {
  totalStudents: 0,
  totalCourses: 0,
  totalPublishedCourses: 0,
  totalLessons: 0,
  totalEnrollments: 0,
};

const COLLECTION = "teacherProfiles";

/** Reads `subjectIds` defensively — old docs may still carry a single legacy `subjectId` string field. */
function normalizeSubjectIds(data: Record<string, unknown>): string[] | undefined {
  if (Array.isArray(data.subjectIds)) {
    const ids = data.subjectIds.filter((id): id is string => typeof id === "string");
    return ids.length > 0 ? ids : undefined;
  }
  if (typeof data.subjectId === "string") return [data.subjectId];
  return undefined;
}

function readNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/** Reads `bio` defensively — pre-TASK-3101 docs stored a plain string. */
function normalizeBio(data: Record<string, unknown>): LocalizedText | undefined {
  const bio = data.bio;
  if (typeof bio === "string" && bio.length > 0) return { en: bio };
  if (typeof bio === "object" && bio !== null) {
    const { en, ar } = bio as Partial<LocalizedText>;
    const value: LocalizedText = {};
    if (typeof en === "string" && en.length > 0) value.en = en;
    if (typeof ar === "string" && ar.length > 0) value.ar = ar;
    return Object.keys(value).length > 0 ? value : undefined;
  }
  return undefined;
}

function normalizeLocalizedText(value: unknown): LocalizedText | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const { en, ar } = value as Partial<LocalizedText>;
  const result: LocalizedText = {};
  if (typeof en === "string" && en.length > 0) result.en = en;
  if (typeof ar === "string" && ar.length > 0) result.ar = ar;
  return Object.keys(result).length > 0 ? result : undefined;
}

function normalizeSocialLinks(value: unknown): TeacherProfileSocialLinks | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const source = value as Record<string, unknown>;
  const result: TeacherProfileSocialLinks = {};
  for (const key of ["facebook", "youtube", "whatsapp", "instagram", "tiktok", "website"] as const) {
    if (typeof source[key] === "string" && source[key]) result[key] = source[key] as string;
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

/** Shared TASK-3101-field extraction, used by every read site below so the four call sites stay in sync. */
function extractProfileDetails(data: Record<string, unknown>) {
  return {
    ...(normalizeBio(data) ? { bio: normalizeBio(data) } : {}),
    ...(normalizeLocalizedText(data.headline) ? { headline: normalizeLocalizedText(data.headline) } : {}),
    ...(typeof data.yearsOfExperience === "number" ? { yearsOfExperience: data.yearsOfExperience } : {}),
    ...(typeof data.specialization === "string" && data.specialization
      ? { specialization: data.specialization }
      : {}),
    ...(normalizeSocialLinks(data.socialLinks) ? { socialLinks: normalizeSocialLinks(data.socialLinks) } : {}),
  };
}

function normalizeStats(stats: unknown): TeacherProfileStats {
  if (typeof stats !== "object" || stats === null) {
    return { ...EMPTY_TEACHER_PROFILE_STATS };
  }

  const value = stats as Partial<Record<keyof TeacherProfileStats, unknown>>;
  return {
    totalStudents: readNumber(value.totalStudents),
    totalCourses: readNumber(value.totalCourses),
    totalPublishedCourses: readNumber(value.totalPublishedCourses),
    totalLessons: readNumber(value.totalLessons),
    totalEnrollments: readNumber(value.totalEnrollments),
  };
}

export const teacherProfileRepository = {
  async create(profile: TeacherProfileDoc): Promise<void> {
    await adminDb.collection(COLLECTION).doc(profile.teacherId).create(profile);
  },

  async findStatsByTeacherId(teacherId: string): Promise<TeacherProfileStats> {
    const snap = await adminDb.collection(COLLECTION).doc(teacherId).get();
    return normalizeStats(snap.exists ? snap.data()?.stats : null);
  },

  /** `slug` is unique across all teachers (docs/database/collections.md), so this is a global lookup, not teacher-scoped. */
  async findBySlug(slug: string): Promise<TeacherProfileDoc | null> {
    const snap = await adminDb.collection(COLLECTION).where("slug", "==", slug).limit(1).get();
    const first = snap.docs[0];
    if (!first) return null;
    const data = first.data();
    return {
      teacherId: first.id,
      slug: String(data.slug),
      displayName: String(data.displayName),
      ...(data.avatarUrl ? { avatarUrl: String(data.avatarUrl) } : {}),
      ...extractProfileDetails(data),
      isPublic: Boolean(data.isPublic),
      ...(normalizeSubjectIds(data) ? { subjectIds: normalizeSubjectIds(data) } : {}),
      stats: normalizeStats(data.stats),
      createdAt: Number(data.createdAt),
    };
  },

  async findByTeacherId(teacherId: string): Promise<TeacherProfileDoc | null> {
    const snap = await adminDb.collection(COLLECTION).doc(teacherId).get();
    if (!snap.exists) return null;
    const data = snap.data() ?? {};
    return {
      teacherId: snap.id,
      slug: String(data.slug),
      displayName: String(data.displayName),
      ...(data.avatarUrl ? { avatarUrl: String(data.avatarUrl) } : {}),
      ...extractProfileDetails(data),
      isPublic: Boolean(data.isPublic),
      ...(normalizeSubjectIds(data) ? { subjectIds: normalizeSubjectIds(data) } : {}),
      stats: normalizeStats(data.stats),
      createdAt: Number(data.createdAt),
    };
  },

  /**
   * Bulk lookup for joining a set of teacherIds to their profiles (TASK-2301
   * — a student's "my teachers" list, joining `enrollments.teacherId` to
   * name/subject/slug). Mirrors `userRepository.findByIds`'s chunked `in`
   * query and "missing ids are simply absent" behavior — doc id is the
   * teacherId itself, same as `findByTeacherId`.
   */
  async findByIds(teacherIds: string[]): Promise<Map<string, TeacherProfileDoc>> {
    const unique = Array.from(new Set(teacherIds));
    const result = new Map<string, TeacherProfileDoc>();
    const CHUNK = 30;

    for (let i = 0; i < unique.length; i += CHUNK) {
      const chunk = unique.slice(i, i + CHUNK);
      if (chunk.length === 0) continue;
      const snap = await adminDb.collection(COLLECTION).where("__name__", "in", chunk).get();
      for (const doc of snap.docs) {
        const data = doc.data();
        result.set(doc.id, {
          teacherId: doc.id,
          slug: String(data.slug),
          displayName: String(data.displayName),
          ...(data.avatarUrl ? { avatarUrl: String(data.avatarUrl) } : {}),
          ...extractProfileDetails(data),
          isPublic: Boolean(data.isPublic),
          ...(normalizeSubjectIds(data) ? { subjectIds: normalizeSubjectIds(data) } : {}),
          stats: normalizeStats(data.stats),
          createdAt: Number(data.createdAt),
        });
      }
    }
    return result;
  },

  /**
   * Admin edit of a teacher's profile-side fields (name/subject) — mirrors
   * `userRepository.updateProfile`'s "only defined keys are written"
   * behavior. `displayName` is duplicated onto `teacherProfiles` (it's
   * also on `users`) since the public teacher page reads it from here.
   */
  async updateProfileFields(teacherId: string, fields: Partial<Pick<TeacherProfileDoc, "displayName" | "subjectIds">>): Promise<void> {
    const data: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) data[key] = value;
    }
    if (Object.keys(data).length === 0) return;
    await adminDb.collection(COLLECTION).doc(teacherId).update(data);
  },

  /**
   * Teacher-editable profile-detail fields from TASK-3101 (`bio`,
   * `headline`, `yearsOfExperience`, `specialization`, `socialLinks`,
   * `avatarUrl`). Separate from `updateProfileFields` (Admin-only
   * name/subject edits) since this is written by the owning teacher
   * themselves (TASK-3102), not an Admin. Only defined keys are written,
   * same "partial patch" behavior as `updateProfileFields`.
   */
  async updateDetails(
    teacherId: string,
    fields: Partial<
      Pick<TeacherProfileDoc, "bio" | "headline" | "yearsOfExperience" | "specialization" | "socialLinks" | "avatarUrl">
    >,
  ): Promise<void> {
    const data: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) data[key] = value;
    }
    if (Object.keys(data).length === 0) return;
    await adminDb.collection(COLLECTION).doc(teacherId).update(data);
  },

  /**
   * TASK-3203 — every `isPublic == true` teacher profile, full shape
   * (unlike `publicRepository.listPublicTeacherProfiles`'s trimmed
   * anonymous-visitor projection), for the student-facing "Teachers"
   * directory. Order is not guaranteed — callers sort as needed.
   */
  async listPublic(): Promise<TeacherProfileDoc[]> {
    const snap = await adminDb.collection(COLLECTION).where("isPublic", "==", true).get();
    return snap.docs.map((doc) => {
      const data = doc.data();
      return {
        teacherId: doc.id,
        slug: String(data.slug),
        displayName: String(data.displayName),
        ...(data.avatarUrl ? { avatarUrl: String(data.avatarUrl) } : {}),
        ...extractProfileDetails(data),
        isPublic: Boolean(data.isPublic),
        ...(normalizeSubjectIds(data) ? { subjectIds: normalizeSubjectIds(data) } : {}),
        stats: normalizeStats(data.stats),
        createdAt: Number(data.createdAt),
      };
    });
  },

  async incrementStats(teacherId: string, patch: Partial<TeacherProfileStats>): Promise<void> {
    const updates = Object.fromEntries(
      Object.entries(patch).map(([key, value]) => [`stats.${key}`, FieldValue.increment(value ?? 0)]),
    );
    await adminDb.collection(COLLECTION).doc(teacherId).update(updates);
  },
};
