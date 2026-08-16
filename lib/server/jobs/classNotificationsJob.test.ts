import { beforeEach, describe, expect, it, vi } from "vitest";

const listAll = vi.fn();
const markNotifiedToday = vi.fn();
const markReminderSentToday = vi.fn();
const listAllByTeacherId = vi.fn();
const findByIds = vi.fn();
const createMany = vi.fn();

vi.mock("@/lib/server/repositories/scheduleRepository", () => ({
  scheduleRepository: { listAll, markNotifiedToday, markReminderSentToday },
}));
vi.mock("@/lib/server/repositories/enrollmentRepository", () => ({
  enrollmentRepository: { listAllByTeacherId },
}));
vi.mock("@/lib/server/repositories/userRepository", () => ({
  userRepository: { findByIds },
}));
vi.mock("@/lib/server/repositories/notificationRepository", () => ({
  notificationRepository: { createMany },
}));

const { runClassNotificationsJob } = await import("./classNotificationsJob");

// Tuesday (dayOfWeek 2), 17:00 local time.
const NOW = new Date("2026-08-18T17:00:00");

function baseSlot(overrides: Record<string, unknown> = {}) {
  return {
    id: "slot-1",
    teacherId: "teacher-1",
    subjectId: "physics",
    stageId: "secondary-3",
    dayOfWeek: 2,
    startTime: "17:00",
    durationMinutes: 90,
    meetingUrl: "https://meet.google.com/abc-defg-hij",
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

describe("runClassNotificationsJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    markNotifiedToday.mockResolvedValue(undefined);
    markReminderSentToday.mockResolvedValue(undefined);
    createMany.mockImplementation(async (n: unknown[]) => n);
  });

  it("fires the class-starting notification for a slot whose startTime matches now, to active same-stage students only", async () => {
    listAll.mockResolvedValue([baseSlot()]);
    listAllByTeacherId.mockResolvedValue([
      { studentId: "student-match", teacherId: "teacher-1", courseId: "c1", status: "active" },
      { studentId: "student-wrong-stage", teacherId: "teacher-1", courseId: "c2", status: "active" },
      { studentId: "student-cancelled", teacherId: "teacher-1", courseId: "c3", status: "cancelled" },
    ]);
    findByIds.mockResolvedValue(
      new Map([
        ["student-match", { role: "student", stageId: "secondary-3" }],
        ["student-wrong-stage", { role: "student", stageId: "secondary-2" }],
      ]),
    );

    const result = await runClassNotificationsJob(NOW);

    expect(createMany).toHaveBeenCalledWith([
      expect.objectContaining({ recipientId: "student-match", type: "meeting_link", scheduleId: "slot-1" }),
    ]);
    expect(markNotifiedToday).toHaveBeenCalledWith("slot-1", "2026-08-18");
    expect(result.notified).toBe(1);
  });

  it("skips a slot with no meetingUrl for the class-starting job", async () => {
    listAll.mockResolvedValue([baseSlot({ meetingUrl: undefined })]);

    const result = await runClassNotificationsJob(NOW);

    expect(listAllByTeacherId).not.toHaveBeenCalled();
    expect(result.notified).toBe(0);
  });

  it("doesn't re-fire a slot already notified today (dedupe)", async () => {
    listAll.mockResolvedValue([baseSlot({ lastNotifiedDate: "2026-08-18" })]);

    const result = await runClassNotificationsJob(NOW);

    expect(listAllByTeacherId).not.toHaveBeenCalled();
    expect(markNotifiedToday).not.toHaveBeenCalled();
    expect(result.notified).toBe(0);
  });

  it("sends a teacher reminder 10 minutes before startTime, dedupes per day, fires even with no meetingUrl", async () => {
    // now = 16:50, slot starts 17:00 -> reminder due.
    const reminderNow = new Date("2026-08-18T16:50:00");
    listAll.mockResolvedValue([baseSlot({ meetingUrl: undefined })]);

    const result = await runClassNotificationsJob(reminderNow);

    expect(createMany).toHaveBeenCalledWith([
      expect.objectContaining({ recipientId: "teacher-1", type: "class_reminder", scheduleId: "slot-1" }),
    ]);
    expect(markReminderSentToday).toHaveBeenCalledWith("slot-1", "2026-08-18");
    expect(result.reminded).toBe(1);
  });

  it("doesn't re-send a reminder already sent today (dedupe)", async () => {
    const reminderNow = new Date("2026-08-18T16:50:00");
    listAll.mockResolvedValue([baseSlot({ meetingUrl: undefined, lastReminderDate: "2026-08-18" })]);

    const result = await runClassNotificationsJob(reminderNow);

    expect(result.reminded).toBe(0);
    expect(markReminderSentToday).not.toHaveBeenCalled();
  });

  it("ignores slots on a different day of week", async () => {
    listAll.mockResolvedValue([baseSlot({ dayOfWeek: 3 })]);

    const result = await runClassNotificationsJob(NOW);

    expect(result.notified).toBe(0);
    expect(result.reminded).toBe(0);
  });
});
