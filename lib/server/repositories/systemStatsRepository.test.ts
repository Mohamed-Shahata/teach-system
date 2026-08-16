import { beforeEach, describe, expect, it, vi } from "vitest";

const getDoc = vi.fn();
const set = vi.fn();
const doc = vi.fn(() => ({ get: getDoc, set }));
const collection = vi.fn(() => ({ doc }));

vi.mock("@/lib/server/firebaseAdmin", () => ({
  adminDb: { collection },
}));

const { EMPTY_SYSTEM_STATS, systemStatsRepository } = await import("./systemStatsRepository");

describe("systemStatsRepository.find", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reads stats from systemStats/global", async () => {
    getDoc.mockResolvedValue({
      exists: true,
      data: () => ({
        totalTeachers: 5,
        totalStudents: 40,
        totalCourses: 12,
        totalPublishedCourses: 9,
        totalEnrollments: 60,
        totalPublishedLessons: 88,
      }),
    });

    await expect(systemStatsRepository.find()).resolves.toEqual({
      totalTeachers: 5,
      totalStudents: 40,
      totalCourses: 12,
      totalPublishedCourses: 9,
      totalEnrollments: 60,
      totalPublishedLessons: 88,
    });
    expect(collection).toHaveBeenCalledWith("systemStats");
    expect(doc).toHaveBeenCalledWith("global");
  });

  it("defaults missing counters to zero", async () => {
    getDoc.mockResolvedValue({
      exists: true,
      data: () => ({ totalCourses: 3 }),
    });

    await expect(systemStatsRepository.find()).resolves.toEqual({
      ...EMPTY_SYSTEM_STATS,
      totalCourses: 3,
    });
  });

  it("returns empty stats when the doc doesn't exist yet", async () => {
    getDoc.mockResolvedValue({ exists: false });

    await expect(systemStatsRepository.find()).resolves.toEqual(EMPTY_SYSTEM_STATS);
  });
});

describe("systemStatsRepository.incrementStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("merges an increment into systemStats/global", async () => {
    set.mockResolvedValue(undefined);

    await systemStatsRepository.incrementStats({ totalTeachers: 1 });

    expect(collection).toHaveBeenCalledWith("systemStats");
    expect(doc).toHaveBeenCalledWith("global");
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ totalTeachers: expect.anything() }), {
      merge: true,
    });
  });
});
