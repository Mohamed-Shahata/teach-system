import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSession = vi.fn();
const listMyNotifications = vi.fn();

vi.mock("@/lib/auth/session", () => ({ requireSession }));
vi.mock("@/lib/server/services/notificationService", () => ({
  notificationService: { listMyNotifications },
}));

const { GET } = await import("./route");

describe("GET /api/student/notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireSession.mockResolvedValue({ uid: "student-1", email: "s@example.com", role: "student" });
  });

  it("returns the student's own notifications", async () => {
    listMyNotifications.mockResolvedValue([{ id: "notif-1" }]);

    const res = await GET();

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ notifications: [{ id: "notif-1" }] });
  });
});
