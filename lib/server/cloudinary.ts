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
