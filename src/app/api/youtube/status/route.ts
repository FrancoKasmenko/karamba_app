import { NextResponse } from "next/server";

interface YouTubeStatus {
  isLive: boolean;
  liveVideoId: string | null;
  latestVideoId: string | null;
  latestVideoTitle: string | null;
  latestVideoThumbnail: string | null;
  channelUrl: string;
}

const CHANNEL_URL = "https://www.youtube.com/@SOMOS-KARAMBA";
const DEFAULT_HANDLE = "SOMOS-KARAMBA";
const CACHE_TTL = 180_000;

let cache: { data: YouTubeStatus; ts: number } | null = null;
/** UC resuelto desde el @handle (solo se guarda si hubo éxito) */
let resolvedChannelIdFromHandle: string | null = null;
let lastChannelResolveFailTs = 0;
const CHANNEL_FAIL_BACKOFF_MS = 120_000;

export const dynamic = "force-dynamic";

async function fetchJSON(url: string): Promise<unknown> {
  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

function parseChannelIdFromEnv(): string | null {
  const raw = process.env.YOUTUBE_CHANNEL_ID?.trim();
  if (!raw) return null;
  const uc = raw.match(/UC[\w-]{22}/)?.[0];
  return uc ?? null;
}

async function resolveChannelId(): Promise<string | null> {
  const fromEnv = parseChannelIdFromEnv();
  if (fromEnv) return fromEnv;
  if (resolvedChannelIdFromHandle) return resolvedChannelIdFromHandle;
  if (Date.now() - lastChannelResolveFailTs < CHANNEL_FAIL_BACKOFF_MS) {
    return null;
  }

  const handle = (
    process.env.YOUTUBE_CHANNEL_HANDLE?.trim() || DEFAULT_HANDLE
  ).replace(/^@/, "");

  try {
    const res = await fetch(`https://www.youtube.com/@${encodeURIComponent(handle)}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
      },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) {
      lastChannelResolveFailTs = Date.now();
      return null;
    }
    const html = await res.text();
    const m =
      html.match(/"channelId":"(UC[\w-]{22})"/) ||
      html.match(/"externalId":"(UC[\w-]{22})"/) ||
      html.match(/browseId":"(UC[\w-]{22})"/);
    const id = m?.[1] ?? null;
    if (id) {
      resolvedChannelIdFromHandle = id;
      return id;
    }
    lastChannelResolveFailTs = Date.now();
    return null;
  } catch {
    lastChannelResolveFailTs = Date.now();
    return null;
  }
}

async function fetchLatestFromRss(channelId: string): Promise<{
  videoId: string;
  title: string;
  thumbnail: string;
} | null> {
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(12_000),
    next: { revalidate: 120 },
  });
  if (!res.ok) return null;
  const xml = await res.text();
  const entry = xml.match(/<entry>([\s\S]*?)<\/entry>/)?.[1];
  if (!entry) return null;
  const videoId = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1];
  if (!videoId || videoId.length < 8) return null;
  const titleRaw =
    entry.match(/<media:title[^>]*>([^<]*)<\/media:title>/)?.[1]?.trim() ||
    entry.match(/<title>([^<]*)<\/title>/)?.[1]?.trim() ||
    "";
  const title = titleRaw
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  const thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  return { videoId, title, thumbnail };
}

/** Sin API key: detectar directo activo vía página embed oficial */
async function fetchLiveVideoIdViaEmbed(channelId: string): Promise<string | null> {
  try {
    const url = `https://www.youtube.com/embed/live_stream?channel=${encodeURIComponent(channelId)}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    if (
      /This live stream has ended|isn't available|unavailable|offline|no hay ninguna transmisión/i.test(
        html
      )
    ) {
      return null;
    }
    const m =
      html.match(/youtube\.com\/embed\/([\w-]{11})(?:\?|"|'|\s)/) ||
      html.match(/"videoId":"([\w-]{11})"/);
    const id = m?.[1] ?? null;
    if (!id || id === "live_stream") return null;
    return id;
  } catch {
    return null;
  }
}

function emptyStatus(): YouTubeStatus {
  return {
    isLive: false,
    liveVideoId: null,
    latestVideoId: null,
    latestVideoTitle: null,
    latestVideoThumbnail: null,
    channelUrl: CHANNEL_URL,
  };
}

export async function GET() {
  const apiKey = process.env.YOUTUBE_API_KEY?.trim();

  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  const channelId = await resolveChannelId();
  const base: YouTubeStatus = {
    ...emptyStatus(),
    channelUrl: CHANNEL_URL,
  };

  if (!channelId) {
    console.warn(
      "[YouTube] No se pudo resolver el channel ID (YOUTUBE_CHANNEL_ID o handle en página)"
    );
    return NextResponse.json(base);
  }

  let isLive = false;
  let liveVideoId: string | null = null;
  let latestVideoId: string | null = null;
  let latestVideoTitle: string | null = null;
  let latestVideoThumbnail: string | null = null;

  if (apiKey) {
    try {
      const channelData = (await fetchJSON(
        `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`
      )) as {
        items?: Array<{
          contentDetails?: { relatedPlaylists?: { uploads?: string } };
        }>;
      };

      const uploadsPlaylistId =
        channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

      if (uploadsPlaylistId) {
        const playlistData = (await fetchJSON(
          `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=1&key=${apiKey}`
        )) as {
          items?: Array<{
            snippet?: {
              title?: string;
              resourceId?: { videoId?: string };
              thumbnails?: {
                high?: { url?: string };
                medium?: { url?: string };
                default?: { url?: string };
              };
            };
          }>;
        };

        const latestItem = playlistData.items?.[0]?.snippet;
        latestVideoId = latestItem?.resourceId?.videoId ?? null;
        latestVideoTitle = latestItem?.title ?? null;
        latestVideoThumbnail =
          latestItem?.thumbnails?.high?.url ??
          latestItem?.thumbnails?.medium?.url ??
          latestItem?.thumbnails?.default?.url ??
          null;
      }

      const liveData = (await fetchJSON(
        `https://www.googleapis.com/youtube/v3/search?part=id&channelId=${channelId}&eventType=live&type=video&maxResults=1&key=${apiKey}`
      )) as { items?: Array<{ id?: { videoId?: string } }> };

      const firstLiveId = liveData.items?.[0]?.id?.videoId;
      isLive = Boolean(firstLiveId);
      liveVideoId = firstLiveId ?? null;
    } catch (err) {
      console.error("[YouTube] API:", err instanceof Error ? err.message : err);
    }
  }

  if (!latestVideoId) {
    const rss = await fetchLatestFromRss(channelId);
    if (rss) {
      latestVideoId = rss.videoId;
      latestVideoTitle = rss.title || latestVideoTitle;
      latestVideoThumbnail = rss.thumbnail;
    }
  }

  if (!apiKey && !isLive) {
    const embedLive = await fetchLiveVideoIdViaEmbed(channelId);
    if (embedLive) {
      isLive = true;
      liveVideoId = embedLive;
    }
  }

  const result: YouTubeStatus = {
    isLive,
    liveVideoId,
    latestVideoId,
    latestVideoTitle,
    latestVideoThumbnail,
    channelUrl: CHANNEL_URL,
  };

  console.log("[YouTube] Status:", {
    isLive,
    liveVideoId,
    latestVideoId,
    latestVideoTitle: latestVideoTitle?.slice(0, 60),
    source: apiKey ? "api+rss-fallback" : "rss+embed-live",
  });

  cache = { data: result, ts: Date.now() };
  return NextResponse.json(result);
}
