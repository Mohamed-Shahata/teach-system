import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSession = vi.fn();
const listEducationStages = vi.fn();
const createEducationStage = vi.fn();

vi.mock("@/lib/auth/session", () => ({ requireSession }));
vi.mock("@/lib/server/services/centerConfigService", () => ({
  centerConfigService: { listEducationStages, createEducationStage },
}));

const { GET, POST } = await import("./route");
const { UnauthorizedError, ForbiddenError } = await import("@/lib/errors");

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/admin/education-stages", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("GET /api/admin/education-stages", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the list for any authenticated session", async () => {
    requireSession.mockResolvedValue({ uid: "teacher-1", email: "t@b.com", role: "teacher" });
    listEducationStages.mockResolvedValue([{ id: "stage-1", order: 0, name: { en: "Nursery", ar: "حضانة" }, category: "nursery" }]);

    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.stages).toHaveLength(1);
  });

  it("returns 401 when there is no session", async () => {
    requireSession.mockRejectedValue(new UnauthorizedError());

    const res = await GET();

    expect(res.status).toBe(401);
  });
});

describe("POST /api/admin/education-stages", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a stage and returns 201", async () => {
    requireSession.mockResolvedValue({ uid: "admin-1", email: "a@b.com", role: "admin" });
    createEducationStage.mockResolvedValue({
      id: "stage-1",
      order: 12,
      name: { en: "Grade 3 Secondary", ar: "3 ثانوي" },
      category: "secondary",
    });

    const res = await POST(
      makeRequest({ name: { en: "Grade 3 Secondary", ar: "3 ثانوي" }, category: "secondary", order: 12 }),
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.stage.id).toBe("stage-1");
  });

  it("returns 403 when the service rejects a non-admin session", async () => {
    requireSession.mockResolvedValue({ uid: "teacher-1", email: "t@b.com", role: "teacher" });
    createEducationStage.mockRejectedValue(new ForbiddenError());

    const res = await POST(
      makeRequest({ name: { en: "Grade 3 Secondary", ar: "3 ثانوي" }, category: "secondary", order: 12 }),
    );

    expect(res.status).toBe(403);
  });

  it("returns 400 for an invalid body (missing category)", async () => {
    requireSession.mockResolvedValue({ uid: "admin-1", email: "a@b.com", role: "admin" });

    const res = await POST(makeRequest({ name: { en: "Grade 3 Secondary", ar: "3 ثانوي" }, order: 12 }));

    expect(res.status).toBe(400);
    expect(createEducationStage).not.toHaveBeenCalled();
  });
});
