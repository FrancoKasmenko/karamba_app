import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { readFormFileBuffer } from "@/lib/read-upload-file";
import { api } from "@/lib/public-api";

export const runtime = "nodejs";

const REL_DIR = "/api/uploads/products";

function extFromMime(type: string): string {
  const t = type.toLowerCase();
  if (t.includes("png")) return ".png";
  if (t.includes("webp")) return ".webp";
  if (t.includes("gif")) return ".gif";
  if (t.includes("jpeg") || t.includes("jpg")) return ".jpg";
  if (t.includes("svg")) return ".svg";
  if (t.includes("avif")) return ".avif";
  return ".png";
}

function looksLikeImageBuffer(buf: Buffer): boolean {
  if (buf.length < 12) return false;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  )
    return true;
  if (buf.slice(0, 3).toString("ascii") === "GIF") return true;
  if (
    buf.slice(0, 4).toString("ascii") === "RIFF" &&
    buf.slice(8, 12).toString("ascii") === "WEBP"
  )
    return true;
  return false;
}

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const formData = await req.formData();
    const files = formData.getAll("files");

    if (!files.length) {
      return NextResponse.json({ error: "No se enviaron archivos" }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads", "products");
    mkdirSync(uploadDir, { recursive: true });

    const urls: string[] = [];

    for (const entry of files) {
      const { buffer, type, name, size } = await readFormFileBuffer(entry);

      const mimeOk =
        type.startsWith("image/") ||
        (!type &&
          (looksLikeImageBuffer(buffer) ||
            /\.(jpe?g|png|gif|webp|svg|avif)$/i.test(name))) ||
        (type === "application/octet-stream" && looksLikeImageBuffer(buffer));

      if (!mimeOk) {
        return NextResponse.json(
          { error: "Solo se permiten archivos de imagen" },
          { status: 400 }
        );
      }

      const ext =
        path.extname(name) || (type ? extFromMime(type) : ".png") || ".png";
      const filename = `${randomUUID()}${ext}`;
      const filepath = path.join(uploadDir, filename);
      const publicUrl = api(`${REL_DIR}/${filename}`);

      console.log("UPLOAD DEBUG:");
      console.log("Type:", type || "(vacío)");
      console.log("Size:", size);
      console.log("Buffer length:", buffer.length);
      console.log("Path:", filepath);

      writeFileSync(filepath, buffer);

      urls.push(publicUrl);
    }

    return NextResponse.json({
      urls,
      ...(urls.length > 0 ? { url: urls[0] } : {}),
    });
  } catch (err) {
    console.error("Upload error:", err);
    const msg = err instanceof Error ? err.message : "Error al subir archivos";
    if (msg.includes("vacío") || msg.includes("inválido")) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    return NextResponse.json({ error: "Error al subir archivos" }, { status: 500 });
  }
}
