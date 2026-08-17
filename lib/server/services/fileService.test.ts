import { beforeEach, describe, expect, it, vi } from "vitest";

const findFileById = vi.fn();
const createFileDoc = vi.fn();
const deleteFileDoc = vi.fn();
const listByCourse = vi.fn();
const listByLesson = vi.fn();
const listByTeacher = vi.fn();

const findLessonById = vi.fn();
const updateLesson = vi.fn();

const getCourse = vi.fn();
const destroyCloudinaryUpload = vi.fn();

vi.mock("@/lib/server/repositories/fileRepository", () => ({
  fileRepository: {
    findById: findFileById,
    create: createFileDoc,
    delete: deleteFileDoc,
    listByCourse,
    listByLesson,
    listByTeacher,
  },
}));

vi.mock("@/lib/server/repositories/lessonRepository", () => ({
  lessonRepository: { findById: findLessonById, update: updateLesson },
}));

vi.mock("@/lib/server/services/courseService", () => ({
  courseService: { getCourse },
}));

vi.mock("@/lib/server/cloudinary", () => ({
  destroyCloudinaryUpload,
  resourceTypeFromMimeType: (mime: string) =>
    mime.startsWith("image/") ? "image" : mime.startsWith("video/") ? "video" : "raw",
}));

const { fileService } = await import("./fileService");
const { ForbiddenError, NotFoundError } = await import("@/lib/errors");

function makeSession(role: "admin" | "teacher" | "student", uid = "teacher-1") {
  return { uid, email: `${uid}@example.com`, role };
}

const lesson = {
  id: "lesson-1",
  teacherId: "teacher-1",
  courseId: "course-1",
  title: { en: "Intro", ar: "مقدمة" },
  order: 0,
  fileIds: [],
  createdAt: 1,
  updatedAt: 1,
};

const file = {
  id: "file-1",
  teacherId: "teacher-1",
  courseId: "course-1",
  lessonId: "lesson-1",
  fileName: "notes.pdf",
  fileType: "application/pdf",
  fileSize: 100,
  url: "https://res.cloudinary.com/test/raw/upload/notes.pdf",
  publicId: "teachers/teacher-1/courses/course-1/lessons/lesson-1/files/notes",
  createdAt: 1,
};

beforeEach(() => vi.clearAllMocks());

