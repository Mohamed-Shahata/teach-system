import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getMessagingMock = vi.fn();
const isSupportedMock = vi.fn();
const getTokenMock = vi.fn();
const onMessageMock = vi.fn();

vi.mock("firebase/messaging", () => ({
  getMessaging: (...args: unknown[]) => getMessagingMock(...args),
  isSupported: () => isSupportedMock(),
  getToken: (...args: unknown[]) => getTokenMock(...args),
  onMessage: (...args: unknown[]) => onMessageMock(...args),
}));

vi.mock("@/lib/client/firebaseClient", () => ({
  clientApp: {
    options: {
      apiKey: "api-key",
      authDomain: "auth-domain",
      projectId: "project-id",
      messagingSenderId: "sender-id",
      appId: "app-id",
    },
  },
}));

describe("requestPushToken", () => {
  const originalEnv = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  let registerMock: ReturnType<typeof vi.fn>;
  let requestPermissionMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    getMessagingMock.mockReturnValue({});
    isSupportedMock.mockResolvedValue(true);
    getTokenMock.mockResolvedValue("device-token");
    process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY = "vapid-key";

    registerMock = vi.fn().mockResolvedValue({ scope: "/" });
    requestPermissionMock = vi.fn().mockResolvedValue("granted");

    vi.stubGlobal("navigator", { serviceWorker: { register: registerMock } });
    vi.stubGlobal("window", { PushManager: function () {}, Notification: {} });
    vi.stubGlobal("Notification", { requestPermission: requestPermissionMock });
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY = originalEnv;
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("returns null when push isn't supported in this browser", async () => {
    vi.stubGlobal("navigator", {});
    const { requestPushToken } = await import("./firebaseMessaging");

    expect(await requestPushToken()).toBeNull();
    expect(requestPermissionMock).not.toHaveBeenCalled();
  });

  it("returns null when the VAPID key isn't configured", async () => {
    process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY = "";
    const { requestPushToken } = await import("./firebaseMessaging");

    expect(await requestPushToken()).toBeNull();
  });

  it("returns null when the user denies permission", async () => {
    requestPermissionMock.mockResolvedValue("denied");
    const { requestPushToken } = await import("./firebaseMessaging");

    expect(await requestPushToken()).toBeNull();
    expect(registerMock).not.toHaveBeenCalled();
  });

  it("registers the service worker with the public config as query params and returns the token", async () => {
    const { requestPushToken } = await import("./firebaseMessaging");

    const token = await requestPushToken();

    expect(token).toBe("device-token");
    expect(registerMock).toHaveBeenCalledTimes(1);
    const [swUrl] = registerMock.mock.calls[0] as [string];
    expect(swUrl.startsWith("/firebase-messaging-sw.js?")).toBe(true);
    expect(swUrl).toContain("apiKey=api-key");
    expect(swUrl).toContain("messagingSenderId=sender-id");
    expect(getTokenMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ vapidKey: "vapid-key" }),
    );
  });

  it("returns null when the browser reports push as unsupported", async () => {
    isSupportedMock.mockResolvedValue(false);
    const { requestPushToken } = await import("./firebaseMessaging");

    expect(await requestPushToken()).toBeNull();
  });
});

describe("syncPushToken", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.unstubAllGlobals();
  });

  it("posts the token to the server and returns true on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock as unknown as typeof fetch;
    vi.stubGlobal("navigator", { userAgent: "test-agent" });

    const { syncPushToken } = await import("./firebaseMessaging");
    const ok = await syncPushToken("device-token");

    expect(ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/notifications/fcm-tokens",
      expect.objectContaining({ method: "POST" }),
    );
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(options.body as string)).toEqual({ token: "device-token", userAgent: "test-agent" });
  });

  it("returns false when the request fails", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("network down")) as unknown as typeof fetch;

    const { syncPushToken } = await import("./firebaseMessaging");

    expect(await syncPushToken("device-token")).toBe(false);
  });

  it("returns false when the server responds not-ok", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;

    const { syncPushToken } = await import("./firebaseMessaging");

    expect(await syncPushToken("device-token")).toBe(false);
  });
});

describe("listenForForegroundMessages", () => {
  beforeEach(() => {
    vi.resetModules();
    getMessagingMock.mockReturnValue({});
    isSupportedMock.mockResolvedValue(true);
    onMessageMock.mockReturnValue(() => {});

    vi.stubGlobal("navigator", { serviceWorker: { register: vi.fn() } });
    vi.stubGlobal("window", { PushManager: function () {}, Notification: {} });
    vi.stubGlobal("Notification", { requestPermission: vi.fn() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("subscribes via onMessage and returns the unsubscribe function", async () => {
    const { listenForForegroundMessages } = await import("./firebaseMessaging");
    const callback = vi.fn();

    const unsubscribe = await listenForForegroundMessages(callback);

    expect(onMessageMock).toHaveBeenCalledWith(expect.anything(), callback);
    expect(unsubscribe).toBeTypeOf("function");
  });

  it("returns null when push isn't supported", async () => {
    vi.stubGlobal("navigator", {});
    const { listenForForegroundMessages } = await import("./firebaseMessaging");

    expect(await listenForForegroundMessages(vi.fn())).toBeNull();
  });
});
