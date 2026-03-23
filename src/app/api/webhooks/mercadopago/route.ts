import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMercadoPagoClient, Payment } from "@/lib/mercadopago";
import {
  syncCourseBookingFromOrder,
  syncOnlineCourseAccessFromOrder,
} from "@/lib/order-course-sync";
import { handleOrderStatusChangeEmails } from "@/lib/email-events";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    console.log("[WEBHOOK MP] Evento recibido:", JSON.stringify({
      type: body.type,
      action: body.action,
      dataId: body.data?.id,
    }));

    if (body.type !== "payment") {
      console.log(`[WEBHOOK MP] Tipo ignorado: ${body.type}`);
      return NextResponse.json({ ok: true });
    }

    const paymentId = body.data?.id;
    if (!paymentId) {
      console.log("[WEBHOOK MP] Sin payment ID, ignorando");
      return NextResponse.json({ ok: true });
    }

    const mpClient = await getMercadoPagoClient();
    if (!mpClient) {
      console.error("[WEBHOOK MP] MercadoPago no configurado");
      return NextResponse.json({ ok: true });
    }

    const payment = new Payment(mpClient);
    const paymentData = await payment.get({ id: paymentId });

    console.log("[WEBHOOK MP] Payment data:", JSON.stringify({
      id: paymentData.id,
      status: paymentData.status,
      status_detail: paymentData.status_detail,
      external_reference: paymentData.external_reference,
      transaction_amount: paymentData.transaction_amount,
    }));

    const orderId = paymentData.external_reference;
    if (!orderId) {
      console.log("[WEBHOOK MP] Sin external_reference, ignorando");
      return NextResponse.json({ ok: true });
    }

    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true },
    });

    if (!existingOrder) {
      console.error(`[WEBHOOK MP] Orden no encontrada: ${orderId}`);
      return NextResponse.json({ ok: true });
    }

    let newStatus: "PAID" | "CANCELLED" | "PENDING" = "PENDING";
    if (paymentData.status === "approved") {
      newStatus = "PAID";
    } else if (
      paymentData.status === "rejected" ||
      paymentData.status === "cancelled" ||
      paymentData.status === "refunded" ||
      paymentData.status === "charged_back"
    ) {
      newStatus = "CANCELLED";
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: newStatus,
        paymentId: String(paymentData.id),
        paymentProvider: "mercadopago",
      },
    });

    if (updated.source === "COURSE") {
      await syncCourseBookingFromOrder(
        orderId,
        newStatus,
        String(paymentData.id)
      );
    }
    await syncOnlineCourseAccessFromOrder(
      orderId,
      newStatus,
      String(paymentData.id)
    );

    await handleOrderStatusChangeEmails(
      orderId,
      existingOrder.status,
      newStatus
    );

    console.log(`[WEBHOOK MP] Orden ${orderId} actualizada: ${existingOrder.status} → ${newStatus} | Payment: ${paymentData.id}`);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[WEBHOOK MP] Error procesando webhook:", error);
    return NextResponse.json({ ok: true });
  }
}
