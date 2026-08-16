import { beforeEach, describe, expect, it, vi } from "vitest";

const getDoc = vi.fn();
const update = vi.fn();
const create = vi.fn();
const doc = vi.fn(() => ({ get: getDoc, update, create }));
const getQuery = vi.fn();
const where = vi.fn(() => ({ get: getQuery }));
const collection = vi.fn(() => ({ doc, where }));

vi.mock("@/lib/server/firebaseAdmin", () => ({
  adminDb: { collection },
}));

const { userRepository } = await import("./userRepository");

function makeUser(overrides: Partial<Parameters<typeof userRepository.create>[0]> = {}) {
  return {
    uid: "u1",
    email: "a@example.com",
    displayName: "Ahmed",
    role: "teacher" as const,
    createdBy: { uid: "admin-1", role: "admin" as const },
    createdAt: 100,
    ...overrides,
  };
}

describe("userRepository.listByRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists users of a given role, sorted by displayName", async () => {
    getQuery.mockResolvedValue({
      docs: [
        { data: () => makeUser({ uid: "u2", displayName: "Zainab" }) },
        { data: () => makeUser({ uid: "u1", displayName: "Ahmed" }) },
      ],
    });

    const result = await userRepository.listByRole("teacher");

    expect(where).toHaveBeenCalledWith("role", "==", "teacher");
    expect(result.map((u) => u.uid)).toEqual(["u1", "u2"]);
  });

  it("filters by a case-insensitive substring match on name or email", async () => {
    getQuery.mockResolvedValue({
      docs: [
        { data: () => makeUser({ uid: "u1", displayName: "Ahmed", email: "ahmed@example.com" }) },
        { data: () => makeUser({ uid: "u2", displayName: "Mona", email: "mona@example.com" }) },
      ],
    });

    const result = await userRepository.listByRole("teacher", "MONA");

    expect(result.map((u) => u.uid)).toEqual(["u2"]);
  });
});

describe("userRepository.setDisabled", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates the disabled flag on the user doc", async () => {
    update.mockResolvedValue(undefined);

    await userRepository.setDisabled("u1", true);

    expect(collection).toHaveBeenCalledWith("users");
    expect(doc).toHaveBeenCalledWith("u1");
    expect(update).toHaveBeenCalledWith({ disabled: true });
  });
});

describe("userRepository.updateDisplayName", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates the displayName field on the user doc", async () => {
    update.mockResolvedValue(undefined);

    await userRepository.updateDisplayName("u1", "New Name");

    expect(collection).toHaveBeenCalledWith("users");
    expect(doc).toHaveBeenCalledWith("u1");
    expect(update).toHaveBeenCalledWith({ displayName: "New Name" });
  });
});
