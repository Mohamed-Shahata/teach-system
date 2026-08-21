import { beforeEach, describe, expect, it, vi } from "vitest";

const getCollection = vi.fn();
const createDoc = vi.fn();
const doc = vi.fn(() => ({ create: createDoc, id: "new-subject-id" }));
const collection = vi.fn(() => ({ get: getCollection, doc }));

vi.mock("@/lib/server/firebaseAdmin", () => ({
  adminDb: { collection },
}));

const { subjectRepository } = await import("./subjectRepository");

const rawDoc = { name: { en: "Math", ar: "رياضيات" }, createdAt: 1 };

// One describe block, in this exact order — the in-memory cache (TASK-3602)
// is module-level state, so these three behaviors (hit Firestore, serve
// from cache, invalidate on write) have to be asserted as one continuous
// sequence rather than independently reset per test.
describe("subjectRepository.list caching (TASK-3602)", () => {
  beforeEach(() => {
    getCollection.mockClear();
    createDoc.mockClear();
    getCollection.mockResolvedValue({ docs: [{ id: "subject-1", data: () => rawDoc }] });
  });

  it("hits Firestore on the first call", async () => {
    const result = await subjectRepository.list();
    expect(getCollection).toHaveBeenCalledTimes(1);
    expect(result).toEqual([{ id: "subject-1", ...rawDoc }]);
  });

  it("serves the next call from cache, without hitting Firestore again", async () => {
    await subjectRepository.list();
    expect(getCollection).not.toHaveBeenCalled();
  });

  it("re-hits Firestore after a create invalidates the cache", async () => {
    createDoc.mockResolvedValue(undefined);
    await subjectRepository.create({ name: { en: "Science", ar: "علوم" }, createdAt: 2 });

    await subjectRepository.list();
    expect(getCollection).toHaveBeenCalledTimes(1);
  });
});
