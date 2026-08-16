import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSession = vi.fn();
const sendMeetingLink = vi.fn();

vi.mock("@/lib/auth/session", () => ({ requireSession }));
vi.mock("@/lib/server/services/notificationService", () => ({
  notificationService: { sendMeetingLink },
}));

const { POST } = await import("./route");
const { ForbiddenError, ValidationError } = await import("@/lib/errors");

const session = { uid: "teacher-1", email: "teacher@example.com", role: "teacher" };

function makeContext(scheduleId: string) {
  return { params: Promise.resolve({ scheduleId }) };
}

describe("POST /api/teacher/schedule/[scheduleId]/notify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireSession.mockResolvedValue(session);
  });

  it("sends the meeting link and returns the sent count", async () => {
    sendMeetingLink.mockResolvedValue({ sentCount: 3 });

    const res = await POST(new Request("http://localhost", { method: "POST" }), makeContext("slot-1"));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ sentCount: 3 });
    expect(sendMeetingLink).toHaveBeenCalledWith(session, "slot-1");
  });

  it("maps a missing meetingUrl to a 400", async () => {
    sendMeetingLink.mockRejectedValueOnce(new ValidationError());

    const res = await POST(new Request("http://localhost", { method: "POST" }), makeContext("slot-1"));

    expect(res.status).toBe(400);
  });

  it("maps ownership failures to 403", async () => {
    sendMeetingLink.mockRejectedValueOnce(new ForbiddenError());

    const res = await POST(new Request("http://localhost", { method: "POST" }), makeContext("slot-1"));

    expect(res.status).toBe(403);
  });
});
