import { beforeEach, describe, expect, it, vi } from "vitest";

const getDoc = vi.fn();
const createDoc = vi.fn();
const deleteDoc = vi.fn();
const docId = vi.fn(() => "file-1");
const doc = vi.fn(() => ({ id: docId(), get: getDoc, create: createDoc, delete: deleteDoc }));
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

const { fileRepository } = await import("./fileRepository");
const { NotFoundError, ForbiddenError } = await import("@/lib/errors");

function makeSession(role: "admin" | "teacher" | "student", uid = "teacher-1") {
  return { uid, email: `${uid}@example.com`, role };
}

const rawFileData = {
  teacherId: "teacher-1",
  courseId: "course-1",
  lessonId: "lesson-1",
  fileName: "notes.pdf",
  fileType: "application/pdf",
  fileSize: 1024,
  url: "https://res.cloudinary.com/test/raw/upload/v1/notes.pdf",
  publicId: "teachers/teacher-1/courses/course-1/lessons/lesson-1/files/notes",
  createdAt: 1000,
};

describe("fileRepository.findById", () => {
  beforeEach(() => vi.clearAllMocks());

  it("maps a Firestore doc into a FileDoc", async () => {
    getDoc.mockResolvedValue({ exists: true, id: "file-1", data: () => rawFileData });

    await expect(fileRepository.findById("file-1")).resolves.toEqual({
      id: "file-1",
      ...rawFileData,
    });
  });

  it("returns null when missing", async () => {
    getDoc.mockResolvedValue({ exists: false });
    await expect(fileRepository.findById("nope")).resolves.toBeNull();
  });
});

describe("fileRepository.listByCourse / listByLesson", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists and sorts by createdAt desc", async () => {
    getQuery.mockResolvedValue({
      docs: [
        { id: "file-1", data: () => ({ ...rawFileData, createdAt: 1000 }) },
        { id: "file-2", data: () => ({ ...rawFileData, createdAt: 2000 }) },
      ],
    });

    const result = await fileRepository.listByCourse("course-1");

    expect(where).toHaveBeenCalledWith("courseId", "==", "course-1");
    expect(result.map((f) => f.id)).toEqual(["file-2", "file-1"]);
  });

  it("scopes listByLesson by lessonId", async () => {
    getQuery.mockResolvedValue({ docs: [] });
    await fileRepository.listByLesson("lesson-1");
    expect(where).toHaveBeenCalledWith("lessonId", "==", "lesson-1");
  });
});

describe("fileRepository.create", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a new file doc", async () => {
    createDoc.mockResolvedValue(undefined);

    const result = await fileRepository.create({ ...rawFileData });

    expect(createDoc).toHaveBeenCalledWith(rawFileData);
    expect(result).toEqual({ id: "file-1", ...rawFileData });
  });
});

describe("fileRepository.delete", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes when the caller owns the file", async () => {
    getDoc.mockResolvedValue({ exists: true, id: "file-1", data: () => rawFileData });
    deleteDoc.mockResolvedValue(undefined);

    const result = await fileRepository.delete(makeSession("teacher", "teacher-1"), "file-1");

    expect(deleteDoc).toHaveBeenCalled();
    expect(result).toEqual({ id: "file-1", ...rawFileData });
  });

  it("throws NotFoundError when the file doesn't exist", async () => {
    getDoc.mockResolvedValue({ exists: false });
    await expect(fileRepository.delete(makeSession("teacher"), "nope")).rejects.toBeInstanceOf(NotFoundError);
    expect(deleteDoc).not.toHaveBeenCalled();
  });

  it("throws ForbiddenError when another teacher owns the file", async () => {
    getDoc.mockResolvedValue({ exists: true, id: "file-1", data: () => rawFileData });
    await expect(
      fileRepository.delete(makeSession("teacher", "teacher-2"), "file-1"),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(deleteDoc).not.toHaveBeenCalled();
  });
});
