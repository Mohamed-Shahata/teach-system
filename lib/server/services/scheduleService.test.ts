import { beforeEach, describe, expect, it, vi } from "vitest";

const list = vi.fn();
const create = vi.fn();
const update = vi.fn();
const deleteSlot = vi.fn();

vi.mock("@/lib/server/repositories/scheduleRepository", () => ({
  scheduleRepository: { list, create, update, delete: deleteSlot },
}));

const { scheduleService } = await import("./scheduleService");
const { ForbiddenError } = await import("@/lib/errors");

function makeSession(role: "admin" | "teacher" | "student", uid = "teacher-1") {
  return { uid, email: `${uid}@example.com`, role };
}

describe("scheduleService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    list.mockResolvedValue([]);
    create.mockImplementation(async (slot) => ({ id: "slot-1", ...slot }));
    update.mockImplementation(async (_session, id, patch) => ({ id, teacherId: "teacher-1", ...patch }));
    deleteSlot.mockResolvedValue(undefined);
  });

  it("lists the acting teacher's schedule through the scoped repository", async () => {
    const session = makeSession("teacher");

    await scheduleService.listSchedule(session);

    expect(list).toHaveBeenCalledWith(session);
  });

  it("creates a slot owned by the acting teacher", async () => {
    const session = makeSession("teacher", "teacher-7");

    const slot = await scheduleService.createScheduleSlot(session, {
      subjectId: "physics",
      stageId: "secondary-3",
      dayOfWeek: 2,
      startTime: "17:30",
      durationMinutes: 90,
      label: { en: "Revision" },
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        teacherId: "teacher-7",
        subjectId: "physics",
        stageId: "secondary-3",
        dayOfWeek: 2,
        startTime: "17:30",
        durationMinutes: 90,
      }),
    );
    expect(slot.id).toBe("slot-1");
  });

  it("updates through the repository with the session for ownership enforcement", async () => {
    const session = makeSession("teacher");

    await scheduleService.updateScheduleSlot(session, { id: "slot-1", startTime: "18:00" });

    expect(update).toHaveBeenCalledWith(
      session,
      "slot-1",
      expect.objectContaining({ startTime: "18:00", updatedAt: expect.any(Number) }),
    );
  });

  it("deletes through the repository with the session for ownership enforcement", async () => {
    const session = makeSession("teacher");

    await scheduleService.deleteScheduleSlot(session, "slot-1");

    expect(deleteSlot).toHaveBeenCalledWith(session, "slot-1");
  });

  it("rejects non-teacher sessions", async () => {
    await expect(scheduleService.listSchedule(makeSession("student"))).rejects.toBeInstanceOf(ForbiddenError);
    await expect(
      scheduleService.createScheduleSlot(makeSession("admin"), {
        subjectId: "physics",
        stageId: "secondary-3",
        dayOfWeek: 2,
        startTime: "17:30",
        durationMinutes: 90,
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});
