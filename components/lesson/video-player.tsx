import { cloudinaryVideoStreamUrl, cloudinaryVideoUrl } from "@/lib/cloudinary/url";
import type { LessonVideoInput } from "@/lib/validation/lesson.schema";

export interface VideoPlayerProps {
  video: LessonVideoInput;
  title?: string;
  className?: string;
}

/**
 * Renders Cloudinary/YouTube/external video based on `video.provider`
 * (TASK-904) — the single switch point described in
 * `docs/cloudinary/README.md` "Video handling", so callers never branch
 * on provider themselves.
 */
export function VideoPlayer({ video, title, className }: VideoPlayerProps) {
  switch (video.provider) {
    case "youtube":
      return <YouTubePlayer url={video.url} title={title} className={className} />;
    case "cloudinary":
      return <CloudinaryPlayer video={video} title={title} className={className} />;
    case "external":
      return <ExternalPlayer url={video.url} title={title} className={className} />;
  }
}

function frameWrapperClassName(className?: string) {
  return `aspect-video w-full overflow-hidden rounded-lg bg-foreground/5 ${className ?? ""}`.trim();
}

function YouTubePlayer({ url, title, className }: { url: string; title?: string; className?: string }) {
  const embedUrl = toYouTubeEmbedUrl(url);
  if (!embedUrl) {
    return <ExternalPlayer url={url} title={title} className={className} />;
  }
  return (
    <div className={frameWrapperClassName(className)}>
      <iframe
        src={embedUrl}
        title={title}
        className="h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}

/**
 * Uses the `publicId` (when present) to build a Cloudinary adaptive
 * HLS source via `<source type="application/x-mpegURL">`, with the
 * plain `f_auto,q_auto` delivery URL as a fallback `<source>` for
 * browsers that need direct progressive playback (native HLS support is
 * Safari-only; other browsers fall through). Falls back to the stored
 * `video.url` outright if no `publicId` was recorded.
 */
function CloudinaryPlayer({
  video,
  title,
  className,
}: {
  video: LessonVideoInput;
  title?: string;
  className?: string;
}) {
  const sources = video.publicId
    ? [
        { src: cloudinaryVideoStreamUrl(video.publicId), type: "application/x-mpegURL" },
        { src: cloudinaryVideoUrl(video.publicId), type: "video/mp4" },
      ]
    : [{ src: video.url, type: "video/mp4" }];

  return (
    <div className={frameWrapperClassName(className)}>
      <video controls className="h-full w-full" aria-label={title}>
        {sources.map((source) => (
          <source key={source.src} src={source.src} type={source.type} />
        ))}
      </video>
    </div>
  );
}

function ExternalPlayer({ url, title, className }: { url: string; title?: string; className?: string }) {
  return (
    <div className={frameWrapperClassName(className)}>
      <video controls className="h-full w-full" src={url} aria-label={title}>
        <a href={url} target="_blank" rel="noreferrer">
          {title ?? url}
        </a>
      </video>
    </div>
  );
}

/**
 * Normalizes `watch?v=`, `youtu.be/`, and already-`embed/` YouTube URLs
 * to an embeddable `youtube.com/embed/{id}` URL. Returns `null` for a
 * URL that doesn't look like YouTube, so the caller can fall back to a
 * plain link instead of rendering a broken iframe.
 */
function toYouTubeEmbedUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\./, "");
  if (host === "youtu.be") {
    const id = parsed.pathname.slice(1);
    return id ? `https://www.youtube.com/embed/${id}` : null;
  }
  if (host === "youtube.com" || host === "m.youtube.com") {
    if (parsed.pathname === "/watch") {
      const id = parsed.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (parsed.pathname.startsWith("/embed/")) {
      return `https://www.youtube.com${parsed.pathname}`;
    }
    if (parsed.pathname.startsWith("/shorts/")) {
      const id = parsed.pathname.slice("/shorts/".length);
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
  }
  return null;
}
