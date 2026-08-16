import { beforeEach, describe, expect, it, vi } from "vitest";

const getDoc = vi.fn();
const setDoc = vi.fn();
const doc = vi.fn(() => ({ get: getDoc, set: setDoc }));
const getAll = vi.fn();
const collection = vi.fn(() => ({ doc }));

vi.mock("@/lib/server/firebaseAdmin", () => ({
  adminDb: { collection, getAll },
}));

const { lessonProgressRepository } = await import("./lessonProgressRepository");

const rawProgressData = {
  studentId: "student-1",
  lessonId: "lesson-1",
  watchedSeconds: 42,
  videoDurationSeconds: 300,
  lastPositionSeconds: 42,
  updatedAt: 1000,
};

describe("lessonProgressRepository.findByStudentAndLesson", () => {
  beforeEach(() => vi.clearAllMocks());

  it("looks up the deterministic student_lesson doc id", async () => {
    getDoc.mockResolvedValue({ exists: true, id: "student-1_lesson-1", data: () => rawProgressData });

    const result = await lessonProgressRepository.findByStudentAndLesson("student-1", "lesson-1");

    expect(doc).toHaveBeenCalledWith("student-1_lesson-1");
    expect(result).toEqual({ id: "student-1_lesson-1", ...rawProgressData });
  });

  it("returns null when no progress doc exists for the pair", async () => {
    getDoc.mockResolvedValue({ exists: false });
    await expect(lessonProgressRepository.findByStudentAndLesson("student-1", "lesson-1")).resolves.toBeNull();
  });
});

describe("lessonProgressRepository.upsert", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sets (not creates) at the deterministic id, since repeated writes are the expected steady state", async () => {
    setDoc.mockResolvedValue(undefined);

    const progress = await lessonProgressRepository.upsert(rawProgressData);

    expect(doc).toHaveBeenCalledWith("student-1_lesson-1");
    expect(setDoc).toHaveBeenCalledWith(rawProgressData);
    expect(progress).toEqual({ id: "student-1_lesson-1", ...rawProgressData });
  });
});

describe("lessonProgressRepository.listByStudentForLessons", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns [] without calling getAll for an empty lesson list", async () => {
    const result = await lessonProgressRepository.listByStudentForLessons("student-1", []);
    expect(result).toEqual([]);
    expect(getAll).not.toHaveBeenCalled();
  });

  it("batch-gets the deterministic ids and skips missing docs", async () => {
    getAll.mockResolvedValue([
      { exists: true, id: "student-1_lesson-1", data: () => rawProgressData },
      { exists: false, id: "student-1_lesson-2" },
    ]);

    const result = await lessonProgressRepository.listByStudentForLessons("student-1", ["lesson-1", "lesson-2"]);

    expect(doc).toHaveBeenCalledWith("student-1_lesson-1");
    expect(doc).toHaveBeenCalledWith("student-1_lesson-2");
    expect(result).toEqual([{ id: "student-1_lesson-1", ...rawProgressData }]);
  });
});
