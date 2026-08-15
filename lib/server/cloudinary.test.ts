import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { signCloudinaryUpload } from "./cloudinary";

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
