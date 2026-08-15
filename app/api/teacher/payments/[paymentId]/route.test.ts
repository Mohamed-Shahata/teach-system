import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSession = vi.fn();
const confirmManualPayment = vi.fn();
const rejectManualPayment = vi.fn();

vi.mock("@/lib/auth/session", () => ({ requireSession }));
vi.mock("@/lib/server/services/paymentService", () => ({
  paymentService: { confirmManualPayment, rejectManualPayment },
}));

const { PATCH } = await import("./route");
const { ForbiddenError, ValidationError } = await import("@/lib/errors");

const session = { uid: "teacher-1", email: "teacher@example.com", role: "teacher" };
const context = { params: Promise.resolve({ paymentId: "payment-1" }) };

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/teacher/payments/payment-1", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

describe("/api/teacher/payments/[paymentId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireSession.mockResolvedValue(session);
  });

  it("confirms a pending manual payment", async () => {
    confirmManualPayment.mockResolvedValue({ id: "payment-1", status: "confirmed" });

    const res = await PATCH(makeRequest({ status: "confirmed" }), context);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ payment: { id: "payment-1", status: "confirmed" } });
    expect(confirmManualPayment).toHaveBeenCalledWith(session, "payment-1");
    expect(rejectManualPayment).not.toHaveBeenCalled();
  });

  it("rejects a pending manual payment", async () => {
    rejectManualPayment.mockResolvedValue({ id: "payment-1", status: "rejected" });

    const res = await PATCH(makeRequest({ status: "rejected" }), context);

    expect(res.status).toBe(200);
    expect(rejectManualPayment).toHaveBeenCalledWith(session, "payment-1");
    expect(confirmManualPayment).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid body", async () => {
    const res = await PATCH(makeRequest({ status: "succeeded" }), context);

    expect(res.status).toBe(400);
    expect(confirmManualPayment).not.toHaveBeenCalled();
    expect(rejectManualPayment).not.toHaveBeenCalled();
  });

  it("maps ownership and state-machine errors", async () => {
    confirmManualPayment.mockRejectedValueOnce(new ForbiddenError());
    await expect(PATCH(makeRequest({ status: "confirmed" }), context)).resolves.toHaveProperty("status", 403);

    confirmManualPayment.mockRejectedValueOnce(new ValidationError());
    await expect(PATCH(makeRequest({ status: "confirmed" }), context)).resolves.toHaveProperty("status", 400);
  });
});
