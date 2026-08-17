import { beforeEach, describe, expect, it, vi } from "vitest";

const getDoc = vi.fn();
const doc = vi.fn(() => ({ get: getDoc }));
const getQuery = vi.fn();
const limit = vi.fn(() => ({ get: getQuery }));
const where = vi.fn(() => ({ limit, get: getQuery }));
const collection = vi.fn(() => ({ doc, where }));

vi.mock("@/lib/server/firebaseAdmin", () => ({
  adminDb: { collection },
}));

const { EMPTY_TEACHER_PROFILE_STATS, teacherProfileRepository } = await import(
  "./teacherProfileRepository"
);

describe("teacherProfileRepository.findStatsByTeacherId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reads stats from teacherProfiles/{teacherId}", async () => {
    getDoc.mockResolvedValue({
      exists: true,
      data: () => ({
        stats: {
          totalStudents: 12,
          totalCourses: 4,
          totalPublishedCourses: 3,
          totalLessons: 29,
          totalEnrollments: 18,
        },
      }),
    });

    await expect(teacherProfileRepository.findStatsByTeacherId("teacher-1")).resolves.toEqual({
      totalStudents: 12,
      totalCourses: 4,
      totalPublishedCourses: 3,
      totalLessons: 29,
      totalEnrollments: 18,
    });
    expect(collection).toHaveBeenCalledWith("teacherProfiles");
    expect(doc).toHaveBeenCalledWith("teacher-1");
  });

  it("defaults missing legacy counters to zero", async () => {
    getDoc.mockResolvedValue({
      exists: true,
      data: () => ({ stats: { totalCourses: 2 } }),
    });

    await expect(teacherProfileRepository.findStatsByTeacherId("teacher-1")).resolves.toEqual({
      ...EMPTY_TEACHER_PROFILE_STATS,
      totalCourses: 2,
    });
  });

  it("returns empty stats when the profile is missing", async () => {
    getDoc.mockResolvedValue({ exists: false });

    await expect(teacherProfileRepository.findStatsByTeacherId("teacher-1")).resolves.toEqual(
      EMPTY_TEACHER_PROFILE_STATS,
    );
  });
});

describe("teacherProfileRepository.findBySlug", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("looks up teacherProfiles by slug (global, not teacher-scoped)", async () => {
    getQuery.mockResolvedValue({
      docs: [
        {
          id: "teacher-1",
          data: () => ({ displayName: "Mona", slug: "mona", isPublic: true, createdAt: 100 }),
        },
      ],
    });

    await expect(teacherProfileRepository.findBySlug("mona")).resolves.toEqual({
      teacherId: "teacher-1",
      slug: "mona",
      displayName: "Mona",
      isPublic: true,
      stats: EMPTY_TEACHER_PROFILE_STATS,
      createdAt: 100,
    });
    expect(where).toHaveBeenCalledWith("slug", "==", "mona");
  });

  it("returns null when no profile matches the slug", async () => {
    getQuery.mockResolvedValue({ docs: [] });

    await expect(teacherProfileRepository.findBySlug("missing")).resolves.toBeNull();
  });

  it("reads a legacy plain-string bio as { en: <string> } (TASK-3101 migration)", async () => {
    getQuery.mockResolvedValue({
      docs: [
        {
          id: "teacher-1",
          data: () => ({ displayName: "Mona", slug: "mona", isPublic: true, createdAt: 100, bio: "Loves physics." }),
        },
      ],
    });

    const result = await teacherProfileRepository.findBySlug("mona");
    expect(result?.bio).toEqual({ en: "Loves physics." });
  });

  it("reads TASK-3101 fields (headline, yearsOfExperience, specialization, socialLinks) when present", async () => {
    getQuery.mockResolvedValue({
      docs: [
        {
          id: "teacher-1",
          data: () => ({
            displayName: "Mona",
            slug: "mona",
            isPublic: true,
            createdAt: 100,
            bio: { en: "Physics teacher", ar: "مدرسة فيزياء" },
            headline: { en: "10 years teaching IGCSE" },
            yearsOfExperience: 10,
            specialization: "IGCSE Physics",
            socialLinks: { facebook: "https://facebook.com/mona", whatsapp: "https://wa.me/201234567890" },
          }),
        },
      ],
    });

    const result = await teacherProfileRepository.findBySlug("mona");
    expect(result).toMatchObject({
      bio: { en: "Physics teacher", ar: "مدرسة فيزياء" },
      headline: { en: "10 years teaching IGCSE" },
      yearsOfExperience: 10,
      specialization: "IGCSE Physics",
      socialLinks: { facebook: "https://facebook.com/mona", whatsapp: "https://wa.me/201234567890" },
    });
  });

  it("omits TASK-3101 fields entirely when absent (old profiles stay valid)", async () => {
    getQuery.mockResolvedValue({
      docs: [{ id: "teacher-1", data: () => ({ displayName: "Mona", slug: "mona", isPublic: true, createdAt: 100 }) }],
    });

    const result = await teacherProfileRepository.findBySlug("mona");
    expect(result).not.toHaveProperty("bio");
    expect(result).not.toHaveProperty("headline");
    expect(result).not.toHaveProperty("yearsOfExperience");
    expect(result).not.toHaveProperty("specialization");
    expect(result).not.toHaveProperty("socialLinks");
  });
});

describe("teacherProfileRepository.updateDetails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("writes only the defined TASK-3101 fields", async () => {
    const update = vi.fn();
    doc.mockReturnValue({ get: getDoc, update } as unknown as ReturnType<typeof doc>);

    await teacherProfileRepository.updateDetails("teacher-1", {
      bio: { en: "Updated bio" },
      yearsOfExperience: 5,
      specialization: undefined,
    });

    expect(update).toHaveBeenCalledWith({ bio: { en: "Updated bio" }, yearsOfExperience: 5 });
  });

  it("does not call update when no fields are defined", async () => {
    const update = vi.fn();
    doc.mockReturnValue({ get: getDoc, update } as unknown as ReturnType<typeof doc>);

    await teacherProfileRepository.updateDetails("teacher-1", {});

    expect(update).not.toHaveBeenCalled();
  });
});

describe("teacherProfileRepository.listPublic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("queries isPublic == true and maps full profile fields", async () => {
    where.mockReturnValueOnce({ limit, get: getQuery });
    getQuery.mockResolvedValue({
      docs: [
        {
          id: "teacher-1",
          data: () => ({
            slug: "yara",
            displayName: "Yara",
            isPublic: true,
            subjectIds: ["physics"],
            headline: { en: "Physics teacher" },
            createdAt: 1,
          }),
        },
      ],
    });

    const result = await teacherProfileRepository.listPublic();

    expect(where).toHaveBeenCalledWith("isPublic", "==", true);
    expect(result).toEqual([
      expect.objectContaining({
        teacherId: "teacher-1",
        displayName: "Yara",
        subjectIds: ["physics"],
        headline: { en: "Physics teacher" },
        isPublic: true,
      }),
    ]);
  });
});
