import { beforeEach, describe, expect, it, vi } from "vitest";

const createMany = vi.fn();
const dispatchForNotifications = vi.fn();

vi.mock("@/lib/server/repositories/notificationRepository", () => ({
  notificationRepository: { createMany },
}));
vi.mock("@/lib/server/services/pushDispatchService", () => ({
  pushDispatchService: { dispatchForNotifications },
}));

const { auditNotificationService } = await import("./auditNotificationService");

describe("auditNotificationService.notify", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does nothing for an empty recipient list", async () => {
    await auditNotificationService.notify({
      action: "created",
      entityType: "course",
      entityId: "course-1",
      title: { en: "x", ar: "س" },
      recipientIds: [],
    });

    expect(createMany).not.toHaveBeenCalled();
  });

  it("dedupes duplicate recipient ids into a single doc each", async () => {
    createMany.mockResolvedValue([{ id: "n1" }, { id: "n2" }]);

    await auditNotificationService.notify({
      action: "created",
      entityType: "enrollment",
      entityId: "enr-1",
      title: { en: "New enrollment", ar: "تسجيل جديد" },
      recipientIds: ["student-1", "teacher-1", "student-1"],
    });

    expect(createMany).toHaveBeenCalledTimes(1);
    const docs = createMany.mock.calls[0][0];
    expect(docs).toHaveLength(2);
    expect(docs.map((d: { recipientId: string }) => d.recipientId).sort()).toEqual(["student-1", "teacher-1"]);
    expect(docs.every((d: { type: string }) => d.type === "audit")).toBe(true);
  });

  it("best-effort dispatches push for the created docs", async () => {
    const created = [{ id: "n1", recipientId: "student-1" }];
    createMany.mockResolvedValue(created);

    await auditNotificationService.notify({
      action: "updated",
      entityType: "payment",
      entityId: "pay-1",
      title: { en: "Payment confirmed", ar: "تم تأكيد الدفعة" },
      recipientIds: ["student-1"],
    });

    expect(dispatchForNotifications).toHaveBeenCalledWith(created);
  });

  it("never throws even if the repository fails", async () => {
    createMany.mockRejectedValue(new Error("boom"));

    await expect(
      auditNotificationService.notify({
        action: "deleted",
        entityType: "course",
        entityId: "course-1",
        title: { en: "x", ar: "س" },
        recipientIds: ["teacher-1"],
      }),
    ).resolves.toBeUndefined();
  });
});
