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

    const { buffer, type, name, size } = await readFormFileBuffer(raw);

    console.log("UPLOAD DEBUG (digital):");
    console.log("Type:", type || "(vacío)");
    console.log("Size:", size);
    console.log("Buffer length:", buffer.length);
    console.log("Name:", name);

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
