import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSession = vi.fn();
const setTeacherPermissions = vi.fn();

vi.mock("@/lib/auth/session", () => ({ requireSession }));
vi.mock("@/lib/server/services/teacherManagementService", () => ({
  teacherManagementService: { setTeacherPermissions },
}));

const { PATCH } = await import("./route");
const { ForbiddenError, NotFoundError } = await import("@/lib/errors");

function makeContext(teacherId = "t1") {
  return { params: Promise.resolve({ teacherId }) };
}

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/admin/teachers/t1/permissions", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/admin/teachers/[teacherId]/permissions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates canCreateStudents", async () => {
    requireSession.mockResolvedValue({ uid: "admin-1", email: "a@b.com", role: "admin" });
    setTeacherPermissions.mockResolvedValue({ uid: "t1", canCreateStudents: false });

    const res = await PATCH(makeRequest({ canCreateStudents: false }), makeContext());

    expect(res.status).toBe(200);
    expect(setTeacherPermissions).toHaveBeenCalledWith(
      { uid: "admin-1", email: "a@b.com", role: "admin" },
      "t1",
      false,
    );
  });

  it("returns 403 for a non-admin session", async () => {
    requireSession.mockResolvedValue({ uid: "teacher-1", email: "t@b.com", role: "teacher" });
    setTeacherPermissions.mockRejectedValue(new ForbiddenError());

    const res = await PATCH(makeRequest({ canCreateStudents: false }), makeContext());

    expect(res.status).toBe(403);
  });

  it("returns 404 when the teacher doesn't exist", async () => {
    requireSession.mockResolvedValue({ uid: "admin-1", email: "a@b.com", role: "admin" });
    setTeacherPermissions.mockRejectedValue(new NotFoundError());

    const res = await PATCH(makeRequest({ canCreateStudents: false }), makeContext("missing"));

    expect(res.status).toBe(404);
  });

  it("rejects a malformed body", async () => {
    requireSession.mockResolvedValue({ uid: "admin-1", email: "a@b.com", role: "admin" });

    const res = await PATCH(makeRequest({ canCreateStudents: "no" }), makeContext());

    expect(res.status).toBe(400);
    expect(setTeacherPermissions).not.toHaveBeenCalled();
  });
});
