"use client";

import { getVideoEmbedSrc } from "@/lib/video-embed";

export default function VideoEmbedFrame({ videoUrl }: { videoUrl: string | null }) {
  const src = getVideoEmbedSrc(videoUrl);
  if (!src) {
    return (
      <div className="aspect-video rounded-2xl bg-gray-900/90 flex items-center justify-center text-white/70 text-sm px-4 text-center">
        {videoUrl
          ? "Enlace de video no compatible. Usá YouTube o Vimeo."
          : "Esta clase no tiene video."}
      </div>
    );
  }
  return (
    <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-lg">
      <iframe
        title="Video del curso"
        src={src}
        className="absolute inset-0 w-full h-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  );
}
