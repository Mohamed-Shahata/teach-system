import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSession = vi.fn();
const listMyPayments = vi.fn();
const createPayment = vi.fn();

vi.mock("@/lib/auth/session", () => ({ requireSession }));
vi.mock("@/lib/server/services/paymentService", () => ({
  paymentService: { listMyPayments, createPayment },
}));

const { GET, POST } = await import("./route");
const { ForbiddenError, UnauthorizedError, ValidationError } = await import("@/lib/errors");

const session = { uid: "student-1", email: "student@example.com", role: "student" };

function makeGetRequest(query = "") {
  return new Request(`http://localhost/api/payments${query}`);
}

function makePostRequest(body: unknown) {
  return new Request("http://localhost/api/payments", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("GET /api/payments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireSession.mockResolvedValue(session);
  });

  it("returns the student's own payments with no status filter", async () => {
    listMyPayments.mockResolvedValue([{ id: "payment-1", studentId: "student-1" }]);

    const res = await GET(makeGetRequest());

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ payments: [{ id: "payment-1", studentId: "student-1" }] });
    expect(listMyPayments).toHaveBeenCalledWith(session, undefined);
  });

  it("filters by status", async () => {
    listMyPayments.mockResolvedValue([{ id: "payment-1", status: "pending" }]);

    const res = await GET(makeGetRequest("?status=pending"));

    expect(res.status).toBe(200);
    expect(listMyPayments).toHaveBeenCalledWith(session, "pending");
  });

  it("returns 400 for an invalid status filter", async () => {
    const res = await GET(makeGetRequest("?status=bogus"));

    expect(res.status).toBe(400);
    expect(listMyPayments).not.toHaveBeenCalled();
  });

  it("maps auth errors", async () => {
    requireSession.mockRejectedValueOnce(new UnauthorizedError());
    await expect(GET(makeGetRequest())).resolves.toHaveProperty("status", 401);
  });
});

describe("POST /api/payments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireSession.mockResolvedValue(session);
  });

  it("creates a pending vodafone_cash payment", async () => {
    createPayment.mockResolvedValue({ id: "payment-1", status: "pending", method: "vodafone_cash" });

    const body = { courseId: "course-1", method: "vodafone_cash", referenceNote: "TXN123" };
    const res = await POST(makePostRequest(body));

    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toEqual({
      payment: { id: "payment-1", status: "pending", method: "vodafone_cash" },
    });
    expect(createPayment).toHaveBeenCalledWith(session, body);
  });

  it("creates a pending bank_transfer payment", async () => {
    createPayment.mockResolvedValue({ id: "payment-2", status: "pending", method: "bank_transfer" });

    const body = { courseId: "course-1", method: "bank_transfer", referenceNote: "REF-9" };
    const res = await POST(makePostRequest(body));

    expect(res.status).toBe(201);
    expect(createPayment).toHaveBeenCalledWith(session, body);
  });

  it("rejects an online method (card) — out of scope until TASK-1105", async () => {
    const res = await POST(makePostRequest({ courseId: "course-1", method: "card" }));

    expect(res.status).toBe(400);
    expect(createPayment).not.toHaveBeenCalled();
  });

  it("rejects an online method (fawry) — out of scope until TASK-1105", async () => {
    const res = await POST(makePostRequest({ courseId: "course-1", method: "fawry" }));

    expect(res.status).toBe(400);
    expect(createPayment).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid body", async () => {
    const res = await POST(makePostRequest({ method: "vodafone_cash" }));

    expect(res.status).toBe(400);
    expect(createPayment).not.toHaveBeenCalled();
  });

  it("maps role and validation errors from the service", async () => {
    createPayment.mockRejectedValueOnce(new ForbiddenError());
    await expect(
      POST(makePostRequest({ courseId: "course-1", method: "vodafone_cash", referenceNote: "x" })),
    ).resolves.toHaveProperty("status", 403);

    createPayment.mockRejectedValueOnce(new ValidationError());
    await expect(
      POST(makePostRequest({ courseId: "course-1", method: "vodafone_cash", referenceNote: "x" })),
    ).resolves.toHaveProperty("status", 400);
  });
});
