import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { saveDigitalProductFile } from "@/lib/digital-product-upload";
import { readFormFileBuffer } from "@/lib/read-upload-file";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const formData = await req.formData();
    const raw = formData.get("file");

    const { buffer, name } = await readFormFileBuffer(raw);

    const saved = await saveDigitalProductFile(buffer, name);
    return NextResponse.json(saved);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al subir";
    if (msg.includes("vacío") || msg.includes("inválido") || msg.includes("requerido")) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
