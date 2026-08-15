import { beforeEach, describe, expect, it, vi } from "vitest";

const getDoc = vi.fn();
const doc = vi.fn(() => ({ get: getDoc }));
const getQuery = vi.fn();
const limit = vi.fn(() => ({ get: getQuery }));
const where3 = vi.fn(() => ({ limit, get: getQuery }));
const where2 = vi.fn(() => ({ where: where3, limit, get: getQuery }));
const where1 = vi.fn(() => ({ where: where2, limit, get: getQuery }));
const collection = vi.fn(() => ({ doc, where: where1 }));

vi.mock("@/lib/server/firebaseAdmin", () => ({
  adminDb: { collection },
}));

const { publicRepository } = await import("./publicRepository");

describe("publicRepository.findTeacherProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns public fields only for a public profile", async () => {
    getDoc.mockResolvedValue({
      exists: true,
      id: "teacher-1",
      data: () => ({
        displayName: "Mona",
        slug: "mona",
        bio: "Math teacher",
        avatarUrl: "https://cdn.example.com/mona.jpg",
        isPublic: true,
        teacherId: "teacher-1",
      }),
    });

    await expect(publicRepository.findTeacherProfile("teacher-1")).resolves.toEqual({
      teacherId: "teacher-1",
      slug: "mona",
      displayName: "Mona",
      bio: "Math teacher",
      avatarUrl: "https://cdn.example.com/mona.jpg",
    });
    expect(collection).toHaveBeenCalledWith("teacherProfiles");
    expect(doc).toHaveBeenCalledWith("teacher-1");
  });

  it("returns null when the profile is not public", async () => {
    getDoc.mockResolvedValue({
      exists: true,
      id: "teacher-1",
      data: () => ({ displayName: "Mona", slug: "mona", isPublic: false }),
    });

    await expect(publicRepository.findTeacherProfile("teacher-1")).resolves.toBeNull();
  });

  it("returns null when the profile does not exist", async () => {
    getDoc.mockResolvedValue({ exists: false });

    await expect(publicRepository.findTeacherProfile("teacher-1")).resolves.toBeNull();
  });
});

describe("publicRepository.findTeacherProfileBySlug", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the public profile for a matching public slug", async () => {
    getQuery.mockResolvedValue({
      docs: [
        {
          id: "teacher-1",
          data: () => ({ displayName: "Mona", slug: "mona", isPublic: true }),
        },
      ],
    });

    await expect(publicRepository.findTeacherProfileBySlug("mona")).resolves.toEqual({
      teacherId: "teacher-1",
      slug: "mona",
      displayName: "Mona",
    });
    expect(where1).toHaveBeenCalledWith("slug", "==", "mona");
  });

  it("returns null when the matching profile is not public", async () => {
    getQuery.mockResolvedValue({
      docs: [{ id: "teacher-1", data: () => ({ displayName: "Mona", slug: "mona", isPublic: false }) }],
    });

    await expect(publicRepository.findTeacherProfileBySlug("mona")).resolves.toBeNull();
  });

  it("returns null when no profile matches the slug", async () => {
    getQuery.mockResolvedValue({ docs: [] });

    await expect(publicRepository.findTeacherProfileBySlug("missing")).resolves.toBeNull();
  });
});

describe("publicRepository.listPublishedCoursesByTeacher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("only queries status == published, scoped to the teacher", async () => {
    getQuery.mockResolvedValue({
      docs: [
        {
          id: "course-1",
          data: () => ({
            teacherId: "teacher-1",
            slug: "algebra-1",
            status: "published",
            title: { en: "Algebra I", ar: "الجبر ١" },
          }),
        },
      ],
    });

    await expect(publicRepository.listPublishedCoursesByTeacher("teacher-1")).resolves.toEqual([
      {
        id: "course-1",
        teacherId: "teacher-1",
        slug: "algebra-1",
        title: { en: "Algebra I", ar: "الجبر ١" },
      },
    ]);
    expect(where1).toHaveBeenCalledWith("teacherId", "==", "teacher-1");
    expect(where2).toHaveBeenCalledWith("status", "==", "published");
  });
});

describe("publicRepository.findPublishedCourseBySlug", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the published course matching the slug", async () => {
    getQuery.mockResolvedValue({
      docs: [
        {
          id: "course-1",
          data: () => ({
            teacherId: "teacher-1",
            slug: "algebra-1",
            status: "published",
            title: { en: "Algebra I", ar: "الجبر ١" },
          }),
        },
      ],
    });

    await expect(publicRepository.findPublishedCourseBySlug("algebra-1")).resolves.toEqual({
      id: "course-1",
      teacherId: "teacher-1",
      slug: "algebra-1",
      title: { en: "Algebra I", ar: "الجبر ١" },
    });
    expect(where1).toHaveBeenCalledWith("slug", "==", "algebra-1");
    expect(where2).toHaveBeenCalledWith("status", "==", "published");
  });

  it("returns null when no published course matches the slug", async () => {
    getQuery.mockResolvedValue({ docs: [] });

    await expect(publicRepository.findPublishedCourseBySlug("missing")).resolves.toBeNull();
  });
});

describe("publicRepository.findPublishedCourseByTeacherAndSlug", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when no published course matches", async () => {
    getQuery.mockResolvedValue({ docs: [] });

    await expect(
      publicRepository.findPublishedCourseByTeacherAndSlug("teacher-1", "missing"),
    ).resolves.toBeNull();
  });
});
