import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSession = vi.fn();
const markNotificationRead = vi.fn();

vi.mock("@/lib/auth/session", () => ({ requireSession }));
vi.mock("@/lib/server/services/notificationService", () => ({
  notificationService: { markNotificationRead },
}));

const { PATCH } = await import("./route");
const { ForbiddenError } = await import("@/lib/errors");

const session = { uid: "teacher-1", email: "teacher@example.com", role: "teacher" };

function makeContext(notificationId: string) {
  return { params: Promise.resolve({ notificationId }) };
}

function makeRequest() {
  return new Request("http://localhost", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ read: true }),
  });
}

describe("PATCH /api/teacher/notifications/[notificationId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireSession.mockResolvedValue(session);
  });

  it("marks the teacher's own reminder read", async () => {
    markNotificationRead.mockResolvedValue({ id: "notif-1", read: true });

    const res = await PATCH(makeRequest(), makeContext("notif-1"));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ notification: { id: "notif-1", read: true } });
    expect(markNotificationRead).toHaveBeenCalledWith(session, "notif-1");
  });

  it("maps ownership failures to 403", async () => {
    markNotificationRead.mockRejectedValueOnce(new ForbiddenError());

    const res = await PATCH(makeRequest(), makeContext("notif-1"));

    expect(res.status).toBe(403);
  });
});
