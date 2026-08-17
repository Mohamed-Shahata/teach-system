import { beforeEach, describe, expect, it, vi } from "vitest";

const upsert = vi.fn();
const listForUser = vi.fn();
const remove = vi.fn();

vi.mock("@/lib/server/repositories/fcmTokenRepository", () => ({
  fcmTokenRepository: { upsert, listForUser, remove },
}));

const { fcmTokenService } = await import("./fcmTokenService");
const { NotFoundError } = await import("@/lib/errors");

const session = { uid: "user-1", email: "u@example.com", role: "student" as const };

describe("fcmTokenService.registerToken", () => {
  beforeEach(() => vi.clearAllMocks());

  it("upserts under the caller's own uid", async () => {
    upsert.mockResolvedValue({ id: "tok-1", token: "t", userAgent: null, createdAt: 1, updatedAt: 1 });

    await fcmTokenService.registerToken(session, { token: "t" });

    expect(upsert).toHaveBeenCalledWith("user-1", "t", null);
  });
});

describe("fcmTokenService.listMyTokens", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists only the caller's own tokens", async () => {
    listForUser.mockResolvedValue([]);
    await fcmTokenService.listMyTokens(session);
    expect(listForUser).toHaveBeenCalledWith("user-1");
  });
});

describe("fcmTokenService.removeToken", () => {
  beforeEach(() => vi.clearAllMocks());

  it("removes a token that belongs to the caller", async () => {
    listForUser.mockResolvedValue([{ id: "tok-1", token: "t", userAgent: null, createdAt: 1, updatedAt: 1 }]);
    remove.mockResolvedValue(undefined);

    await fcmTokenService.removeToken(session, "tok-1");

    expect(remove).toHaveBeenCalledWith("user-1", "tok-1");
  });

  it("throws NotFoundError for a token that isn't the caller's own", async () => {
    listForUser.mockResolvedValue([]);

    await expect(fcmTokenService.removeToken(session, "someone-elses-token")).rejects.toThrow(NotFoundError);
    expect(remove).not.toHaveBeenCalled();
  });
});
