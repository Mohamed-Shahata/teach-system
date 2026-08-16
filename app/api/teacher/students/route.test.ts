import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSession = vi.fn();
const createStudentByTeacher = vi.fn();
const listStudents = vi.fn();

vi.mock("@/lib/auth/session", () => ({ requireSession }));
vi.mock("@/lib/server/services/accountService", () => ({
  accountService: { createStudentByTeacher },
}));
vi.mock("@/lib/server/services/studentService", () => ({
  studentService: { listStudents },
}));

const { GET, POST } = await import("./route");
const { ForbiddenError } = await import("@/lib/errors");

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/teacher/students", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("GET /api/teacher/students", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the teacher's derived student list", async () => {
    const session = { uid: "teacher-1", email: "t@b.com", role: "teacher" };
    requireSession.mockResolvedValue(session);
    listStudents.mockResolvedValue([{ uid: "student-1", displayName: "Amira", courseCount: 2 }]);

    const res = await GET();

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      students: [{ uid: "student-1", displayName: "Amira", courseCount: 2 }],
    });
    expect(listStudents).toHaveBeenCalledWith(session);
  });

  it("maps role errors", async () => {
    requireSession.mockResolvedValue({ uid: "student-1", email: "s@b.com", role: "student" });
    listStudents.mockRejectedValue(new ForbiddenError());

    const res = await GET();

    expect(res.status).toBe(403);
  });
});

describe("POST /api/teacher/students", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates the student account and returns 201", async () => {
    requireSession.mockResolvedValue({ uid: "teacher-1", email: "t@b.com", role: "teacher" });
    createStudentByTeacher.mockResolvedValue({
      uid: "new-uid",
      email: "sara@example.com",
      displayName: "Sara",
      role: "student",
      resetLink: "https://example.com/reset",
    });

    const res = await POST(
      makeRequest({
        email: "sara@example.com",
        displayName: "Sara",
        phone: "01000000000",
        age: 12,
        stageId: "stage-1",
      }),
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.role).toBe("student");
    expect(createStudentByTeacher).toHaveBeenCalledWith(
      { uid: "teacher-1", email: "t@b.com", role: "teacher" },
      expect.objectContaining({ email: "sara@example.com", phone: "01000000000", age: 12, stageId: "stage-1" }),
    );
  });

  it("creates the student account without an email (phone-only)", async () => {
    requireSession.mockResolvedValue({ uid: "teacher-1", email: "t@b.com", role: "teacher" });
    createStudentByTeacher.mockResolvedValue({
      uid: "new-uid",
      email: "01000000000.abcd1234@placeholder.local",
      displayName: "Sara",
      role: "student",
      resetLink: "https://example.com/reset",
    });

    const res = await POST(
      makeRequest({ displayName: "Sara", phone: "01000000000", age: 12, stageId: "stage-1" }),
    );

    expect(res.status).toBe(201);
    expect(createStudentByTeacher).toHaveBeenCalledWith(
      { uid: "teacher-1", email: "t@b.com", role: "teacher" },
      expect.objectContaining({ phone: "01000000000", age: 12, stageId: "stage-1" }),
    );
  });

  it("returns 403 when the service rejects the role (non-teacher session)", async () => {
    requireSession.mockResolvedValue({ uid: "student-1", email: "s@b.com", role: "student" });
    createStudentByTeacher.mockRejectedValue(new ForbiddenError());

    const res = await POST(
      makeRequest({ email: "sara@example.com", displayName: "Sara", phone: "01000000000", age: 12, stageId: "stage-1" }),
    );

    expect(res.status).toBe(403);
  });

  it("returns 400 for an invalid body (missing stageId)", async () => {
    requireSession.mockResolvedValue({ uid: "teacher-1", email: "t@b.com", role: "teacher" });

    const res = await POST(
      makeRequest({ email: "sara@example.com", displayName: "Sara", phone: "01000000000", age: 12 }),
    );

    expect(res.status).toBe(400);
    expect(createStudentByTeacher).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid body (missing phone)", async () => {
    requireSession.mockResolvedValue({ uid: "teacher-1", email: "t@b.com", role: "teacher" });

    const res = await POST(
      makeRequest({ email: "sara@example.com", displayName: "Sara", age: 12, stageId: "stage-1" }),
    );

    expect(res.status).toBe(400);
    expect(createStudentByTeacher).not.toHaveBeenCalled();
  });
});
