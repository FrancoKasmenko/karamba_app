import { NextRequest, NextResponse } from "next/server";

const ALLOWED_HOSTS = [
  "instagram.fmvd4-1.fna.fbcdn.net",
  "instagram.fmvd2-2.fna.fbcdn.net",
  "instagram.fmvd2-1.fna.fbcdn.net",
  "instagram.fmvd4-2.fna.fbcdn.net",
  "scontent.cdninstagram.com",
  "scontent-eze1-1.cdninstagram.com",
];

function isAllowedUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return (
      host.endsWith(".fbcdn.net") ||
      host.endsWith(".cdninstagram.com") ||
      ALLOWED_HOSTS.includes(host)
    );
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");

  if (!url || !isAllowedUrl(url)) {
    return new NextResponse(null, { status: 400 });
  }

  try {
    const imgRes = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36",
        Accept: "image/webp,image/avif,image/*,*/*;q=0.8",
        Referer: "https://www.instagram.com/",
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!imgRes.ok) {
      return new NextResponse(null, { status: 502 });
    }

    const buffer = await imgRes.arrayBuffer();
    const contentType = imgRes.headers.get("content-type") || "image/jpeg";

    return new NextResponse(Buffer.from(buffer), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}
