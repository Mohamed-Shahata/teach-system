import { beforeEach, describe, expect, it, vi } from "vitest";

const getDoc = vi.fn();
const setDoc = vi.fn();
const deleteDoc = vi.fn();
const subGet = vi.fn();
const subDoc = vi.fn(() => ({ get: getDoc, set: setDoc, delete: deleteDoc }));
const subCollection = vi.fn(() => ({ doc: subDoc, get: subGet }));
const userDoc = vi.fn(() => ({ collection: subCollection }));
const collection = vi.fn(() => ({ doc: userDoc }));

vi.mock("@/lib/server/firebaseAdmin", () => ({
  adminDb: { collection },
}));

const { fcmTokenRepository } = await import("./fcmTokenRepository");

// sha256("device-token-abc") — the deterministic doc id this token maps to.
const TOKEN = "device-token-abc";

describe("fcmTokenRepository.upsert", () => {
  beforeEach(() => vi.clearAllMocks());

  it("scopes to users/{uid}/fcmTokens and preserves createdAt on re-registration", async () => {
    getDoc.mockResolvedValue({ exists: true, data: () => ({ createdAt: 111 }) });
    setDoc.mockResolvedValue(undefined);

    const result = await fcmTokenRepository.upsert("user-1", TOKEN, "Mozilla/5.0");

    expect(collection).toHaveBeenCalledWith("users");
    expect(userDoc).toHaveBeenCalledWith("user-1");
    expect(subCollection).toHaveBeenCalledWith("fcmTokens");
    expect(result.createdAt).toBe(111);
    expect(result.token).toBe(TOKEN);
    expect(result.userAgent).toBe("Mozilla/5.0");
    expect(setDoc).toHaveBeenCalledWith(
      expect.objectContaining({ token: TOKEN, userAgent: "Mozilla/5.0", createdAt: 111 }),
    );
  });

  it("sets a fresh createdAt on first registration", async () => {
    getDoc.mockResolvedValue({ exists: false });
    setDoc.mockResolvedValue(undefined);

    const result = await fcmTokenRepository.upsert("user-1", TOKEN, null);

    expect(result.createdAt).toBe(result.updatedAt);
  });

  it("derives the same doc id for the same token across calls", async () => {
    getDoc.mockResolvedValue({ exists: false });
    setDoc.mockResolvedValue(undefined);

    await fcmTokenRepository.upsert("user-1", TOKEN, null);
    const firstCallId = (subDoc.mock.calls[0] as unknown as [string])[0];
    vi.clearAllMocks();
    getDoc.mockResolvedValue({ exists: false });
    setDoc.mockResolvedValue(undefined);
    await fcmTokenRepository.upsert("user-1", TOKEN, null);
    const secondCallId = (subDoc.mock.calls[0] as unknown as [string])[0];

    expect(firstCallId).toBe(secondCallId);
  });
});

describe("fcmTokenRepository.listForUser", () => {
  beforeEach(() => vi.clearAllMocks());

  it("maps subcollection docs to FcmTokenDoc", async () => {
    subGet.mockResolvedValue({
      docs: [
        { id: "tok-1", data: () => ({ token: "t1", userAgent: null, createdAt: 1, updatedAt: 2 }) },
      ],
    });

    const result = await fcmTokenRepository.listForUser("user-1");

    expect(result).toEqual([{ id: "tok-1", token: "t1", userAgent: null, createdAt: 1, updatedAt: 2 }]);
  });
});

describe("fcmTokenRepository.remove", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes the doc at the given id under the user's subcollection", async () => {
    deleteDoc.mockResolvedValue(undefined);

    await fcmTokenRepository.remove("user-1", "tok-1");

    expect(subDoc).toHaveBeenCalledWith("tok-1");
    expect(deleteDoc).toHaveBeenCalled();
  });
});
