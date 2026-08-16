import { beforeEach, describe, expect, it, vi } from "vitest";

const updateDoc = vi.fn();
const doc = vi.fn(() => ({ update: updateDoc }));
const where = vi.fn();
const getQuery = vi.fn();
const collection = vi.fn(() => {
  const query = { where, get: getQuery, doc };
  where.mockReturnValue(query);
  return query;
});

vi.mock("@/lib/server/firebaseAdmin", () => ({
  adminDb: { collection },
}));

const { scheduleRepository } = await import("./scheduleRepository");

const rawSlot = {
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

describe("scheduleRepository.listAll", () => {
  beforeEach(() => vi.clearAllMocks());

  it("queries every slot unscoped, regardless of meetingUrl", async () => {
    getQuery.mockResolvedValue({ docs: [{ id: "slot-1", data: () => rawSlot }] });

    const result = await scheduleRepository.listAll();

    expect(where).not.toHaveBeenCalled();
    expect(result).toEqual([{ id: "slot-1", ...rawSlot }]);
  });
});

describe("scheduleRepository.markNotifiedToday / markReminderSentToday", () => {
  beforeEach(() => vi.clearAllMocks());

  it("writes lastNotifiedDate on the slot", async () => {
    updateDoc.mockResolvedValue(undefined);
    await scheduleRepository.markNotifiedToday("slot-1", "2026-08-16");
    expect(doc).toHaveBeenCalledWith("slot-1");
    expect(updateDoc).toHaveBeenCalledWith({ lastNotifiedDate: "2026-08-16" });
  });

  it("writes lastReminderDate on the slot", async () => {
    updateDoc.mockResolvedValue(undefined);
    await scheduleRepository.markReminderSentToday("slot-1", "2026-08-16");
    expect(doc).toHaveBeenCalledWith("slot-1");
    expect(updateDoc).toHaveBeenCalledWith({ lastReminderDate: "2026-08-16" });
  });
});
