import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSession = vi.fn();
const listSchedule = vi.fn();
const createScheduleSlot = vi.fn();
const updateScheduleSlot = vi.fn();
const deleteScheduleSlot = vi.fn();

vi.mock("@/lib/auth/session", () => ({ requireSession }));
vi.mock("@/lib/server/services/scheduleService", () => ({
  scheduleService: { listSchedule, createScheduleSlot, updateScheduleSlot, deleteScheduleSlot },
}));

const { DELETE, GET, PATCH, POST } = await import("./route");
const { ForbiddenError, UnauthorizedError } = await import("@/lib/errors");

const session = { uid: "teacher-1", email: "teacher@example.com", role: "teacher" };

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/teacher/schedule", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("/api/teacher/schedule", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireSession.mockResolvedValue(session);
  });

  it("returns the teacher schedule", async () => {
    listSchedule.mockResolvedValue([{ id: "slot-1", teacherId: "teacher-1" }]);

    const res = await GET();

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ slots: [{ id: "slot-1", teacherId: "teacher-1" }] });
    expect(listSchedule).toHaveBeenCalledWith(session);
  });

  it("creates a schedule slot", async () => {
    createScheduleSlot.mockResolvedValue({ id: "slot-1", teacherId: "teacher-1" });

    const res = await POST(
      makeRequest({
        subjectId: "physics",
        stageId: "secondary-3",
        dayOfWeek: 2,
        startTime: "17:30",
        durationMinutes: 90,
      }),
    );

    expect(res.status).toBe(201);
    expect(createScheduleSlot).toHaveBeenCalledWith(
      session,
      expect.objectContaining({ subjectId: "physics", dayOfWeek: 2 }),
    );
  });

  it("updates a schedule slot", async () => {
    updateScheduleSlot.mockResolvedValue({ id: "slot-1", startTime: "18:00" });

    const res = await PATCH(makeRequest({ id: "slot-1", startTime: "18:00" }));

    expect(res.status).toBe(200);
    expect(updateScheduleSlot).toHaveBeenCalledWith(session, { id: "slot-1", startTime: "18:00" });
  });

  it("deletes a schedule slot", async () => {
    const res = await DELETE(makeRequest({ id: "slot-1" }));

    expect(res.status).toBe(200);
    expect(deleteScheduleSlot).toHaveBeenCalledWith(session, "slot-1");
  });

  it("returns 400 for an invalid body", async () => {
    const res = await POST(makeRequest({ dayOfWeek: 9 }));

    expect(res.status).toBe(400);
    expect(createScheduleSlot).not.toHaveBeenCalled();
  });

  it("maps auth and role errors", async () => {
    requireSession.mockRejectedValueOnce(new UnauthorizedError());
    await expect(GET()).resolves.toHaveProperty("status", 401);

    requireSession.mockResolvedValueOnce(session);
    listSchedule.mockRejectedValueOnce(new ForbiddenError());
    await expect(GET()).resolves.toHaveProperty("status", 403);
  });
});
