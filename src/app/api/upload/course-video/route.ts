import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { readFormFileBuffer } from "@/lib/read-upload-file";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_BYTES = 300 * 1024 * 1024; // 300 MB
const REL_PREFIX = "/api/uploads/course-videos/";

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const formData = await req.formData();
    const raw = formData.get("file");

    let buffer: Buffer;
    let name: string;
    let size: number;
    let mime: string;
    try {
      const parsed = await readFormFileBuffer(raw);
      buffer = parsed.buffer;
      name = parsed.name;
      size = parsed.size;
      mime = (parsed.type || "").toLowerCase();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se envió ningún archivo";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const ext = path.extname(name).toLowerCase();
    if (ext !== ".mp4") {
      return NextResponse.json(
        { error: "Solo se permiten archivos .mp4" },
        { status: 400 }
      );
    }

    if (mime && mime !== "video/mp4") {
      return NextResponse.json(
        { error: "Formato no válido. Usá MP4 (video/mp4)." },
        { status: 400 }
      );
    }

    if (size > MAX_BYTES || buffer.length > MAX_BYTES) {
      return NextResponse.json(
        {
          error: `El archivo supera el máximo permitido (${Math.round(MAX_BYTES / (1024 * 1024))} MB)`,
        },
        { status: 400 }
      );
    }

    const filename = `${randomUUID()}.mp4`;
    const uploadDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      "course-videos"
    );
    mkdirSync(uploadDir, { recursive: true });
    const filepath = path.join(uploadDir, filename);

    console.log("UPLOAD DEBUG (course-video):");
    console.log("Type:", mime || "(vacío)");
    console.log("Size:", size);
    console.log("Buffer length:", buffer.length);
    console.log("Path:", filepath);

    writeFileSync(filepath, buffer);

    return NextResponse.json({ url: `${REL_PREFIX}${filename}` });
  } catch (err) {
    console.error("Course video upload error:", err);
    return NextResponse.json(
      { error: "Error al subir el video" },
      { status: 500 }
    );
  }
}