describe("fileService.createFile", () => {
  it("rejects non-teacher sessions", async () => {
    await expect(
      fileService.createFile(makeSession("student"), {
        fileName: "x.pdf",
        fileType: "application/pdf",
        fileSize: 10,
        url: "https://res.cloudinary.com/x.pdf",
        publicId: "x",
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(createFileDoc).not.toHaveBeenCalled();
  });

  it("derives teacherId/courseId from the lesson and appends fileIds", async () => {
    findLessonById.mockResolvedValue(lesson);
    createFileDoc.mockResolvedValue(file);
    updateLesson.mockResolvedValue({ ...lesson, fileIds: ["file-1"] });

    const session = makeSession("teacher", "teacher-1");
    const result = await fileService.createFile(session, {
      lessonId: "lesson-1",
      fileName: "notes.pdf",
      fileType: "application/pdf",
      fileSize: 100,
      url: "https://res.cloudinary.com/test/raw/upload/notes.pdf",
      publicId: file.publicId,
    });

    expect(createFileDoc).toHaveBeenCalledWith(
      expect.objectContaining({ teacherId: "teacher-1", courseId: "course-1", lessonId: "lesson-1" }),
    );
    expect(updateLesson).toHaveBeenCalledWith(
      session,
      "lesson-1",
      expect.objectContaining({ fileIds: ["file-1"] }),
    );
    expect(result).toEqual(file);
  });

  it("rejects attaching to another teacher's lesson", async () => {
    findLessonById.mockResolvedValue(lesson);
    await expect(
      fileService.createFile(makeSession("teacher", "teacher-2"), {
        lessonId: "lesson-1",
        fileName: "notes.pdf",
        fileType: "application/pdf",
        fileSize: 100,
        url: "https://res.cloudinary.com/test/raw/upload/notes.pdf",
        publicId: "x",
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(createFileDoc).not.toHaveBeenCalled();
  });

  it("verifies course ownership when only courseId is given (no lesson)", async () => {
    getCourse.mockResolvedValue({ id: "course-1", teacherId: "teacher-1" });
    createFileDoc.mockResolvedValue({ ...file, lessonId: undefined });

    const session = makeSession("teacher", "teacher-1");
    await fileService.createFile(session, {
      courseId: "course-1",
      fileName: "syllabus.pdf",
      fileType: "application/pdf",
      fileSize: 50,
      url: "https://res.cloudinary.com/test/raw/upload/syllabus.pdf",
      publicId: "x",
    });

    expect(getCourse).toHaveBeenCalledWith(session, "course-1");
    expect(updateLesson).not.toHaveBeenCalled();
  });
});

describe("fileService.listFiles", () => {
  it("lists every file for the caller's own teacherId when neither courseId nor lessonId is given (TASK-1304)", async () => {
    listByTeacher.mockResolvedValue([file]);
    const result = await fileService.listFiles(makeSession("teacher"), {});
    expect(listByTeacher).toHaveBeenCalledWith("teacher-1");
    expect(result).toEqual([file]);
  });

  it("lists by lesson after verifying ownership", async () => {
    findLessonById.mockResolvedValue(lesson);
    listByLesson.mockResolvedValue([file]);

    const result = await fileService.listFiles(makeSession("teacher", "teacher-1"), { lessonId: "lesson-1" });

    expect(listByLesson).toHaveBeenCalledWith("lesson-1");
    expect(result).toEqual([file]);
  });

  it("lists by course after verifying ownership", async () => {
    getCourse.mockResolvedValue({ id: "course-1", teacherId: "teacher-1" });
    listByCourse.mockResolvedValue([file]);

    const session = makeSession("teacher", "teacher-1");
    const result = await fileService.listFiles(session, { courseId: "course-1" });

    expect(getCourse).toHaveBeenCalledWith(session, "course-1");
    expect(result).toEqual([file]);
  });
});

describe("fileService.deleteFile", () => {
  it("throws NotFoundError when the file doesn't exist", async () => {
    findFileById.mockResolvedValue(null);
    await expect(fileService.deleteFile(makeSession("teacher"), "nope")).rejects.toBeInstanceOf(NotFoundError);
    expect(destroyCloudinaryUpload).not.toHaveBeenCalled();
  });

  it("rejects deleting another teacher's file", async () => {
    findFileById.mockResolvedValue(file);
    await expect(
      fileService.deleteFile(makeSession("teacher", "teacher-2"), "file-1"),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(destroyCloudinaryUpload).not.toHaveBeenCalled();
    expect(deleteFileDoc).not.toHaveBeenCalled();
  });

  it("destroys the Cloudinary asset, deletes the doc, and pulls it out of the lesson's fileIds", async () => {
    findFileById.mockResolvedValue(file);
    destroyCloudinaryUpload.mockResolvedValue(undefined);
    deleteFileDoc.mockResolvedValue(file);
    findLessonById.mockResolvedValue({ ...lesson, fileIds: ["file-1", "file-2"] });
    updateLesson.mockResolvedValue(lesson);

    const session = makeSession("teacher", "teacher-1");
    const result = await fileService.deleteFile(session, "file-1");

    expect(destroyCloudinaryUpload).toHaveBeenCalledWith(file.publicId, "raw");
    expect(deleteFileDoc).toHaveBeenCalledWith(session, "file-1");
    expect(updateLesson).toHaveBeenCalledWith(
      session,
      "lesson-1",
      expect.objectContaining({ fileIds: ["file-2"] }),
    );
    expect(result).toEqual(file);
  });

  it("does not delete the Firestore doc if the Cloudinary destroy fails", async () => {
    findFileById.mockResolvedValue(file);
    destroyCloudinaryUpload.mockRejectedValue(new Error("Cloudinary destroy failed: HTTP 500"));

    await expect(fileService.deleteFile(makeSession("teacher", "teacher-1"), "file-1")).rejects.toThrow(
      "Cloudinary destroy failed",
    );
    expect(deleteFileDoc).not.toHaveBeenCalled();
  });
});
