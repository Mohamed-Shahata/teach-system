import { beforeEach, describe, expect, it, vi } from "vitest";

const getCollection = vi.fn();
const createDoc = vi.fn();
const doc = vi.fn(() => ({ create: createDoc, id: "new-stage-id" }));
const collection = vi.fn(() => ({ get: getCollection, doc }));

vi.mock("@/lib/server/firebaseAdmin", () => ({
  adminDb: { collection },
}));

const { educationStageRepository } = await import("./educationStageRepository");

const rawDoc = { order: 1, name: { en: "Grade 1", ar: "الصف الأول" }, category: "primary" };

// One describe block, in this exact order — see subjectRepository.test.ts's
// note on why the cache-hit/miss/invalidate behaviors are asserted as one
// continuous sequence rather than independently reset per test.
describe("educationStageRepository.list caching (TASK-3602)", () => {
  beforeEach(() => {
    getCollection.mockClear();
    createDoc.mockClear();
    getCollection.mockResolvedValue({ docs: [{ id: "stage-1", data: () => rawDoc }] });
  });

  it("hits Firestore on the first call", async () => {
    const result = await educationStageRepository.list();
    expect(getCollection).toHaveBeenCalledTimes(1);
    expect(result).toEqual([{ id: "stage-1", ...rawDoc }]);
  });

  it("serves the next call from cache, without hitting Firestore again", async () => {
    await educationStageRepository.list();
    expect(getCollection).not.toHaveBeenCalled();
  });

  it("re-hits Firestore after a create invalidates the cache", async () => {
    createDoc.mockResolvedValue(undefined);
    await educationStageRepository.create({ order: 2, name: { en: "Grade 2", ar: "الصف الثاني" }, category: "primary" });

    await educationStageRepository.list();
    expect(getCollection).toHaveBeenCalledTimes(1);
  });
});
