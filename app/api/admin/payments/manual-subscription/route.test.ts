import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSession = vi.fn();
const recordCashPayment = vi.fn();

vi.mock("@/lib/auth/session", () => ({ requireSession }));
vi.mock("@/lib/server/services/manualSubscriptionPaymentService", () => ({
  manualSubscriptionPaymentService: { recordCashPayment },
}));

const { POST } = await import("./route");
const { ConflictError } = await import("@/lib/errors");

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/admin/payments/manual-subscription", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/admin/payments/manual-subscription", () => {
  beforeEach(() => vi.clearAllMocks());

  it("records the payment and returns the subscription + invoice", async () => {
    requireSession.mockResolvedValue({ uid: "admin-1", email: "a@b.com", role: "admin" });
    recordCashPayment.mockResolvedValue({
      subscription: { id: "sub-1", status: "active" },
      invoice: { id: "invoice-1", status: "confirmed" },
    });

    const res = await POST(
      makeRequest({ studentId: "student-1", teacherId: "teacher-1", offeringId: "offering-1" }),
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.subscription.id).toBe("sub-1");
    expect(body.invoice.status).toBe("confirmed");
    expect(recordCashPayment).toHaveBeenCalledWith(
      { uid: "admin-1", email: "a@b.com", role: "admin" },
      { studentId: "student-1", teacherId: "teacher-1", offeringId: "offering-1" },
    );
  });

  it("returns 400 for an invalid body", async () => {
    requireSession.mockResolvedValue({ uid: "admin-1", email: "a@b.com", role: "admin" });

    const res = await POST(makeRequest({ studentId: "student-1" }));

    expect(res.status).toBe(400);
    expect(recordCashPayment).not.toHaveBeenCalled();
  });

  it("propagates a conflict from the service", async () => {
    requireSession.mockResolvedValue({ uid: "admin-1", email: "a@b.com", role: "admin" });
    recordCashPayment.mockRejectedValue(new ConflictError());

    const res = await POST(
      makeRequest({ studentId: "student-1", teacherId: "teacher-1", offeringId: "offering-1" }),
    );

    expect(res.status).toBe(409);
  });
});
