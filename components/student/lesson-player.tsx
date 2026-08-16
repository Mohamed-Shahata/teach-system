"use client";

import { useEffect, useRef } from "react";
import { VideoPlayer } from "@/components/lesson/video-player";
import type { LessonVideoInput } from "@/lib/validation/lesson.schema";

export interface LessonPlayerProps {
  lessonId: string;
  video: LessonVideoInput;
  title?: string;
  className?: string;
}

const REPORT_INTERVAL_MS = 10_000;

/**
 * TASK-2502 — wraps the provider-agnostic `VideoPlayer` for the
 * student-facing lesson view, adding throttled progress reporting to
 * `PATCH /api/lessons/{lessonId}/progress`: every `REPORT_INTERVAL_MS`
 * while playing, and once more on pause/unmount so a report isn't lost
 * to the throttle window when the student navigates away.
 *
 * Only wired up for the native `<video>` element (`provider ===
 * "cloudinary" | "external"`) — a `youtube` lesson renders through the
 * YouTube iframe, which needs the YouTube IFrame Player API (not just a
 * plain `<video>` ref) to read `currentTime`/`duration`; out of scope
 * for this task, left for a follow-up if watch-progress on YouTube
 * lessons is needed.
 */
export function LessonPlayer({ lessonId, video, title, className }: LessonPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastReportedAt = useRef(0);

  useEffect(() => {
    const videoEl = containerRef.current?.querySelector("video");
    if (!videoEl) return;

    const report = (currentTimeSeconds: number, durationSeconds: number) => {
      if (!Number.isFinite(currentTimeSeconds) || !Number.isFinite(durationSeconds)) return;
      fetch(`/api/lessons/${lessonId}/progress`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentTimeSeconds, durationSeconds }),
        keepalive: true,
      }).catch(() => {
        // Best-effort — a dropped progress report isn't worth surfacing
        // to the student; the next tick or pause event will retry.
      });
    };

    const handleTimeUpdate = () => {
      const now = Date.now();
      if (now - lastReportedAt.current < REPORT_INTERVAL_MS) return;
      lastReportedAt.current = now;
      report(videoEl.currentTime, videoEl.duration);
    };

    const handlePause = () => {
      lastReportedAt.current = Date.now();
      report(videoEl.currentTime, videoEl.duration);
    };

    videoEl.addEventListener("timeupdate", handleTimeUpdate);
    videoEl.addEventListener("pause", handlePause);
    return () => {
      videoEl.removeEventListener("timeupdate", handleTimeUpdate);
      videoEl.removeEventListener("pause", handlePause);
      if (!Number.isNaN(videoEl.currentTime) && videoEl.currentTime > 0) {
        report(videoEl.currentTime, videoEl.duration);
      }
    };
  }, [lessonId]);

  return (
    <div ref={containerRef}>
      <VideoPlayer video={video} title={title} className={className} />
    </div>
  );
}
