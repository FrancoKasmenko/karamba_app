export type VideoEmbedType = "youtube" | "vimeo";

export function parseVideoEmbed(url: string | null | undefined): {
  type: VideoEmbedType | null;
  id: string | null;
} {
  if (!url?.trim()) return { type: null, id: null };
  const u = url.trim().replace(/&amp;/gi, "&");

  const ytShort = u.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  const ytLong = u.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  const ytEmb = u.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (ytShort) return { type: "youtube", id: ytShort[1] };
  if (ytLong) return { type: "youtube", id: ytLong[1] };
  if (ytEmb) return { type: "youtube", id: ytEmb[1] };

  const vm = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return { type: "vimeo", id: vm[1] };

  return { type: null, id: null };
}

export function getVideoEmbedSrc(url: string | null | undefined): string | null {
  const { type, id } = parseVideoEmbed(url);
  if (!type || !id) return null;
  if (type === "youtube") {
    return `https://www.youtube-nocookie.com/embed/${id}?rel=0`;
  }
  return `https://player.vimeo.com/video/${id}`;
}
