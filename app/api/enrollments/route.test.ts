import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSession = vi.fn();
const listMyEnrollments = vi.fn();

vi.mock("@/lib/auth/session", () => ({ requireSession }));
vi.mock("@/lib/server/services/enrollmentService", () => ({
  enrollmentService: { listMyEnrollments },
}));

const { GET } = await import("./route");
const { ForbiddenError, UnauthorizedError } = await import("@/lib/errors");

const session = { uid: "student-1", email: "student@example.com", role: "student" };

function makeRequest(query = "") {
  return new Request(`http://localhost/api/enrollments${query}`);
}

describe("/api/enrollments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireSession.mockResolvedValue(session);
  });

  it("returns the student's enrollments with no status filter", async () => {
    listMyEnrollments.mockResolvedValue([{ id: "enrollment-1", studentId: "student-1" }]);

    const res = await GET(makeRequest());

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      enrollments: [{ id: "enrollment-1", studentId: "student-1" }],
    });
    expect(listMyEnrollments).toHaveBeenCalledWith(session, undefined);
  });

  it("filters by status", async () => {
    listMyEnrollments.mockResolvedValue([{ id: "enrollment-1", status: "active" }]);

    const res = await GET(makeRequest("?status=active"));

    expect(res.status).toBe(200);
    expect(listMyEnrollments).toHaveBeenCalledWith(session, "active");
  });

  it("returns 400 for an invalid status filter", async () => {
    const res = await GET(makeRequest("?status=bogus"));

    expect(res.status).toBe(400);
    expect(listMyEnrollments).not.toHaveBeenCalled();
  });

  it("maps auth and role errors", async () => {
    requireSession.mockRejectedValueOnce(new UnauthorizedError());
    await expect(GET(makeRequest())).resolves.toHaveProperty("status", 401);

    requireSession.mockResolvedValueOnce(session);
    listMyEnrollments.mockRejectedValueOnce(new ForbiddenError());
    await expect(GET(makeRequest())).resolves.toHaveProperty("status", 403);
  });
});
