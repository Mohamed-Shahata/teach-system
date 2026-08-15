import { beforeEach, describe, expect, it, vi } from "vitest";

const getCourse = vi.fn();
const signCloudinaryUpload = vi.fn();

vi.mock("@/lib/server/services/courseService", () => ({
  courseService: { getCourse },
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

  it("propagates a not-found/forbidden error from the ownership check instead of signing", async () => {
    const session = makeSession("teacher", "teacher-7");
    getCourse.mockRejectedValue(new NotFoundError());

    await expect(
      uploadService.signUpload(session, { target: "course-thumbnail", courseId: "someone-elses-course" }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(signCloudinaryUpload).not.toHaveBeenCalled();
  });
});
