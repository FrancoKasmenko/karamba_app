import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveTransferReceipt } from "@/lib/receipt-upload";

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
  const file = formData.get("file");
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
  }

  const mime = file.type || "application/octet-stream";
  const buf = Buffer.from(await file.arrayBuffer());

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
