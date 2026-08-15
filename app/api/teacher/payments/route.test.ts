import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSession = vi.fn();
const listForTeacher = vi.fn();

vi.mock("@/lib/auth/session", () => ({ requireSession }));
vi.mock("@/lib/server/services/paymentService", () => ({
  paymentService: { listForTeacher },
}));

const { GET } = await import("./route");
const { ForbiddenError, UnauthorizedError } = await import("@/lib/errors");

const session = { uid: "teacher-1", email: "teacher@example.com", role: "teacher" };

function makeRequest(query = "") {
  return new Request(`http://localhost/api/teacher/payments${query}`);
}

describe("/api/teacher/payments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireSession.mockResolvedValue(session);
  });

  it("returns the teacher's payments with no status filter", async () => {
    listForTeacher.mockResolvedValue([{ id: "payment-1", teacherId: "teacher-1" }]);

    const res = await GET(makeRequest());

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ payments: [{ id: "payment-1", teacherId: "teacher-1" }] });
    expect(listForTeacher).toHaveBeenCalledWith(session, undefined);
  });

  it("filters by the pending manual-review queue status", async () => {
    listForTeacher.mockResolvedValue([{ id: "payment-1", status: "pending" }]);

    const res = await GET(makeRequest("?status=pending"));

    expect(res.status).toBe(200);
    expect(listForTeacher).toHaveBeenCalledWith(session, "pending");
  });

  it("returns 400 for an invalid status filter", async () => {
    const res = await GET(makeRequest("?status=bogus"));

    expect(res.status).toBe(400);
    expect(listForTeacher).not.toHaveBeenCalled();
  });

  it("maps auth and role errors", async () => {
    requireSession.mockRejectedValueOnce(new UnauthorizedError());
    await expect(GET(makeRequest())).resolves.toHaveProperty("status", 401);

    requireSession.mockResolvedValueOnce(session);
    listForTeacher.mockRejectedValueOnce(new ForbiddenError());
    await expect(GET(makeRequest())).resolves.toHaveProperty("status", 403);
  });
});
