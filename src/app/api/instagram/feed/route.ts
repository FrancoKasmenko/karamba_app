import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  clearInstagramFeedCache,
  getInstagramFeedCache,
  setInstagramFeedCache,
} from "@/lib/instagram-feed-cache";
import {
  parseManualInstagramFeed,
  scrapePublicInstagramProfile,
  type InstagramFeedPayload,
  type InstagramFeedPost,
} from "@/lib/instagram-scrape";

export const runtime = "nodejs";

const DISPLAY_LIMIT = 5;
const SCRAPE_LIMIT = 15;

function slicePosts(posts: InstagramFeedPost[]): InstagramFeedPost[] {
  return posts.slice(0, DISPLAY_LIMIT);
}

async function buildPayload(): Promise<InstagramFeedPayload> {
  const settings = await prisma.siteSettings.findUnique({
    where: { id: "main" },
  });

  const manualRaw = (settings as { instagramFeedManual?: unknown } | null)
    ?.instagramFeedManual;
  const manual = parseManualInstagramFeed(manualRaw ?? null);
  if (manual.length > 0) {
    return {
      success: true,
      source: "manual",
      posts: slicePosts(manual),
    };
  }

  const cached = getInstagramFeedCache();
  if (cached) {
    return {
      ...cached,
      posts: slicePosts(cached.posts),
    };
  }

  try {
    const scraped = await scrapePublicInstagramProfile(SCRAPE_LIMIT);
    const payload: InstagramFeedPayload = {
      success: true,
      source: "scrape",
      posts: slicePosts(scraped),
    };
    setInstagramFeedCache({
      success: true,
      source: "scrape",
      posts: scraped,
    });
    return payload;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error desconocido";
    console.error("[Instagram feed]", message);
    const payload: InstagramFeedPayload = {
      success: false,
      source: "none",
      posts: [],
      error: message,
    };
    return payload;
  }
}

export async function GET() {
  const payload = await buildPayload();
  return NextResponse.json(payload);
}
