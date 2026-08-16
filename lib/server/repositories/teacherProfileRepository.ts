import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/server/firebaseAdmin";

export interface TeacherProfileDoc {
  teacherId: string;
  slug: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  isPublic: boolean;
  /** refs into `subjects` — the subject(s) this teacher is assigned to teach, set by an Admin at creation or later edited (TASK-2402; previously a single `subjectId`). */
  subjectIds?: string[];
  stats?: TeacherProfileStats;
  createdAt: number;
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
      ...(data.bio ? { bio: String(data.bio) } : {}),
      ...(data.avatarUrl ? { avatarUrl: String(data.avatarUrl) } : {}),
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
      ...(data.bio ? { bio: String(data.bio) } : {}),
      ...(data.avatarUrl ? { avatarUrl: String(data.avatarUrl) } : {}),
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
          ...(data.bio ? { bio: String(data.bio) } : {}),
          ...(data.avatarUrl ? { avatarUrl: String(data.avatarUrl) } : {}),
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

  async incrementStats(teacherId: string, patch: Partial<TeacherProfileStats>): Promise<void> {
    const updates = Object.fromEntries(
      Object.entries(patch).map(([key, value]) => [`stats.${key}`, FieldValue.increment(value ?? 0)]),
    );
    await adminDb.collection(COLLECTION).doc(teacherId).update(updates);
  },
};
