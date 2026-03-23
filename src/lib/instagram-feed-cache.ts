import type { InstagramFeedPayload } from "@/lib/instagram-scrape";

let cache: { payload: InstagramFeedPayload; expiresAt: number } | null = null;

function randomTtlMs(): number {
  const min = 10 * 60 * 1000;
  const max = 30 * 60 * 1000;
  return min + Math.floor(Math.random() * (max - min));
}

export function getInstagramFeedCache(): InstagramFeedPayload | null {
  if (!cache || Date.now() > cache.expiresAt) return null;
  return cache.payload;
}

export function setInstagramFeedCache(payload: InstagramFeedPayload): void {
  cache = {
    payload: { ...payload },
    expiresAt: Date.now() + randomTtlMs(),
  };
}

export function clearInstagramFeedCache(): void {
  cache = null;
}
