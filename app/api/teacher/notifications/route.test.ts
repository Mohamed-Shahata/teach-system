import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSession = vi.fn();
const listMyClassReminders = vi.fn();

vi.mock("@/lib/auth/session", () => ({ requireSession }));
vi.mock("@/lib/server/services/notificationService", () => ({
  notificationService: { listMyClassReminders },
}));

const { GET } = await import("./route");

describe("GET /api/teacher/notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireSession.mockResolvedValue({ uid: "teacher-1", email: "t@example.com", role: "teacher" });
  });

  it("returns the teacher's own class reminders", async () => {
    listMyClassReminders.mockResolvedValue([{ id: "notif-1" }]);

    const res = await GET();

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ notifications: [{ id: "notif-1" }] });
    expect(listMyClassReminders).toHaveBeenCalledWith({ uid: "teacher-1", email: "t@example.com", role: "teacher" });
  });
});
