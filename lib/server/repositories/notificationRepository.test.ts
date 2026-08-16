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
  studentId: "student-1",
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

  it("returns the student's notifications sorted newest first", async () => {
    getQuery.mockResolvedValue({
      docs: [
        { id: "n1", data: () => ({ ...raw, createdAt: 1000 }) },
        { id: "n2", data: () => ({ ...raw, createdAt: 2000 }) },
      ],
    });

    const result = await notificationRepository.listByStudent("student-1");

    expect(where).toHaveBeenCalledWith("studentId", "==", "student-1");
    expect(result.map((n) => n.id)).toEqual(["n2", "n1"]);
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

    const result = await notificationRepository.createMany([raw, { ...raw, studentId: "student-2" }]);

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
