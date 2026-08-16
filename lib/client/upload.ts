import type { UploadTarget } from "@/lib/validation/upload.schema";

export interface UploadImageOptions {
  target: UploadTarget;
  courseId?: string;
  file: File;
}

export interface UploadImageResult {
  secureUrl: string;
  publicId: string;
}

/** Cloudinary's own `resource_type` values — mirrors `resourceTypeFromMimeType` in `lib/server/cloudinary.ts`, kept as a separate small copy so the client bundle never pulls in the `server-only` module. */
export function resourceTypeForMimeType(mimeType: string): "image" | "video" | "raw" {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  return "raw";
}

interface SignAndUploadOptions {
  target: UploadTarget;
  courseId?: string;
  lessonId?: string;
  file: File;
  resourceType: "image" | "video" | "raw";
}

/**
 * Client-side half of the signed-upload flow (docs/cloudinary/README.md):
 * ask our server for a signature scoped to an authorized folder, then
 * upload the file bytes directly to Cloudinary — never through our own
 * server. `CLOUDINARY_API_SECRET` is never present in this module.
 */
async function signAndUpload({
  target,
  courseId,
  lessonId,
  file,
  resourceType,
}: SignAndUploadOptions): Promise<UploadImageResult> {
  const signRes = await fetch("/api/uploads/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ target, ...(courseId ? { courseId } : {}), ...(lessonId ? { lessonId } : {}) }),
  });
  if (!signRes.ok) {
    throw new Error("sign-failed");
  }
  const { signature, timestamp, apiKey, cloudName, folder } = (await signRes.json()) as {
    signature: string;
    timestamp: number;
    apiKey: string;
    cloudName: string;
    folder: string;
  };

  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", apiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("signature", signature);
  formData.append("folder", folder);

  const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, {
    method: "POST",
    body: formData,
  });
  if (!uploadRes.ok) {
    throw new Error("upload-failed");
  }
  const body = (await uploadRes.json()) as { secure_url: string; public_id: string };
  return { secureUrl: body.secure_url, publicId: body.public_id };
}

export async function uploadImage({ target, courseId, file }: UploadImageOptions): Promise<UploadImageResult> {
  return signAndUpload({ target, courseId, file, resourceType: "image" });
}

export interface UploadLessonFileOptions {
  lessonId: string;
  file: File;
}

export interface UploadLessonFileResult extends UploadImageResult {
  fileName: string;
  fileType: string;
  fileSize: number;
}

/**
 * Signs + uploads a lesson attachment (any MIME type — PDF, image,
 * video, ...) to Cloudinary, resolving `resource_type` from the file's
 * own MIME type. Callers still need to `POST /api/files` with the
 * result to persist the metadata (see `fileService.createFile`,
 * TASK-1302) — this function only performs the Cloudinary half.
 */
export async function uploadLessonFile({ lessonId, file }: UploadLessonFileOptions): Promise<UploadLessonFileResult> {
  const fileType = file.type || "application/octet-stream";
  const { secureUrl, publicId } = await signAndUpload({
    target: "lesson-file",
    lessonId,
    file,
    resourceType: resourceTypeForMimeType(fileType),
  });
  return { secureUrl, publicId, fileName: file.name, fileType, fileSize: file.size };
}

export interface UploadLessonVideoOptions {
  lessonId: string;
  file: File;
  /** TASK-2203 — called with 0–100 as the upload progresses. */
  onProgress?: (percent: number) => void;
}

/**
 * TASK-2202 — signs + uploads a lesson's own video (the reserved
 * `.../lessons/{lessonId}/video/` folder, a `lesson-video`-targeted
 * signature) directly to Cloudinary as `resource_type: "video"`. Uses
 * `XMLHttpRequest` rather than `signAndUpload`'s `fetch` so upload
 * progress (TASK-2203) can be reported — `fetch` has no cross-browser
 * upload-progress event. The signing half is identical in spirit to
 * `signAndUpload`'s, just inlined here for the progress callback.
 */
export async function uploadLessonVideo({
  lessonId,
  file,
  onProgress,
}: UploadLessonVideoOptions): Promise<UploadImageResult> {
  const signRes = await fetch("/api/uploads/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ target: "lesson-video", lessonId }),
  });
  if (!signRes.ok) {
    throw new Error("sign-failed");
  }
  const { signature, timestamp, apiKey, cloudName, folder } = (await signRes.json()) as {
    signature: string;
    timestamp: number;
    apiKey: string;
    cloudName: string;
    folder: string;
  };

  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", apiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("signature", signature);
  formData.append("folder", folder);

  return new Promise<UploadImageResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onerror = () => reject(new Error("upload-failed"));
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error("upload-failed"));
        return;
      }
      const body = JSON.parse(xhr.responseText) as { secure_url: string; public_id: string };
      resolve({ secureUrl: body.secure_url, publicId: body.public_id });
    };
    xhr.send(formData);
  });
}
