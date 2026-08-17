import { beforeEach, describe, expect, it, vi } from "vitest";

const findById = vi.fn();
const listByTeacher = vi.fn();
const findByIds = vi.fn();
const createMany = vi.fn();
const listByStudent = vi.fn();
const markRead = vi.fn();
const acknowledge = vi.fn();
const listByRecipientAudit = vi.fn();
const dispatchForNotifications = vi.fn();

vi.mock("@/lib/server/repositories/scheduleRepository", () => ({
  scheduleRepository: { findById },
}));
vi.mock("@/lib/server/repositories/enrollmentRepository", () => ({
  enrollmentRepository: { listByTeacher },
}));
vi.mock("@/lib/server/repositories/userRepository", () => ({
  userRepository: { findByIds },
}));
vi.mock("@/lib/server/repositories/notificationRepository", () => ({
  notificationRepository: { createMany, listByStudent, markRead, acknowledge, listByRecipientAudit },
}));
vi.mock("@/lib/server/services/pushDispatchService", () => ({
  pushDispatchService: { dispatchForNotifications },
}));

const { notificationService } = await import("./notificationService");
const { ForbiddenError, NotFoundError, ValidationError } = await import("@/lib/errors");

function makeSession(role: "admin" | "teacher" | "student", uid = "teacher-1") {
  return { uid, email: `${uid}@example.com`, role } as const;
}

const slot = {
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
};

describe("notificationService.sendMeetingLink", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findById.mockResolvedValue(slot);
    createMany.mockImplementation(async (notifications) =>
      notifications.map((n: Record<string, unknown>, i: number) => ({ id: `notif-${i}`, ...n })),
    );
  });

  it("only notifies active students in exactly the slot's stage, same teacher", async () => {
    listByTeacher.mockResolvedValue([
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

    const result = await notificationService.sendMeetingLink(makeSession("teacher"), "slot-1");

    expect(createMany).toHaveBeenCalledWith([
      expect.objectContaining({
        recipientId: "student-match",
        meetingUrl: slot.meetingUrl,
        stageId: "secondary-3",
        link: "/student/teachers/teacher-1",
      }),
    ]);
    expect(result.sentCount).toBe(1);
    expect(dispatchForNotifications).toHaveBeenCalledWith([
      expect.objectContaining({ recipientId: "student-match" }),
    ]);
  });

  it("throws if the slot has no meetingUrl set yet", async () => {
    findById.mockResolvedValue({ ...slot, meetingUrl: undefined });

    await expect(notificationService.sendMeetingLink(makeSession("teacher"), "slot-1")).rejects.toBeInstanceOf(
      ValidationError,
    );
    expect(createMany).not.toHaveBeenCalled();
  });

  it("throws NotFoundError for an unknown slot", async () => {
    findById.mockResolvedValue(null);

    await expect(notificationService.sendMeetingLink(makeSession("teacher"), "missing")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("rejects a teacher who doesn't own the slot", async () => {
    await expect(
      notificationService.sendMeetingLink(makeSession("teacher", "teacher-2"), "slot-1"),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(createMany).not.toHaveBeenCalled();
  });

  it("rejects non-teacher sessions", async () => {
    await expect(notificationService.sendMeetingLink(makeSession("student"), "slot-1")).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });
});

describe("notificationService.listMyNotifications", () => {
  it("lists the signed-in student's own notifications", async () => {
    listByStudent.mockResolvedValue([]);
    const session = makeSession("student", "student-1");

    await notificationService.listMyNotifications(session);

    expect(listByStudent).toHaveBeenCalledWith("student-1");
  });

  it("rejects non-student sessions", async () => {
    await expect(notificationService.listMyNotifications(makeSession("teacher"))).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });
});

describe("notificationService.listMyAuditNotifications", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists the signed-in user's own audit notifications, any role", async () => {
    listByRecipientAudit.mockResolvedValue([]);

    await notificationService.listMyAuditNotifications(makeSession("admin", "admin-1"));
    expect(listByRecipientAudit).toHaveBeenCalledWith("admin-1");

    await notificationService.listMyAuditNotifications(makeSession("student", "student-1"));
    expect(listByRecipientAudit).toHaveBeenCalledWith("student-1");
  });
});

describe("notificationService.acknowledgeClassReminder", () => {
  beforeEach(() => vi.clearAllMocks());

  it("acknowledges on behalf of the signed-in teacher", async () => {
    acknowledge.mockResolvedValue({ id: "n1", acknowledged: true });
    const session = makeSession("teacher", "teacher-1");

    await notificationService.acknowledgeClassReminder(session, "n1");

    expect(acknowledge).toHaveBeenCalledWith(session, "n1");
  });

  it("rejects non-teacher sessions", async () => {
    await expect(
      notificationService.acknowledgeClassReminder(makeSession("student"), "n1"),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(acknowledge).not.toHaveBeenCalled();
  });
});
