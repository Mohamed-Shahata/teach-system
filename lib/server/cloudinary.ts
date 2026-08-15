import "server-only";
import { createHash } from "node:crypto";

/**
 * Server-side signature generation for direct-to-Cloudinary uploads —
 * see docs/cloudinary/README.md ("Upload strategy: signed, server-
 * authorized uploads") and docs/decisions/0004-signed-uploads.md.
 * `CLOUDINARY_API_SECRET` never leaves this module.
 */

export interface CloudinarySignatureParams {
  folder: string;
  timestamp: number;
}

export interface CloudinarySignature {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
}

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

/**
 * Cloudinary signs uploads by taking every param that will be sent
 * (except `file`, `cloud_name`, `resource_type`, `api_key`, and
 * `signature` itself), sorting keys alphabetically, joining as
 * `key=value&key=value`, appending the API secret, and SHA-1 hashing the
 * result. Only `folder` and `timestamp` are signed here since those are
 * the only extra params the client sends alongside the file.
 */
export function signCloudinaryUpload({ folder, timestamp }: CloudinarySignatureParams): CloudinarySignature {
  const apiSecret = getEnv("CLOUDINARY_API_SECRET");
  const apiKey = getEnv("CLOUDINARY_API_KEY");
  const cloudName = getEnv("CLOUDINARY_CLOUD_NAME");

  const paramsToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
  const signature = createHash("sha1").update(paramsToSign).digest("hex");

  return { signature, timestamp, apiKey, cloudName, folder };
}

/** Cloudinary's own `resource_type` values, per the Admin `destroy` API. */
export type CloudinaryResourceType = "image" | "video" | "raw";

/**
 * Deletes an uploaded asset from Cloudinary via the Admin `destroy`
 * endpoint (docs/cloudinary/README.md "Deletion strategy") — used before
 * removing the corresponding Firestore document so a Cloudinary failure
 * never leaves an orphaned Firestore reference (docs/security/error-handling.md
 * "Cloudinary/Firestore compound operations").
 *
 * Cloudinary treats destroying an already-gone `publicId` as success
 * (`result: "not found"`), which this treats as success too — deletion is
 * idempotent from the caller's point of view.
 */
export async function destroyCloudinaryUpload(
  publicId: string,
  resourceType: CloudinaryResourceType,
): Promise<void> {
  const apiSecret = getEnv("CLOUDINARY_API_SECRET");
  const apiKey = getEnv("CLOUDINARY_API_KEY");
  const cloudName = getEnv("CLOUDINARY_CLOUD_NAME");

  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
  const signature = createHash("sha1").update(paramsToSign).digest("hex");

  const body = new URLSearchParams({
    public_id: publicId,
    timestamp: String(timestamp),
    api_key: apiKey,
    signature,
  });

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/destroy`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    throw new Error(`Cloudinary destroy failed: HTTP ${res.status}`);
  }

  const data = (await res.json()) as { result?: string };
  if (data.result !== "ok" && data.result !== "not found") {
    throw new Error(`Cloudinary destroy failed: result=${data.result ?? "unknown"}`);
  }
}

/** Maps a stored MIME type (`files.fileType`) to Cloudinary's `resource_type`. */
export function resourceTypeFromMimeType(mimeType: string): CloudinaryResourceType {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  return "raw";
}
