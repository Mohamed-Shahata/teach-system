import { beforeEach, describe, expect, it, vi } from "vitest";

const getCourse = vi.fn();
const signCloudinaryUpload = vi.fn();
const findLessonById = vi.fn();

vi.mock("@/lib/server/services/courseService", () => ({
  courseService: { getCourse },
}));

vi.mock("@/lib/server/repositories/lessonRepository", () => ({
  lessonRepository: { findById: findLessonById },
}));

vi.mock("@/lib/server/cloudinary", () => ({
  signCloudinaryUpload,
}));

const { uploadService } = await import("./uploadService");
const { ForbiddenError, NotFoundError } = await import("@/lib/errors");

function makeSession(role: "admin" | "teacher" | "student", uid = "teacher-1") {
  return { uid, email: `${uid}@example.com`, role };
}

describe("uploadService.signUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signCloudinaryUpload.mockImplementation(({ folder, timestamp }) => ({
      signature: "sig",
      timestamp,
      apiKey: "key",
      cloudName: "cloud",
      folder,
    }));
  });

  it("signs an avatar upload for a student session into a per-uid folder", async () => {
    const result = await uploadService.signUpload(makeSession("student", "student-1"), {
      target: "avatar",
    });
    expect(result.folder).toBe("students/student-1/avatar");
  });

  it("signs an avatar upload for a teacher session too", async () => {
    const result = await uploadService.signUpload(makeSession("teacher", "teacher-1"), {
      target: "avatar",
    });
    expect(result.folder).toBe("teachers/teacher-1/avatar");
  });

  it("rejects non-teacher sessions", async () => {
    await expect(
      uploadService.signUpload(makeSession("student"), { target: "course-thumbnail" }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(signCloudinaryUpload).not.toHaveBeenCalled();
  });

  it("signs into a per-teacher staging folder when no courseId is given (create flow)", async () => {
    const session = makeSession("teacher", "teacher-7");

    const result = await uploadService.signUpload(session, { target: "course-thumbnail" });

    expect(getCourse).not.toHaveBeenCalled();
    expect(result.folder).toBe("teachers/teacher-7/courses/_pending/thumbnail");
  });

  it("verifies course ownership and signs into the course's folder when courseId is given (edit flow)", async () => {
    const session = makeSession("teacher", "teacher-7");
    getCourse.mockResolvedValue({ id: "course-1", teacherId: "teacher-7" });

    const result = await uploadService.signUpload(session, { target: "course-thumbnail", courseId: "course-1" });

    expect(getCourse).toHaveBeenCalledWith(session, "course-1");
    expect(result.folder).toBe("teachers/teacher-7/courses/course-1/thumbnail");
  });

  it("propagates a not-found/forbidden error from the course ownership check instead of signing", async () => {
    const session = makeSession("teacher", "teacher-7");
    getCourse.mockRejectedValue(new NotFoundError());

    await expect(
      uploadService.signUpload(session, { target: "course-thumbnail", courseId: "someone-elses-course" }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(signCloudinaryUpload).not.toHaveBeenCalled();
  });

  it("rejects a lesson-file target without a lessonId", async () => {
    const session = makeSession("teacher", "teacher-7");
    await expect(uploadService.signUpload(session, { target: "lesson-file" })).rejects.toThrow();
    expect(signCloudinaryUpload).not.toHaveBeenCalled();
  });

  it("throws NotFoundError for a lesson-file target with an unknown lessonId", async () => {
    findLessonById.mockResolvedValue(null);
    await expect(
      uploadService.signUpload(makeSession("teacher", "teacher-7"), {
        target: "lesson-file",
        lessonId: "nope",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects a lesson-file target for another teacher's lesson", async () => {
    findLessonById.mockResolvedValue({ id: "lesson-1", teacherId: "teacher-1", courseId: "course-1" });
    await expect(
      uploadService.signUpload(makeSession("teacher", "teacher-7"), {
        target: "lesson-file",
        lessonId: "lesson-1",
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("signs into the lesson's own course/lesson folder, derived from the lesson itself", async () => {
    findLessonById.mockResolvedValue({ id: "lesson-1", teacherId: "teacher-7", courseId: "course-1" });
    const session = makeSession("teacher", "teacher-7");

    const result = await uploadService.signUpload(session, { target: "lesson-file", lessonId: "lesson-1" });

    expect(result.folder).toBe("teachers/teacher-7/courses/course-1/lessons/lesson-1/files");
  });

  it("rejects a lesson-video target without a lessonId", async () => {
    const session = makeSession("teacher", "teacher-7");
    await expect(uploadService.signUpload(session, { target: "lesson-video" })).rejects.toThrow();
    expect(signCloudinaryUpload).not.toHaveBeenCalled();
  });

  it("throws NotFoundError for a lesson-video target with an unknown lessonId", async () => {
    findLessonById.mockResolvedValue(null);
    await expect(
      uploadService.signUpload(makeSession("teacher", "teacher-7"), {
        target: "lesson-video",
        lessonId: "nope",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects a lesson-video target for another teacher's lesson", async () => {
    findLessonById.mockResolvedValue({ id: "lesson-1", teacherId: "teacher-1", courseId: "course-1" });
    await expect(
      uploadService.signUpload(makeSession("teacher", "teacher-7"), {
        target: "lesson-video",
        lessonId: "lesson-1",
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("signs a lesson-video target into the reserved .../video/ folder, distinct from lesson-file's", async () => {
    findLessonById.mockResolvedValue({ id: "lesson-1", teacherId: "teacher-7", courseId: "course-1" });
    const session = makeSession("teacher", "teacher-7");

    const result = await uploadService.signUpload(session, { target: "lesson-video", lessonId: "lesson-1" });

    expect(result.folder).toBe("teachers/teacher-7/courses/course-1/lessons/lesson-1/video");
  });
});