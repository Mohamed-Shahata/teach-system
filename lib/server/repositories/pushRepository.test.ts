import { beforeEach, describe, expect, it, vi } from "vitest";

const sendEachForMulticast = vi.fn();
const getMessaging = vi.fn(() => ({ sendEachForMulticast }));

vi.mock("firebase-admin/messaging", () => ({ getMessaging }));
vi.mock("@/lib/server/firebaseAdmin", () => ({ adminApp: {} }));

const { pushRepository } = await import("./pushRepository");

describe("pushRepository.sendMulticast", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns [] without calling the Admin SDK when there are no tokens", async () => {
    const result = await pushRepository.sendMulticast([], { title: "t", body: "b" });
    expect(result).toEqual([]);
    expect(sendEachForMulticast).not.toHaveBeenCalled();
  });

  it("sends one multicast call and maps responses back to their tokens in order", async () => {
    sendEachForMulticast.mockResolvedValue({
      responses: [
        { success: true },
        { success: false, error: { code: "messaging/registration-token-not-registered" } },
      ],
    });

    const result = await pushRepository.sendMulticast(["tok-1", "tok-2"], {
      title: "Class is starting",
      body: "Tap to join.",
      data: { type: "meeting_link" },
    });

    expect(sendEachForMulticast).toHaveBeenCalledWith({
      tokens: ["tok-1", "tok-2"],
      notification: { title: "Class is starting", body: "Tap to join." },
      data: { type: "meeting_link" },
    });
    expect(result).toEqual([
      { token: "tok-1", success: true },
      { token: "tok-2", success: false, errorCode: "messaging/registration-token-not-registered" },
    ]);
  });

  it("omits the data field entirely when none is given", async () => {
    sendEachForMulticast.mockResolvedValue({ responses: [{ success: true }] });

    await pushRepository.sendMulticast(["tok-1"], { title: "t", body: "b" });

    expect(sendEachForMulticast).toHaveBeenCalledWith({
      tokens: ["tok-1"],
      notification: { title: "t", body: "b" },
    });
  });
});
