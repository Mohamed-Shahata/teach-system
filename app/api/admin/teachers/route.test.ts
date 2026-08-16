import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSession = vi.fn();
const listTeachers = vi.fn();

vi.mock("@/lib/auth/session", () => ({ requireSession }));
vi.mock("@/lib/server/services/teacherManagementService", () => ({
  teacherManagementService: { listTeachers },
}));

const { GET } = await import("./route");
const { ForbiddenError } = await import("@/lib/errors");

describe("GET /api/admin/teachers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists teachers", async () => {
    requireSession.mockResolvedValue({ uid: "admin-1", email: "a@b.com", role: "admin" });
    listTeachers.mockResolvedValue([{ uid: "t1" }]);

    const res = await GET(new Request("http://localhost/api/admin/teachers"));

    expect(res.status).toBe(200);
    expect(listTeachers).toHaveBeenCalledWith({ uid: "admin-1", email: "a@b.com", role: "admin" }, undefined);
  });

  it("passes the search query param through", async () => {
    requireSession.mockResolvedValue({ uid: "admin-1", email: "a@b.com", role: "admin" });
    listTeachers.mockResolvedValue([]);

    await GET(new Request("http://localhost/api/admin/teachers?search=mona"));

    expect(listTeachers).toHaveBeenCalledWith({ uid: "admin-1", email: "a@b.com", role: "admin" }, "mona");
  });

  it("returns 403 for a non-admin session", async () => {
    requireSession.mockResolvedValue({ uid: "teacher-1", email: "t@b.com", role: "teacher" });
    listTeachers.mockRejectedValue(new ForbiddenError());

    const res = await GET(new Request("http://localhost/api/admin/teachers"));

    expect(res.status).toBe(403);
  });
});
