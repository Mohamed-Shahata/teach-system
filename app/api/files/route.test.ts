import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSession = vi.fn();
const listFiles = vi.fn();
const createFile = vi.fn();

vi.mock("@/lib/auth/session", () => ({ requireSession }));
vi.mock("@/lib/server/services/fileService", () => ({
  fileService: { listFiles, createFile },
}));

const { GET, POST } = await import("./route");
const { ForbiddenError } = await import("@/lib/errors");

const session = { uid: "teacher-1", email: "teacher@example.com", role: "teacher" };

function makeGetRequest(query: string) {
  return new Request(`http://localhost/api/files${query}`);
}

function makePostRequest(body: unknown) {
  return new Request("http://localhost/api/files", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("/api/files", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireSession.mockResolvedValue(session);
  });

  it("lists files scoped by courseId", async () => {
    listFiles.mockResolvedValue([{ id: "file-1" }]);

    const res = await GET(makeGetRequest("?courseId=course-1"));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ files: [{ id: "file-1" }] });
    expect(listFiles).toHaveBeenCalledWith(session, { courseId: "course-1", lessonId: undefined });
  });

  it("lists files scoped by lessonId", async () => {
    listFiles.mockResolvedValue([]);
    await GET(makeGetRequest("?lessonId=lesson-1"));
    expect(listFiles).toHaveBeenCalledWith(session, { courseId: undefined, lessonId: "lesson-1" });
  });

  it("lists every file for the caller's own teacherId when neither courseId nor lessonId is given (TASK-1304)", async () => {
    listFiles.mockResolvedValue([{ id: "file-1" }, { id: "file-2" }]);

    const res = await GET(makeGetRequest(""));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ files: [{ id: "file-1" }, { id: "file-2" }] });
    expect(listFiles).toHaveBeenCalledWith(session, { courseId: undefined, lessonId: undefined });
  });

  it("creates a file", async () => {
    const input = {
      lessonId: "lesson-1",
      fileName: "notes.pdf",
      fileType: "application/pdf",
      fileSize: 100,
      url: "https://res.cloudinary.com/test/raw/upload/notes.pdf",
      publicId: "x",
    };
    createFile.mockResolvedValue({ id: "file-1", ...input });

    const res = await POST(makePostRequest(input));

    expect(res.status).toBe(201);
    expect(createFile).toHaveBeenCalledWith(session, input);
  });

  it("maps ownership errors on create", async () => {
    createFile.mockRejectedValue(new ForbiddenError());
    const res = await POST(
      makePostRequest({
        lessonId: "lesson-1",
        fileName: "x.pdf",
        fileType: "application/pdf",
        fileSize: 1,
        url: "https://res.cloudinary.com/x.pdf",
        publicId: "x",
      }),
    );
    expect(res.status).toBe(403);
  });

  it("returns 400 for an invalid body", async () => {
    const res = await POST(makePostRequest({ fileName: "x.pdf" }));
    expect(res.status).toBe(400);
    expect(createFile).not.toHaveBeenCalled();
  });
});
