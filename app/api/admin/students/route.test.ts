import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSession = vi.fn();
const listStudents = vi.fn();

vi.mock("@/lib/auth/session", () => ({ requireSession }));
vi.mock("@/lib/server/services/studentManagementService", () => ({
  studentManagementService: { listStudents },
}));

const { GET } = await import("./route");
const { ForbiddenError } = await import("@/lib/errors");

describe("GET /api/admin/students", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists students", async () => {
    requireSession.mockResolvedValue({ uid: "admin-1", email: "a@b.com", role: "admin" });
    listStudents.mockResolvedValue([{ uid: "s1" }]);

    const res = await GET(new Request("http://localhost/api/admin/students"));

    expect(res.status).toBe(200);
    expect(listStudents).toHaveBeenCalledWith({ uid: "admin-1", email: "a@b.com", role: "admin" }, undefined);
  });

  it("passes the search query param through", async () => {
    requireSession.mockResolvedValue({ uid: "admin-1", email: "a@b.com", role: "admin" });
    listStudents.mockResolvedValue([]);

    await GET(new Request("http://localhost/api/admin/students?search=sara"));

    expect(listStudents).toHaveBeenCalledWith({ uid: "admin-1", email: "a@b.com", role: "admin" }, "sara");
  });

  it("returns 403 for a non-admin session", async () => {
    requireSession.mockResolvedValue({ uid: "teacher-1", email: "t@b.com", role: "teacher" });
    listStudents.mockRejectedValue(new ForbiddenError());

    const res = await GET(new Request("http://localhost/api/admin/students"));

    expect(res.status).toBe(403);
  });
});
