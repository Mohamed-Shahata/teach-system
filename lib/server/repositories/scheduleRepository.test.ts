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

describe("scheduleRepository.listByTeacherIds", () => {
  beforeEach(() => vi.clearAllMocks());

  it("queries with an 'in' filter on teacherId and sorts by day/time", async () => {
    getQuery.mockResolvedValue({
      docs: [
        { id: "slot-2", data: () => ({ ...rawSlot, dayOfWeek: 1, startTime: "10:00" }) },
        { id: "slot-1", data: () => ({ ...rawSlot, dayOfWeek: 1, startTime: "09:00" }) },
      ],
    });

    const result = await scheduleRepository.listByTeacherIds(["teacher-1", "teacher-2"]);

    expect(where).toHaveBeenCalledWith("teacherId", "in", ["teacher-1", "teacher-2"]);
    expect(result.map((s) => s.id)).toEqual(["slot-1", "slot-2"]);
  });

  it("returns an empty array without querying for an empty input", async () => {
    const result = await scheduleRepository.listByTeacherIds([]);
    expect(getQuery).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it("deduplicates ids and chunks queries past 30", async () => {
    getQuery.mockResolvedValue({ docs: [] });
    const ids = Array.from({ length: 35 }, (_, i) => `teacher-${i}`);

    await scheduleRepository.listByTeacherIds([...ids, "teacher-0"]);

    expect(getQuery).toHaveBeenCalledTimes(2);
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
