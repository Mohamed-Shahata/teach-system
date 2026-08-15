import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSession = vi.fn();
const updateSubject = vi.fn();
const deleteSubject = vi.fn();

vi.mock("@/lib/auth/session", () => ({ requireSession }));
vi.mock("@/lib/server/services/centerConfigService", () => ({
  centerConfigService: { updateSubject, deleteSubject },
}));

const { PATCH, DELETE } = await import("./route");
const { ForbiddenError, NotFoundError } = await import("@/lib/errors");

function makeContext(subjectId = "subject-1") {
  return { params: Promise.resolve({ subjectId }) };
}

function makePatchRequest(body: unknown) {
  return new Request("http://localhost/api/admin/subjects/subject-1", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/admin/subjects/[subjectId]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates the subject", async () => {
    requireSession.mockResolvedValue({ uid: "admin-1", email: "a@b.com", role: "admin" });
    updateSubject.mockResolvedValue({ id: "subject-1", name: { en: "Chemistry", ar: "كيمياء" }, createdAt: 1 });

    const res = await PATCH(makePatchRequest({ name: { en: "Chemistry", ar: "كيمياء" } }), makeContext());

    expect(res.status).toBe(200);
    expect(updateSubject).toHaveBeenCalledWith(
      { uid: "admin-1", email: "a@b.com", role: "admin" },
      "subject-1",
      { name: { en: "Chemistry", ar: "كيمياء" } },
    );
  });

  it("returns 403 for a non-admin session", async () => {
    requireSession.mockResolvedValue({ uid: "teacher-1", email: "t@b.com", role: "teacher" });
    updateSubject.mockRejectedValue(new ForbiddenError());

    const res = await PATCH(makePatchRequest({ name: { en: "Chemistry", ar: "كيمياء" } }), makeContext());

    expect(res.status).toBe(403);
  });

  it("returns 404 when the subject doesn't exist", async () => {
    requireSession.mockResolvedValue({ uid: "admin-1", email: "a@b.com", role: "admin" });
    updateSubject.mockRejectedValue(new NotFoundError());

    const res = await PATCH(makePatchRequest({ name: { en: "Chemistry", ar: "كيمياء" } }), makeContext("missing"));

    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/admin/subjects/[subjectId]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes the subject", async () => {
    requireSession.mockResolvedValue({ uid: "admin-1", email: "a@b.com", role: "admin" });
    deleteSubject.mockResolvedValue({ id: "subject-1" });

    const res = await DELETE(new Request("http://localhost/api/admin/subjects/subject-1"), makeContext());

    expect(res.status).toBe(200);
    expect(deleteSubject).toHaveBeenCalledWith({ uid: "admin-1", email: "a@b.com", role: "admin" }, "subject-1");
  });

  it("returns 403 for a non-admin session", async () => {
    requireSession.mockResolvedValue({ uid: "student-1", email: "s@b.com", role: "student" });
    deleteSubject.mockRejectedValue(new ForbiddenError());

    const res = await DELETE(new Request("http://localhost/api/admin/subjects/subject-1"), makeContext());

    expect(res.status).toBe(403);
  });
});
