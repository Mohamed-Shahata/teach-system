import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resourceTypeForMimeType, uploadImage, uploadLessonFile } from "./upload";

describe("resourceTypeForMimeType", () => {
  it("maps MIME prefixes to Cloudinary resource types", () => {
    expect(resourceTypeForMimeType("image/png")).toBe("image");
    expect(resourceTypeForMimeType("video/mp4")).toBe("video");
    expect(resourceTypeForMimeType("application/pdf")).toBe("raw");
  });
});

describe("uploadImage / uploadLessonFile", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  function mockSignThenUpload(signBody: object, uploadBody: object) {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === "/api/uploads/sign") {
        return Promise.resolve({ ok: true, json: async () => signBody });
      }
      return Promise.resolve({ ok: true, json: async () => uploadBody });
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    return fetchMock;
  }

  it("signs then uploads to the image endpoint for uploadImage", async () => {
    const fetchMock = mockSignThenUpload(
      { signature: "sig", timestamp: 1, apiKey: "key", cloudName: "cloud", folder: "teachers/t1/courses/c1/thumbnail" },
      { secure_url: "https://res.cloudinary.com/cloud/image/upload/x.png", public_id: "x" },
    );

    const file = new File(["data"], "thumb.png", { type: "image/png" });
    const result = await uploadImage({ target: "course-thumbnail", courseId: "c1", file });

    expect(result).toEqual({ secureUrl: "https://res.cloudinary.com/cloud/image/upload/x.png", publicId: "x" });
    const uploadCall = fetchMock.mock.calls[1];
    expect(uploadCall[0]).toBe("https://api.cloudinary.com/v1_1/cloud/image/upload");
  });

  it("signs a lesson-file target and uploads to the resource-type-appropriate endpoint", async () => {
    const fetchMock = mockSignThenUpload(
      {
        signature: "sig",
        timestamp: 1,
        apiKey: "key",
        cloudName: "cloud",
        folder: "teachers/t1/courses/c1/lessons/l1/files",
      },
      { secure_url: "https://res.cloudinary.com/cloud/raw/upload/notes.pdf", public_id: "notes" },
    );

    const file = new File(["%PDF-1.4"], "notes.pdf", { type: "application/pdf" });
    const result = await uploadLessonFile({ lessonId: "l1", file });

    expect(result).toEqual({
      secureUrl: "https://res.cloudinary.com/cloud/raw/upload/notes.pdf",
      publicId: "notes",
      fileName: "notes.pdf",
      fileType: "application/pdf",
      fileSize: file.size,
    });

    const signCall = fetchMock.mock.calls[0];
    expect(JSON.parse(signCall[1].body as string)).toEqual({ target: "lesson-file", lessonId: "l1" });
    const uploadCall = fetchMock.mock.calls[1];
    expect(uploadCall[0]).toBe("https://api.cloudinary.com/v1_1/cloud/raw/upload");
  });

  it("throws when signing fails", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;
    const file = new File(["data"], "x.pdf", { type: "application/pdf" });
    await expect(uploadLessonFile({ lessonId: "l1", file })).rejects.toThrow("sign-failed");
  });

  it("throws when the Cloudinary upload fails", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === "/api/uploads/sign") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ signature: "sig", timestamp: 1, apiKey: "key", cloudName: "cloud", folder: "f" }),
        });
      }
      return Promise.resolve({ ok: false });
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const file = new File(["data"], "x.pdf", { type: "application/pdf" });
    await expect(uploadLessonFile({ lessonId: "l1", file })).rejects.toThrow("upload-failed");
  });
});
