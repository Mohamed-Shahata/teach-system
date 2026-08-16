import { beforeEach, describe, expect, it, vi } from "vitest";

const getDoc = vi.fn();
const createDoc = vi.fn();
const updateDoc = vi.fn();
const doc = vi.fn(() => ({ get: getDoc, create: createDoc, update: updateDoc }));
const where = vi.fn();
const getQuery = vi.fn();
const collection = vi.fn(() => {
  const query = { where, get: getQuery, doc };
  where.mockReturnValue(query);
  return query;
});

vi.mock("@/lib/server/firebaseAdmin", () => ({
  adminDb: { collection },
}));

const { enrollmentRepository } = await import("./enrollmentRepository");
const { NotFoundError } = await import("@/lib/errors");

const rawEnrollmentData = {
  studentId: "student-1",
  courseId: "course-1",
  teacherId: "teacher-1",
  status: "active",
  enrollmentDate: 1000,
  progress: { completedLessonIds: ["lesson-1"], percent: 50 },
};

describe("enrollmentRepository.findByStudentAndCourse", () => {
  beforeEach(() => vi.clearAllMocks());

  it("looks up the deterministic student_course doc id", async () => {
    getDoc.mockResolvedValue({ exists: true, id: "student-1_course-1", data: () => rawEnrollmentData });

    const result = await enrollmentRepository.findByStudentAndCourse("student-1", "course-1");

    expect(doc).toHaveBeenCalledWith("student-1_course-1");
    expect(result).toEqual({ id: "student-1_course-1", ...rawEnrollmentData });
  });

  it("returns null when no enrollment exists for the pair", async () => {
    getDoc.mockResolvedValue({ exists: false });
    await expect(enrollmentRepository.findByStudentAndCourse("student-1", "course-1")).resolves.toBeNull();
  });
});

describe("enrollmentRepository.create", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates at the deterministic id via .create() (fails instead of overwriting)", async () => {
    createDoc.mockResolvedValue(undefined);

    const enrollment = await enrollmentRepository.create({
      studentId: "student-1",
      courseId: "course-1",
      teacherId: "teacher-1",
      status: "active",
      enrollmentDate: 1000,
      progress: { completedLessonIds: [], percent: 0 },
    });

    expect(doc).toHaveBeenCalledWith("student-1_course-1");
    expect(createDoc).toHaveBeenCalled();
    expect(enrollment.id).toBe("student-1_course-1");
  });
});

describe("enrollmentRepository.updateProgress", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws NotFoundError when the enrollment doesn't exist", async () => {
    getDoc.mockResolvedValue({ exists: false });
    await expect(
      enrollmentRepository.updateProgress("student-1_course-1", { completedLessonIds: [], percent: 0 }, "active"),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("writes progress and status, leaving other fields untouched", async () => {
    getDoc.mockResolvedValue({ exists: true, id: "student-1_course-1", data: () => rawEnrollmentData });
    updateDoc.mockResolvedValue(undefined);

    const nextProgress = { completedLessonIds: ["lesson-1", "lesson-2"], percent: 100 };
    const result = await enrollmentRepository.updateProgress("student-1_course-1", nextProgress, "completed");

    expect(updateDoc).toHaveBeenCalledWith({ progress: nextProgress, status: "completed" });
    expect(result.progress).toEqual(nextProgress);
    expect(result.status).toBe("completed");
    expect(result.studentId).toBe("student-1");
  });
});

describe("enrollmentRepository.listAllByTeacherId", () => {
  beforeEach(() => vi.clearAllMocks());

  it("queries unscoped by raw teacherId (no Session — TASK-2002's cron job)", async () => {
    getQuery.mockResolvedValue({ docs: [{ id: "student-1_course-1", data: () => rawEnrollmentData }] });

    const result = await enrollmentRepository.listAllByTeacherId("teacher-1");

    expect(where).toHaveBeenCalledWith("teacherId", "==", "teacher-1");
    expect(result).toHaveLength(1);
  });
});
