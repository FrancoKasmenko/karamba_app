import { existsSync, statSync } from "fs";
import { open, readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".pdf": "application/pdf",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".zip": "application/zip",
  ".txt": "text/plain; charset=utf-8",
};

function contentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME[ext] || "application/octet-stream";
}

/** Necesario para que el navegador reproduzca MP4/WebM (seek, buffer). */
function parseRangeHeader(
  range: string | null,
  size: number
): { start: number; end: number } | null {
  if (!range || !range.startsWith("bytes=")) return null;
  const m = /^bytes=(\d*)-(\d*)$/i.exec(range.trim());
  if (!m) return null;
  let start = m[1] === "" ? NaN : parseInt(m[1], 10);
  let end = m[2] === "" ? NaN : parseInt(m[2], 10);
  if (Number.isNaN(start) && Number.isNaN(end)) return null;
  if (Number.isNaN(start)) {
    const suffix = Number.isFinite(end) ? end : 0;
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else if (Number.isNaN(end)) {
    end = size - 1;
  }
  if (start < 0 || start >= size || end < start) return null;
  end = Math.min(end, size - 1);
  return { start, end };
}

export async function GET(
  req: Request,
  context: { params: Promise<{ path?: string | string[] }> }
) {
  const params = await context.params;
  const rawPath = params.path;

  const raw = Array.isArray(rawPath)
    ? rawPath
    : rawPath != null && String(rawPath).length > 0
      ? [String(rawPath)]
      : [];

  const segments = raw
    .flatMap((s) => String(s).split(/[/\\]/))
    .map((s) => s.trim())
    .filter(Boolean);

  if (!segments.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  for (const seg of segments) {
    if (seg === "." || seg === ".." || seg.includes("..")) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }
  }

  const baseDir = path.resolve(process.cwd(), "public", "uploads");
  const filePath = path.resolve(baseDir, ...segments);

  if (!filePath.startsWith(baseDir + path.sep)) {
    return new Response("Forbidden", { status: 403 });
  }

  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const st = statSync(filePath);
  const size = st.size;
  const ext = path.extname(filePath).toLowerCase();
  const isVideo = ext === ".mp4" || ext === ".webm";
  const ctype = contentType(filePath);
  const range = req.headers.get("range");

  try {
    if (isVideo && range) {
      const parsed = parseRangeHeader(range, size);
      if (!parsed) {
        return new NextResponse(null, {
          status: 416,
          headers: {
            "Content-Range": `bytes */${size}`,
          },
        });
      }
      const { start, end } = parsed;
      const chunkSize = end - start + 1;
      const buf = Buffer.alloc(chunkSize);
      const fh = await open(filePath, "r");
      try {
        await fh.read(buf, 0, chunkSize, start);
      } finally {
        await fh.close();
      }
      return new NextResponse(buf, {
        status: 206,
        headers: {
          "Content-Type": ctype,
          "Content-Length": String(chunkSize),
          "Content-Range": `bytes ${start}-${end}/${size}`,
          "Accept-Ranges": "bytes",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    const buf = await readFile(filePath);
    const headers: Record<string, string> = {
      "Content-Type": ctype,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Length": String(size),
    };
    if (isVideo) {
      headers["Accept-Ranges"] = "bytes";
    }
    return new NextResponse(buf, {
      status: 200,
      headers,
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
