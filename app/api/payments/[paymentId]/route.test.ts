import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSession = vi.fn();
const getPayment = vi.fn();

vi.mock("@/lib/auth/session", () => ({ requireSession }));
vi.mock("@/lib/server/services/paymentService", () => ({
  paymentService: { getPayment },
}));

const { GET } = await import("./route");
const { ForbiddenError, NotFoundError, UnauthorizedError } = await import("@/lib/errors");

const session = { uid: "student-1", email: "student@example.com", role: "student" };
const context = { params: Promise.resolve({ paymentId: "payment-1" }) };

function makeRequest() {
  return new Request("http://localhost/api/payments/payment-1");
}

describe("/api/payments/[paymentId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireSession.mockResolvedValue(session);
  });

  it("returns the payment when the caller can view it", async () => {
    getPayment.mockResolvedValue({ id: "payment-1", status: "pending" });

    const res = await GET(makeRequest(), context);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ payment: { id: "payment-1", status: "pending" } });
    expect(getPayment).toHaveBeenCalledWith(session, "payment-1");
  });

  it("maps not-found and forbidden errors", async () => {
    getPayment.mockRejectedValueOnce(new NotFoundError());
    await expect(GET(makeRequest(), context)).resolves.toHaveProperty("status", 404);

    getPayment.mockRejectedValueOnce(new ForbiddenError());
    await expect(GET(makeRequest(), context)).resolves.toHaveProperty("status", 403);
  });

  it("maps auth errors", async () => {
    requireSession.mockRejectedValueOnce(new UnauthorizedError());
    await expect(GET(makeRequest(), context)).resolves.toHaveProperty("status", 401);
  });
});
