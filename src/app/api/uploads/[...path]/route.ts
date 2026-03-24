import { existsSync, statSync } from "fs";
import { readFile } from "fs/promises";
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

export async function GET(
  _req: Request,
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

  console.log("SEGMENTS:", segments);

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

  console.log("RESOLVED PATH:", filePath);

  /* Prefijo estricto baseDir + sep: evita confundir …/uploads con …/uploads2 */
  if (!filePath.startsWith(baseDir + path.sep)) {
    return new Response("Forbidden", { status: 403 });
  }

  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const buf = await readFile(filePath);
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": contentType(filePath),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
