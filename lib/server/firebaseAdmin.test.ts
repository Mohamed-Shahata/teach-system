import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

async function importFresh() {
  vi.resetModules();
  return import("./firebaseAdmin");
}

describe("firebaseAdmin bootstrap", () => {
  beforeEach(() => {
    process.env.FIREBASE_PROJECT_ID = "test-project";
    process.env.FIREBASE_CLIENT_EMAIL = "test@test-project.iam.gserviceaccount.com";
    process.env.FIREBASE_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\\ntest\\n-----END PRIVATE KEY-----\\n";
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.doUnmock("firebase-admin/app");
    vi.doUnmock("firebase-admin/auth");
    vi.doUnmock("firebase-admin/firestore");
  });

  it("initializes exactly once, reusing an existing app when present", async () => {
    const initializeApp = vi.fn(() => ({ name: "[DEFAULT]" }));
    const cert = vi.fn((options) => options);
    const getApps = vi.fn(() => []);

    vi.doMock("firebase-admin/app", () => ({ initializeApp, cert, getApps }));
    vi.doMock("firebase-admin/auth", () => ({ getAuth: vi.fn(() => ({})) }));
    vi.doMock("firebase-admin/firestore", () => ({ getFirestore: vi.fn(() => ({})) }));

    await importFresh();

    expect(initializeApp).toHaveBeenCalledTimes(1);
    expect(cert).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: "test-project", clientEmail: expect.any(String) }),
    );
  });

  it("converts escaped \\n sequences in the private key to real newlines", async () => {
    const cert = vi.fn((options) => options);

    vi.doMock("firebase-admin/app", () => ({
      initializeApp: vi.fn(() => ({ name: "[DEFAULT]" })),
      cert,
      getApps: vi.fn(() => []),
    }));
    vi.doMock("firebase-admin/auth", () => ({ getAuth: vi.fn(() => ({})) }));
    vi.doMock("firebase-admin/firestore", () => ({ getFirestore: vi.fn(() => ({})) }));

    await importFresh();

    const passedKey = cert.mock.calls[0][0].privateKey as string;
    expect(passedKey).toContain("\n");
    expect(passedKey).not.toContain("\\n");
  });

  it("reuses an already-initialized app instead of calling initializeApp again", async () => {
    const existingApp = { name: "[DEFAULT]" };
    const initializeApp = vi.fn(() => existingApp);

    vi.doMock("firebase-admin/app", () => ({
      initializeApp,
      cert: vi.fn((options) => options),
      getApps: vi.fn(() => [existingApp]),
    }));
    vi.doMock("firebase-admin/auth", () => ({ getAuth: vi.fn(() => ({})) }));
    vi.doMock("firebase-admin/firestore", () => ({ getFirestore: vi.fn(() => ({})) }));

    await importFresh();

    expect(initializeApp).not.toHaveBeenCalled();
  });

  it("throws a clear error when a required env var is missing", async () => {
    delete process.env.FIREBASE_PRIVATE_KEY;

    vi.doMock("firebase-admin/app", () => ({
      initializeApp: vi.fn(() => ({ name: "[DEFAULT]" })),
      cert: vi.fn((options) => options),
      getApps: vi.fn(() => []),
    }));
    vi.doMock("firebase-admin/auth", () => ({ getAuth: vi.fn(() => ({})) }));
    vi.doMock("firebase-admin/firestore", () => ({ getFirestore: vi.fn(() => ({})) }));

    await expect(importFresh()).rejects.toThrow(/FIREBASE_PRIVATE_KEY/);
  });
});
