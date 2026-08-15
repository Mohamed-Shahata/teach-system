import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { destroyCloudinaryUpload, resourceTypeFromMimeType, signCloudinaryUpload } from "./cloudinary";

const ORIGINAL_ENV = { ...process.env };

describe("signCloudinaryUpload", () => {
  beforeEach(() => {
    process.env.CLOUDINARY_API_SECRET = "test-secret";
    process.env.CLOUDINARY_API_KEY = "test-key";
    process.env.CLOUDINARY_CLOUD_NAME = "test-cloud";
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("produces a signature matching Cloudinary's SHA-1 scheme", () => {
    const folder = "teachers/teacher-1/courses/course-1/thumbnail";
    const timestamp = 1_700_000_000;

    const result = signCloudinaryUpload({ folder, timestamp });

    const expected = createHash("sha1")
      .update(`folder=${folder}&timestamp=${timestamp}test-secret`)
      .digest("hex");

    expect(result).toEqual({
      signature: expected,
      timestamp,
      apiKey: "test-key",
      cloudName: "test-cloud",
      folder,
    });
  });

  it("throws when a required env var is missing", () => {
    delete process.env.CLOUDINARY_API_SECRET;

    expect(() => signCloudinaryUpload({ folder: "x", timestamp: 1 })).toThrow(
      /CLOUDINARY_API_SECRET/,
    );
  });
});

describe("destroyCloudinaryUpload", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.CLOUDINARY_API_SECRET = "test-secret";
    process.env.CLOUDINARY_API_KEY = "test-key";
    process.env.CLOUDINARY_CLOUD_NAME = "test-cloud";
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    global.fetch = originalFetch;
  });

  it("posts a signed destroy request to Cloudinary's Admin API", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: "ok" }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await destroyCloudinaryUpload("teachers/t1/courses/c1/lessons/l1/files/notes", "raw");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.cloudinary.com/v1_1/test-cloud/raw/destroy");
    expect(init.method).toBe("POST");
    const body = new URLSearchParams(init.body as string);
    expect(body.get("public_id")).toBe("teachers/t1/courses/c1/lessons/l1/files/notes");
    expect(body.get("api_key")).toBe("test-key");
    expect(body.get("signature")).toBeTruthy();
  });

  it("treats an already-gone asset (result: not found) as success", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: "not found" }),
    }) as unknown as typeof fetch;

    await expect(destroyCloudinaryUpload("gone", "image")).resolves.toBeUndefined();
  });

  it("throws when Cloudinary returns a non-ok HTTP status", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 }) as unknown as typeof fetch;

    await expect(destroyCloudinaryUpload("x", "image")).rejects.toThrow(/HTTP 500/);
  });

  it("throws when Cloudinary's result is neither ok nor not found", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: "error" }),
    }) as unknown as typeof fetch;

    await expect(destroyCloudinaryUpload("x", "image")).rejects.toThrow(/result=error/);
  });
});

describe("resourceTypeFromMimeType", () => {
  it("maps MIME prefixes to Cloudinary resource types", () => {
    expect(resourceTypeFromMimeType("image/png")).toBe("image");
    expect(resourceTypeFromMimeType("video/mp4")).toBe("video");
    expect(resourceTypeFromMimeType("application/pdf")).toBe("raw");
  });
});
