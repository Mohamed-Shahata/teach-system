import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSession = vi.fn();
const createStudentByTeacher = vi.fn();

vi.mock("@/lib/auth/session", () => ({ requireSession }));
vi.mock("@/lib/server/services/accountService", () => ({
  accountService: { createStudentByTeacher },
}));

const { POST } = await import("./route");
const { ForbiddenError } = await import("@/lib/errors");

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/teacher/students", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

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
      makeRequest({ email: "sara@example.com", displayName: "Sara", stageId: "stage-1" }),
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.role).toBe("student");
    expect(createStudentByTeacher).toHaveBeenCalledWith(
      { uid: "teacher-1", email: "t@b.com", role: "teacher" },
      expect.objectContaining({ email: "sara@example.com", stageId: "stage-1" }),
    );
  });

  it("returns 403 when the service rejects the role (non-teacher session)", async () => {
    requireSession.mockResolvedValue({ uid: "student-1", email: "s@b.com", role: "student" });
    createStudentByTeacher.mockRejectedValue(new ForbiddenError());

    const res = await POST(
      makeRequest({ email: "sara@example.com", displayName: "Sara", stageId: "stage-1" }),
    );

    expect(res.status).toBe(403);
  });

  it("returns 400 for an invalid body (missing stageId)", async () => {
    requireSession.mockResolvedValue({ uid: "teacher-1", email: "t@b.com", role: "teacher" });

    const res = await POST(makeRequest({ email: "sara@example.com", displayName: "Sara" }));

    expect(res.status).toBe(400);
    expect(createStudentByTeacher).not.toHaveBeenCalled();
  });
});
