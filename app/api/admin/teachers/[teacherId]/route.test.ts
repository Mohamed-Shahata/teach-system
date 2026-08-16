import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSession = vi.fn();
const getTeacherDetail = vi.fn();
const setTeacherDisabled = vi.fn();

vi.mock("@/lib/auth/session", () => ({ requireSession }));
vi.mock("@/lib/server/services/teacherManagementService", () => ({
  teacherManagementService: { getTeacherDetail, setTeacherDisabled },
}));

const { GET, PATCH } = await import("./route");
const { ForbiddenError, NotFoundError } = await import("@/lib/errors");

function makeContext(teacherId = "t1") {
  return { params: Promise.resolve({ teacherId }) };
}

describe("GET /api/admin/teachers/[teacherId]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the teacher detail", async () => {
    requireSession.mockResolvedValue({ uid: "admin-1", email: "a@b.com", role: "admin" });
    getTeacherDetail.mockResolvedValue({ uid: "t1" });

    const res = await GET(new Request("http://localhost/api/admin/teachers/t1"), makeContext());

    expect(res.status).toBe(200);
    expect(getTeacherDetail).toHaveBeenCalledWith({ uid: "admin-1", email: "a@b.com", role: "admin" }, "t1");
  });

  it("returns 404 when the teacher doesn't exist", async () => {
    requireSession.mockResolvedValue({ uid: "admin-1", email: "a@b.com", role: "admin" });
    getTeacherDetail.mockRejectedValue(new NotFoundError());

    const res = await GET(new Request("http://localhost/api/admin/teachers/missing"), makeContext("missing"));

    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/admin/teachers/[teacherId]", () => {
  beforeEach(() => vi.clearAllMocks());

  function makeRequest(body: unknown) {
    return new Request("http://localhost/api/admin/teachers/t1", {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  it("deactivates the teacher", async () => {
    requireSession.mockResolvedValue({ uid: "admin-1", email: "a@b.com", role: "admin" });
    setTeacherDisabled.mockResolvedValue({ uid: "t1", disabled: true });

    const res = await PATCH(makeRequest({ disabled: true }), makeContext());

    expect(res.status).toBe(200);
    expect(setTeacherDisabled).toHaveBeenCalledWith(
      { uid: "admin-1", email: "a@b.com", role: "admin" },
      "t1",
      true,
    );
  });

  it("returns 403 for a non-admin session", async () => {
    requireSession.mockResolvedValue({ uid: "teacher-1", email: "t@b.com", role: "teacher" });
    setTeacherDisabled.mockRejectedValue(new ForbiddenError());

    const res = await PATCH(makeRequest({ disabled: true }), makeContext());

    expect(res.status).toBe(403);
  });

  it("rejects a malformed body", async () => {
    requireSession.mockResolvedValue({ uid: "admin-1", email: "a@b.com", role: "admin" });

    const res = await PATCH(makeRequest({ disabled: "yes" }), makeContext());

    expect(res.status).toBe(400);
    expect(setTeacherDisabled).not.toHaveBeenCalled();
  });
});
