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

/**
 * Client-side half of the signed-upload flow (docs/cloudinary/README.md):
 * ask our server for a signature scoped to an authorized folder, then
 * upload the file bytes directly to Cloudinary — never through our own
 * server. `CLOUDINARY_API_SECRET` is never present in this module.
 */
export async function uploadImage({ target, courseId, file }: UploadImageOptions): Promise<UploadImageResult> {
  const signRes = await fetch("/api/uploads/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ target, ...(courseId ? { courseId } : {}) }),
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

  const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData,
  });
  if (!uploadRes.ok) {
    throw new Error("upload-failed");
  }
  const body = (await uploadRes.json()) as { secure_url: string; public_id: string };
  return { secureUrl: body.secure_url, publicId: body.public_id };
}
