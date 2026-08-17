import { beforeEach, describe, expect, it, vi } from "vitest";

const getDoc = vi.fn();
const updateDoc = vi.fn();
const doc = vi.fn(() => ({ get: getDoc, update: updateDoc, id: "new-doc-id" }));
const where = vi.fn();
const getQuery = vi.fn();
const batchCreate = vi.fn();
const batchCommit = vi.fn();
const batch = vi.fn(() => ({ create: batchCreate, commit: batchCommit }));
const collection = vi.fn(() => {
  const query = { where, get: getQuery, doc };
  where.mockReturnValue(query);
  return query;
});

vi.mock("@/lib/server/firebaseAdmin", () => ({
  adminDb: { collection, batch },
}));

const { notificationRepository } = await import("./notificationRepository");
const { ForbiddenError, NotFoundError } = await import("@/lib/errors");

const raw = {
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

describe("notificationRepository.listByStudent", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the student's meeting_link notifications sorted newest first", async () => {
    getQuery.mockResolvedValue({
      docs: [
        { id: "n1", data: () => ({ ...raw, createdAt: 1000 }) },
        { id: "n2", data: () => ({ ...raw, createdAt: 2000 }) },
      ],
    });

    const result = await notificationRepository.listByStudent("student-1");

    expect(where).toHaveBeenCalledWith("recipientId", "==", "student-1");
    expect(where).toHaveBeenCalledWith("type", "==", "meeting_link");
    expect(result.map((n) => n.id)).toEqual(["n2", "n1"]);
  });

  it("falls back to the pre-Phase-20 studentId field for older docs missing recipientId", async () => {
    getQuery.mockResolvedValue({
      docs: [{ id: "n1", data: () => ({ ...raw, recipientId: undefined, studentId: "student-1" }) }],
    });

    const result = await notificationRepository.listByStudent("student-1");

    expect(result[0].recipientId).toBe("student-1");
  });
});

describe("notificationRepository.listByTeacherRecipient", () => {
  beforeEach(() => vi.clearAllMocks());

  it("queries recipientId + type=class_reminder", async () => {
    getQuery.mockResolvedValue({
      docs: [{ id: "n1", data: () => ({ ...raw, recipientId: "teacher-1", type: "class_reminder", createdAt: Date.now() }) }],
    });

    const result = await notificationRepository.listByTeacherRecipient("teacher-1");

    expect(where).toHaveBeenCalledWith("recipientId", "==", "teacher-1");
    expect(where).toHaveBeenCalledWith("type", "==", "class_reminder");
    expect(result).toHaveLength(1);
  });

  // TASK-3005
  it("excludes an acknowledged reminder", async () => {
    getQuery.mockResolvedValue({
      docs: [
        {
          id: "n1",
          data: () => ({ ...raw, recipientId: "teacher-1", type: "class_reminder", createdAt: Date.now(), acknowledged: true }),
        },
      ],
    });

    const result = await notificationRepository.listByTeacherRecipient("teacher-1");

    expect(result).toHaveLength(0);
  });

  // TASK-3005 — a reminder's class start time is always createdAt + REMINDER_MINUTES_BEFORE minutes.
  it("excludes an expired reminder (class start time has passed)", async () => {
    const elevenMinutesAgo = Date.now() - 11 * 60 * 1000;
    getQuery.mockResolvedValue({
      docs: [
        { id: "n1", data: () => ({ ...raw, recipientId: "teacher-1", type: "class_reminder", createdAt: elevenMinutesAgo }) },
      ],
    });

    const result = await notificationRepository.listByTeacherRecipient("teacher-1");

    expect(result).toHaveLength(0);
  });

  it("keeps a reminder still within its 10-minute window", async () => {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    getQuery.mockResolvedValue({
      docs: [
        { id: "n1", data: () => ({ ...raw, recipientId: "teacher-1", type: "class_reminder", createdAt: fiveMinutesAgo }) },
      ],
    });

    const result = await notificationRepository.listByTeacherRecipient("teacher-1");

    expect(result).toHaveLength(1);
  });
});

describe("notificationRepository.createMany", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns [] without touching Firestore when given no notifications", async () => {
    const result = await notificationRepository.createMany([]);
    expect(result).toEqual([]);
    expect(batch).not.toHaveBeenCalled();
  });

  it("writes one doc per notification in a single batch", async () => {
    batchCommit.mockResolvedValue(undefined);

    const result = await notificationRepository.createMany([raw, { ...raw, recipientId: "student-2" }]);

    expect(batchCreate).toHaveBeenCalledTimes(2);
    expect(batchCommit).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(2);
  });
});

describe("notificationRepository.markRead", () => {
  beforeEach(() => vi.clearAllMocks());

  it("marks the owning student's notification read", async () => {
    getDoc.mockResolvedValue({ exists: true, id: "n1", data: () => raw });
    updateDoc.mockResolvedValue(undefined);

    const result = await notificationRepository.markRead(
      { uid: "student-1", email: "s@example.com", role: "student" },
      "n1",
    );

    expect(updateDoc).toHaveBeenCalledWith({ read: true });
    expect(result.read).toBe(true);
  });

  it("throws NotFoundError for a missing notification", async () => {
    getDoc.mockResolvedValue({ exists: false });

    await expect(
      notificationRepository.markRead({ uid: "student-1", email: "s@example.com", role: "student" }, "missing"),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects a different student", async () => {
    getDoc.mockResolvedValue({ exists: true, id: "n1", data: () => raw });

    await expect(
      notificationRepository.markRead({ uid: "student-2", email: "s2@example.com", role: "student" }, "n1"),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("notificationRepository.acknowledge", () => {
  beforeEach(() => vi.clearAllMocks());

  const reminder = { ...raw, recipientId: "teacher-1", type: "class_reminder" as const };

  it("acknowledges the owning teacher's own class_reminder", async () => {
    getDoc.mockResolvedValue({ exists: true, id: "n1", data: () => reminder });
    updateDoc.mockResolvedValue(undefined);

    const result = await notificationRepository.acknowledge(
      { uid: "teacher-1", email: "t@example.com", role: "teacher" },
      "n1",
    );

    expect(updateDoc).toHaveBeenCalledWith({ acknowledged: true, read: true });
    expect(result.acknowledged).toBe(true);
    expect(result.read).toBe(true);
  });

  it("rejects a non-class_reminder notification", async () => {
    getDoc.mockResolvedValue({ exists: true, id: "n1", data: () => raw });

    await expect(
      notificationRepository.acknowledge({ uid: "student-1", email: "s@example.com", role: "student" }, "n1"),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("rejects a different teacher", async () => {
    getDoc.mockResolvedValue({ exists: true, id: "n1", data: () => reminder });

    await expect(
      notificationRepository.acknowledge({ uid: "teacher-2", email: "t2@example.com", role: "teacher" }, "n1"),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("throws NotFoundError for a missing notification", async () => {
    getDoc.mockResolvedValue({ exists: false });

    await expect(
      notificationRepository.acknowledge({ uid: "teacher-1", email: "t@example.com", role: "teacher" }, "missing"),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
