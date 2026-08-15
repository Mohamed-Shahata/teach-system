import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSession = vi.fn();
const getStudentDetail = vi.fn();

vi.mock("@/lib/auth/session", () => ({ requireSession }));
vi.mock("@/lib/server/services/studentService", () => ({
  studentService: { getStudentDetail },
}));

const { GET } = await import("./route");
const { NotFoundError } = await import("@/lib/errors");

const session = { uid: "teacher-1", email: "teacher@example.com", role: "teacher" };
const context = { params: Promise.resolve({ studentId: "student-1" }) };

describe("/api/teacher/students/[studentId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireSession.mockResolvedValue(session);
  });

  it("returns the student's detail view", async () => {
    getStudentDetail.mockResolvedValue({ uid: "student-1", displayName: "Amira", courses: [] });

    const res = await GET(new Request("http://localhost/api/teacher/students/student-1"), context);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      student: { uid: "student-1", displayName: "Amira", courses: [] },
    });
    expect(getStudentDetail).toHaveBeenCalledWith(session, "student-1");
  });

  it("returns 404 for a student not visible to this teacher", async () => {
    getStudentDetail.mockRejectedValue(new NotFoundError());

    const res = await GET(new Request("http://localhost/api/teacher/students/student-1"), context);

    expect(res.status).toBe(404);
  });
});
