import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { saveDigitalProductFile } from "@/lib/digital-product-upload";

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const name = (file as File).name || "archivo";
    const saved = await saveDigitalProductFile(buf, name);
    return NextResponse.json(saved);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al subir";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
