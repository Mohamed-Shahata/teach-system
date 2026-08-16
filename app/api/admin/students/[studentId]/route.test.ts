import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSession = vi.fn();
const getStudentDetail = vi.fn();
const setStudentDisabled = vi.fn();

vi.mock("@/lib/auth/session", () => ({ requireSession }));
vi.mock("@/lib/server/services/studentManagementService", () => ({
  studentManagementService: { getStudentDetail, setStudentDisabled },
}));

const { GET, PATCH } = await import("./route");
const { ForbiddenError, NotFoundError } = await import("@/lib/errors");

function makeContext(studentId = "s1") {
  return { params: Promise.resolve({ studentId }) };
}

describe("GET /api/admin/students/[studentId]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the student detail", async () => {
    requireSession.mockResolvedValue({ uid: "admin-1", email: "a@b.com", role: "admin" });
    getStudentDetail.mockResolvedValue({ uid: "s1" });

    const res = await GET(new Request("http://localhost/api/admin/students/s1"), makeContext());

    expect(res.status).toBe(200);
    expect(getStudentDetail).toHaveBeenCalledWith({ uid: "admin-1", email: "a@b.com", role: "admin" }, "s1");
  });

  it("returns 404 when the student doesn't exist", async () => {
    requireSession.mockResolvedValue({ uid: "admin-1", email: "a@b.com", role: "admin" });
    getStudentDetail.mockRejectedValue(new NotFoundError());

    const res = await GET(new Request("http://localhost/api/admin/students/missing"), makeContext("missing"));

    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/admin/students/[studentId]", () => {
  beforeEach(() => vi.clearAllMocks());

  function makeRequest(body: unknown) {
    return new Request("http://localhost/api/admin/students/s1", {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  it("deactivates the student", async () => {
    requireSession.mockResolvedValue({ uid: "admin-1", email: "a@b.com", role: "admin" });
    setStudentDisabled.mockResolvedValue({ uid: "s1", disabled: true });

    const res = await PATCH(makeRequest({ disabled: true }), makeContext());

    expect(res.status).toBe(200);
    expect(setStudentDisabled).toHaveBeenCalledWith(
      { uid: "admin-1", email: "a@b.com", role: "admin" },
      "s1",
      true,
    );
  });

  it("returns 403 for a non-admin session", async () => {
    requireSession.mockResolvedValue({ uid: "teacher-1", email: "t@b.com", role: "teacher" });
    setStudentDisabled.mockRejectedValue(new ForbiddenError());

    const res = await PATCH(makeRequest({ disabled: true }), makeContext());

    expect(res.status).toBe(403);
  });

  it("rejects a malformed body", async () => {
    requireSession.mockResolvedValue({ uid: "admin-1", email: "a@b.com", role: "admin" });

    const res = await PATCH(makeRequest({ disabled: "yes" }), makeContext());

    expect(res.status).toBe(400);
    expect(setStudentDisabled).not.toHaveBeenCalled();
  });
});
