import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/server/firebaseAdmin";

/**
 * TASK-1902 — System-wide stats overview.
 *
 * Single denormalized doc (`systemStats/global`), same pattern as
 * `teacherProfiles.stats` (`teacherProfileRepository.ts`): counters are
 * incremented by the feature services as the underlying events happen,
 * rather than computed with live collection scans, per
 * `docs/database/collections.md` conventions.
 *
 * `totalPublishedLessons` counts lessons as they're created: unlike
 * courses, a lesson has no separate draft/published state in this schema
 * (`docs/database/collections.md`), so "published" here means "exists
 * under a course" — every created lesson is counted.
 */
export interface SystemStats {
  totalTeachers: number;
  totalStudents: number;
  totalCourses: number;
  totalPublishedCourses: number;
  totalEnrollments: number;
  totalPublishedLessons: number;
}

export const EMPTY_SYSTEM_STATS: SystemStats = {
  totalTeachers: 0,
  totalStudents: 0,
  totalCourses: 0,
  totalPublishedCourses: 0,
  totalEnrollments: 0,
  totalPublishedLessons: 0,
};

const COLLECTION = "systemStats";
const DOC_ID = "global";

function readNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normalizeStats(stats: unknown): SystemStats {
  if (typeof stats !== "object" || stats === null) {
    return { ...EMPTY_SYSTEM_STATS };
  }

  const value = stats as Partial<Record<keyof SystemStats, unknown>>;
  return {
    totalTeachers: readNumber(value.totalTeachers),
    totalStudents: readNumber(value.totalStudents),
    totalCourses: readNumber(value.totalCourses),
    totalPublishedCourses: readNumber(value.totalPublishedCourses),
    totalEnrollments: readNumber(value.totalEnrollments),
    totalPublishedLessons: readNumber(value.totalPublishedLessons),
  };
}

export const systemStatsRepository = {
  async find(): Promise<SystemStats> {
    const snap = await adminDb.collection(COLLECTION).doc(DOC_ID).get();
    return normalizeStats(snap.exists ? snap.data() : null);
  },

  /**
   * `set(..., { merge: true })` rather than `.update()` so the first
   * increment call ever made (no seed script for this doc, unlike
   * `educationStages`/`subjects`) creates it instead of throwing
   * not-found.
   */
  async incrementStats(patch: Partial<SystemStats>): Promise<void> {
    const updates = Object.fromEntries(
      Object.entries(patch).map(([key, value]) => [key, FieldValue.increment(value ?? 0)]),
    );
    await adminDb.collection(COLLECTION).doc(DOC_ID).set(updates, { merge: true });
  },
};
