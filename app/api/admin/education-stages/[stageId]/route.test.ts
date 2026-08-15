import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSession = vi.fn();
const updateEducationStage = vi.fn();
const deleteEducationStage = vi.fn();

vi.mock("@/lib/auth/session", () => ({ requireSession }));
vi.mock("@/lib/server/services/centerConfigService", () => ({
  centerConfigService: { updateEducationStage, deleteEducationStage },
}));

const { PATCH, DELETE } = await import("./route");
const { ForbiddenError, NotFoundError } = await import("@/lib/errors");

function makeContext(stageId = "stage-1") {
  return { params: Promise.resolve({ stageId }) };
}

function makePatchRequest(body: unknown) {
  return new Request("http://localhost/api/admin/education-stages/stage-1", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/admin/education-stages/[stageId]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates the stage", async () => {
    requireSession.mockResolvedValue({ uid: "admin-1", email: "a@b.com", role: "admin" });
    updateEducationStage.mockResolvedValue({
      id: "stage-1",
      order: 3,
      name: { en: "Grade 1", ar: "1" },
      category: "primary",
    });

    const res = await PATCH(makePatchRequest({ order: 3 }), makeContext());

    expect(res.status).toBe(200);
    expect(updateEducationStage).toHaveBeenCalledWith(
      { uid: "admin-1", email: "a@b.com", role: "admin" },
      "stage-1",
      { order: 3 },
    );
  });

  it("returns 403 for a non-admin session", async () => {
    requireSession.mockResolvedValue({ uid: "teacher-1", email: "t@b.com", role: "teacher" });
    updateEducationStage.mockRejectedValue(new ForbiddenError());

    const res = await PATCH(makePatchRequest({ order: 3 }), makeContext());

    expect(res.status).toBe(403);
  });

  it("returns 404 when the stage doesn't exist", async () => {
    requireSession.mockResolvedValue({ uid: "admin-1", email: "a@b.com", role: "admin" });
    updateEducationStage.mockRejectedValue(new NotFoundError());

    const res = await PATCH(makePatchRequest({ order: 3 }), makeContext("missing"));

    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/admin/education-stages/[stageId]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes the stage", async () => {
    requireSession.mockResolvedValue({ uid: "admin-1", email: "a@b.com", role: "admin" });
    deleteEducationStage.mockResolvedValue({ id: "stage-1" });

    const res = await DELETE(new Request("http://localhost/api/admin/education-stages/stage-1"), makeContext());

    expect(res.status).toBe(200);
    expect(deleteEducationStage).toHaveBeenCalledWith(
      { uid: "admin-1", email: "a@b.com", role: "admin" },
      "stage-1",
    );
  });

  it("returns 403 for a non-admin session", async () => {
    requireSession.mockResolvedValue({ uid: "student-1", email: "s@b.com", role: "student" });
    deleteEducationStage.mockRejectedValue(new ForbiddenError());

    const res = await DELETE(new Request("http://localhost/api/admin/education-stages/stage-1"), makeContext());

    expect(res.status).toBe(403);
  });
});
