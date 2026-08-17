import { beforeEach, describe, expect, it, vi } from "vitest";

const listForUser = vi.fn();
const remove = vi.fn();
const findByIds = vi.fn();
const sendMulticast = vi.fn();

vi.mock("@/lib/server/repositories/fcmTokenRepository", () => ({
  fcmTokenRepository: { listForUser, remove },
}));
vi.mock("@/lib/server/repositories/userRepository", () => ({
  userRepository: { findByIds },
}));
vi.mock("@/lib/server/repositories/pushRepository", () => ({
  pushRepository: { sendMulticast },
}));

const { pushDispatchService } = await import("./pushDispatchService");

const notification = {
  id: "n1",
  recipientId: "student-1",
  teacherId: "teacher-1",
  type: "meeting_link" as const,
  scheduleId: "slot-1",
  subjectId: "physics",
  stageId: "secondary-3",
  meetingUrl: "https://meet.google.com/abc-defg-hij",
  read: false,
  createdAt: 1000,
};

describe("pushDispatchService.dispatchForNotifications", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does nothing for an empty list", async () => {
    await pushDispatchService.dispatchForNotifications([]);
    expect(findByIds).not.toHaveBeenCalled();
  });

  it("skips a recipient with no registered devices", async () => {
    findByIds.mockResolvedValue(new Map());
    listForUser.mockResolvedValue([]);

    await pushDispatchService.dispatchForNotifications([notification]);

    expect(sendMulticast).not.toHaveBeenCalled();
  });

  it("sends English copy by default and Arabic copy when the recipient's locale is ar", async () => {
    findByIds.mockResolvedValue(new Map([["student-1", { locale: "ar" }]]));
    listForUser.mockResolvedValue([{ id: "tok-doc-1", token: "tok-1" }]);
    sendMulticast.mockResolvedValue([{ token: "tok-1", success: true }]);

    await pushDispatchService.dispatchForNotifications([notification]);

    expect(sendMulticast).toHaveBeenCalledWith(
      ["tok-1"],
      expect.objectContaining({
        title: "بدأت الحصة",
        data: expect.objectContaining({ type: "meeting_link", scheduleId: "slot-1", meetingUrl: notification.meetingUrl }),
      }),
    );
  });

  it("prunes a token FCM reports as dead", async () => {
    findByIds.mockResolvedValue(new Map());
    listForUser.mockResolvedValue([
      { id: "tok-doc-1", token: "tok-1" },
      { id: "tok-doc-2", token: "tok-2" },
    ]);
    sendMulticast.mockResolvedValue([
      { token: "tok-1", success: true },
      { token: "tok-2", success: false, errorCode: "messaging/registration-token-not-registered" },
    ]);

    await pushDispatchService.dispatchForNotifications([notification]);

    expect(remove).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledWith("student-1", "tok-doc-2");
  });

  it("does not prune a token that failed for a non-dead-token reason", async () => {
    findByIds.mockResolvedValue(new Map());
    listForUser.mockResolvedValue([{ id: "tok-doc-1", token: "tok-1" }]);
    sendMulticast.mockResolvedValue([{ token: "tok-1", success: false, errorCode: "messaging/internal-error" }]);

    await pushDispatchService.dispatchForNotifications([notification]);

    expect(remove).not.toHaveBeenCalled();
  });

  it("swallows errors so a dispatch failure never throws", async () => {
    findByIds.mockResolvedValue(new Map());
    listForUser.mockRejectedValue(new Error("firestore down"));

    await expect(pushDispatchService.dispatchForNotifications([notification])).resolves.toBeUndefined();
  });

  it("isolates failures per recipient — one bad recipient doesn't stop another's push", async () => {
    const other = { ...notification, id: "n2", recipientId: "student-2" };
    findByIds.mockResolvedValue(new Map());
    listForUser.mockImplementation(async (uid: string) => {
      if (uid === "student-1") throw new Error("boom");
      return [{ id: "tok-doc-2", token: "tok-2" }];
    });
    sendMulticast.mockResolvedValue([{ token: "tok-2", success: true }]);

    await pushDispatchService.dispatchForNotifications([notification, other]);

    expect(sendMulticast).toHaveBeenCalledTimes(1);
  });

  it("skips a teacher/admin recipient who explicitly opted out of push (pushEnabled: false)", async () => {
    findByIds.mockResolvedValue(new Map([["student-1", { role: "teacher", pushEnabled: false }]]));

    await pushDispatchService.dispatchForNotifications([notification]);

    expect(listForUser).not.toHaveBeenCalled();
    expect(sendMulticast).not.toHaveBeenCalled();
  });

  it("TASK-3001: always dispatches to a student recipient even if pushEnabled is stored false (no student opt-out)", async () => {
    findByIds.mockResolvedValue(new Map([["student-1", { role: "student", pushEnabled: false }]]));
    listForUser.mockResolvedValue([{ id: "tok-doc-1", token: "tok-1" }]);
    sendMulticast.mockResolvedValue([{ token: "tok-1", success: true }]);

    await pushDispatchService.dispatchForNotifications([notification]);

    expect(sendMulticast).toHaveBeenCalled();
  });

  it("dispatches for a recipient with no recorded preference (default enabled)", async () => {
    findByIds.mockResolvedValue(new Map([["student-1", {}]]));
    listForUser.mockResolvedValue([{ id: "tok-doc-1", token: "tok-1" }]);
    sendMulticast.mockResolvedValue([{ token: "tok-1", success: true }]);

    await pushDispatchService.dispatchForNotifications([notification]);

    expect(sendMulticast).toHaveBeenCalled();
  });
});
