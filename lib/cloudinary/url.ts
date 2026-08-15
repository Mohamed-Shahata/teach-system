/**
 * Cloudinary delivery URL helpers (docs/cloudinary/README.md "Image
 * optimization" / "Video handling"). Centralizes the transformation
 * strings so components never hardcode a Cloudinary URL — reused by
 * `VideoPlayer` (TASK-904) and available for the thumbnail `<img>`
 * usages once they're revisited.
 */

function getCloudName(): string {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloudName) {
    throw new Error("Missing required env var: NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME");
  }
  return cloudName;
}

/** Adaptive-bitrate HLS delivery URL for a Cloudinary-hosted video. */
export function cloudinaryVideoStreamUrl(publicId: string): string {
  return `https://res.cloudinary.com/${getCloudName()}/video/upload/sp_auto/${publicId}.m3u8`;
}

/** Plain (non-adaptive) `f_auto,q_auto` delivery URL, used as the `<video>` fallback source. */
export function cloudinaryVideoUrl(publicId: string): string {
  return `https://res.cloudinary.com/${getCloudName()}/video/upload/f_auto,q_auto/${publicId}`;
}

/** `f_auto,q_auto,w_auto,dpr_auto` responsive image delivery URL. */
export function cloudinaryImageUrl(publicId: string): string {
  return `https://res.cloudinary.com/${getCloudName()}/image/upload/f_auto,q_auto,w_auto,dpr_auto/${publicId}`;
}
