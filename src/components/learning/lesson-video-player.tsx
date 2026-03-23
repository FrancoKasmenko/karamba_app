"use client";

import VideoEmbedFrame from "@/components/learning/video-embed-frame";
import { resolveMediaPath } from "@/lib/image-url";
import { isLessonUploadVideoUrl } from "@/lib/online-course-api";

export default function LessonVideoPlayer({
  videoUrl,
}: {
  videoUrl: string | null;
}) {
  const u = videoUrl?.trim() || null;
  if (u && isLessonUploadVideoUrl(u)) {
    const src = resolveMediaPath(u);
    return (
      <div className="relative w-full max-w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-lg">
        <video
          src={src}
          controls
          playsInline
          preload="metadata"
          className="absolute inset-0 w-full h-full object-contain bg-black"
        >
          Tu navegador no reproduce video HTML5.
        </video>
      </div>
    );
  }

  return <VideoEmbedFrame videoUrl={u} />;
}
