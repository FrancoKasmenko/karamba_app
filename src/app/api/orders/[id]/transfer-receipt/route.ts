import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveTransferReceipt, validateReceiptMime } from "@/lib/receipt-upload";
import { readFormFileBuffer } from "@/lib/read-upload-file";

export const runtime = "nodejs";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, context: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { id } = await context.params;

  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      checkoutPaymentMethod: true,
      transferReceiptUrl: true,
    },
  });

  if (!order || order.userId !== session.user.id) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  if (order.checkoutPaymentMethod !== "BANK_TRANSFER") {
    return NextResponse.json({ error: "Orden no es por transferencia" }, { status: 400 });
  }

  const formData = await req.formData();
  const raw = formData.get("file");

  let buf: Buffer;
  let mime: string;
  try {
    const parsed = await readFormFileBuffer(raw);
    buf = parsed.buffer;
    mime = (parsed.type || "").trim() || "application/octet-stream";
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Archivo inválido";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  if (!validateReceiptMime(mime)) {
    const b = buf;
    if (b.length >= 4 && b.slice(0, 4).toString() === "%PDF") {
      mime = "application/pdf";
    } else if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
      mime = "image/jpeg";
    } else if (
      b[0] === 0x89 &&
      b[1] === 0x50 &&
      b[2] === 0x4e &&
      b[3] === 0x47
    ) {
      mime = "image/png";
    } else if (b.slice(0, 3).toString("ascii") === "GIF") {
      mime = "image/gif";
    } else if (
      b.length >= 12 &&
      b.slice(0, 4).toString("ascii") === "RIFF" &&
      b.slice(8, 12).toString("ascii") === "WEBP"
    ) {
      mime = "image/webp";
    }
  }

  if (!validateReceiptMime(mime)) {
    return NextResponse.json(
      { error: "Formato no permitido (solo imagen o PDF)" },
      { status: 400 }
    );
  }

  const filepathGuess = `transfer-receipts/${order.id}-${Date.now()}`;

  console.log("UPLOAD DEBUG (comprobante):");
  console.log("Type:", mime);
  console.log("Buffer length:", buf.length);
  console.log("Path:", filepathGuess);

  try {
    const url = await saveTransferReceipt(order.id, buf, mime);
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        transferReceiptUrl: url,
        transferReceiptStatus: "PENDING",
        transferReceiptAt: new Date(),
      },
      select: {
        transferReceiptUrl: true,
        transferReceiptStatus: true,
        transferReceiptAt: true,
      },
    });
    return NextResponse.json({ ok: true, ...updated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al subir";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
