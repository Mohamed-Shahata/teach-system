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
      stats: normalizeStats(data.stats),
      createdAt: Number(data.createdAt),
    };
  },

  async incrementStats(teacherId: string, patch: Partial<TeacherProfileStats>): Promise<void> {
    const updates = Object.fromEntries(
      Object.entries(patch).map(([key, value]) => [`stats.${key}`, FieldValue.increment(value ?? 0)]),
    );
    await adminDb.collection(COLLECTION).doc(teacherId).update(updates);
  },
};
