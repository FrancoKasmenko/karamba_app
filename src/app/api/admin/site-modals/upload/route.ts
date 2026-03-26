import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { api } from "@/lib/public-api";

export const runtime = "nodejs";

const ALLOWED = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"],
]);

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
    }

    const ext = ALLOWED.get(file.type);
    if (!ext) {
      return NextResponse.json(
        { error: "Formato no permitido (JPG, PNG, WebP o GIF)" },
        { status: 400 }
      );
    }

    const buf = Buffer.from(await file.arrayBuffer());
    if (buf.length > 8 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Archivo demasiado grande (máx. 8 MB)" },
        { status: 400 }
      );
    }

    const name = `${randomUUID()}${ext}`;
    const dir = path.join(process.cwd(), "public", "uploads", "site-modals");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, name), buf);

    const url = api(`/api/uploads/site-modals/${name}`);
    return NextResponse.json({ url });
  } catch (e) {
    console.error("[site-modal upload]", e);
    return NextResponse.json(
      { error: "Error al subir el archivo" },
      { status: 500 }
    );
  }
}
