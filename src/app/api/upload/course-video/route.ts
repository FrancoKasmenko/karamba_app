import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_BYTES = 300 * 1024 * 1024; // 300 MB
const REL_PREFIX = "/uploads/course-videos/";

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No se envió ningún archivo" },
        { status: 400 }
      );
    }

    const name = file.name || "";
    const ext = path.extname(name).toLowerCase();
    if (ext !== ".mp4") {
      return NextResponse.json(
        { error: "Solo se permiten archivos .mp4" },
        { status: 400 }
      );
    }

    const mime = (file.type || "").toLowerCase();
    if (mime && mime !== "video/mp4") {
      return NextResponse.json(
        { error: "Formato no válido. Usá MP4 (video/mp4)." },
        { status: 400 }
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        {
          error: `El archivo supera el máximo permitido (${Math.round(MAX_BYTES / (1024 * 1024))} MB)`,
        },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    if (bytes.byteLength > MAX_BYTES) {
      return NextResponse.json(
        { error: "El archivo supera el tamaño máximo" },
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
    await mkdir(uploadDir, { recursive: true });
    const filepath = path.join(uploadDir, filename);
    await writeFile(filepath, Buffer.from(bytes));

    return NextResponse.json({ url: `${REL_PREFIX}${filename}` });
  } catch (err) {
    console.error("Course video upload error:", err);
    return NextResponse.json(
      { error: "Error al subir el video" },
      { status: 500 }
    );
  }
}
