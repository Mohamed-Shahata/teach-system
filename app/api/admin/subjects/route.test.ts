import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSession = vi.fn();
const listSubjects = vi.fn();
const createSubject = vi.fn();

vi.mock("@/lib/auth/session", () => ({ requireSession }));
vi.mock("@/lib/server/services/centerConfigService", () => ({
  centerConfigService: { listSubjects, createSubject },
}));

const { GET, POST } = await import("./route");
const { UnauthorizedError, ForbiddenError } = await import("@/lib/errors");

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/admin/subjects", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("GET /api/admin/subjects", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the list for any authenticated session", async () => {
    requireSession.mockResolvedValue({ uid: "student-1", email: "s@b.com", role: "student" });
    listSubjects.mockResolvedValue([{ id: "subject-1", name: { en: "Physics", ar: "فيزياء" }, createdAt: 1 }]);

    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.subjects).toHaveLength(1);
  });

  it("returns 401 when there is no session", async () => {
    requireSession.mockRejectedValue(new UnauthorizedError());

    const res = await GET();

    expect(res.status).toBe(401);
  });
});

describe("POST /api/admin/subjects", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a subject and returns 201", async () => {
    requireSession.mockResolvedValue({ uid: "admin-1", email: "a@b.com", role: "admin" });
    createSubject.mockResolvedValue({ id: "subject-1", name: { en: "Physics", ar: "فيزياء" }, createdAt: 1 });

    const res = await POST(makeRequest({ name: { en: "Physics", ar: "فيزياء" } }));

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.subject.id).toBe("subject-1");
  });

  it("returns 403 when the service rejects a non-admin session", async () => {
    requireSession.mockResolvedValue({ uid: "teacher-1", email: "t@b.com", role: "teacher" });
    createSubject.mockRejectedValue(new ForbiddenError());

    const res = await POST(makeRequest({ name: { en: "Physics", ar: "فيزياء" } }));

    expect(res.status).toBe(403);
  });

  it("returns 400 for an invalid body (name too short)", async () => {
    requireSession.mockResolvedValue({ uid: "admin-1", email: "a@b.com", role: "admin" });

    const res = await POST(makeRequest({ name: { en: "Ph", ar: "فز" } }));

    expect(res.status).toBe(400);
    expect(createSubject).not.toHaveBeenCalled();
  });
});
