import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMercadoPagoClient, Payment } from "@/lib/mercadopago";
import {
  syncCourseBookingFromOrder,
  syncOnlineCourseAccessFromOrder,
} from "@/lib/order-course-sync";
import { handleOrderStatusChangeEmails } from "@/lib/email-events";

/**
 * Confirma pago al volver de Mercado Pago (success URL con payment_id).
 * Necesario cuando el webhook no llega (localhost, fallos de red).
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await req.json();
    const orderId = body.orderId as string | undefined;
    const rawPaymentId = body.paymentId as string | number | undefined;

    if (!orderId || rawPaymentId === undefined || rawPaymentId === "") {
      return NextResponse.json(
        { error: "orderId y paymentId son obligatorios" },
        { status: 400 }
      );
    }

    const paymentIdStr = String(rawPaymentId).trim();
    const paymentIdNum = Number(paymentIdStr);
    if (!Number.isFinite(paymentIdNum)) {
      return NextResponse.json({ error: "paymentId inválido" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        userId: true,
        status: true,
        source: true,
        paymentId: true,
        checkoutPaymentMethod: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }

    if (order.checkoutPaymentMethod !== "MERCADOPAGO") {
      return NextResponse.json(
        { error: "Esta orden no fue creada con Mercado Pago" },
        { status: 400 }
      );
    }

    if (order.userId !== session.user.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const mpClient = await getMercadoPagoClient();
    if (!mpClient) {
      return NextResponse.json(
        { error: "MercadoPago no configurado" },
        { status: 503 }
      );
    }

    const payment = new Payment(mpClient);
    const paymentData = await payment.get({ id: paymentIdNum });

    const extRef = paymentData.external_reference
      ? String(paymentData.external_reference)
      : null;
    if (!extRef || extRef !== order.id) {
      return NextResponse.json(
        { error: "El pago no corresponde a esta orden" },
        { status: 400 }
      );
    }

    let newStatus: "PAID" | "CANCELLED" | "PENDING" | "PROCESSING" = "PENDING";
    if (paymentData.status === "approved") {
      newStatus = "PAID";
    } else if (
      paymentData.status === "rejected" ||
      paymentData.status === "cancelled" ||
      paymentData.status === "refunded" ||
      paymentData.status === "charged_back"
    ) {
      newStatus = "CANCELLED";
    } else if (
      paymentData.status === "pending" ||
      paymentData.status === "in_process" ||
      paymentData.status === "authorized"
    ) {
      newStatus = "PROCESSING";
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: newStatus,
        paymentId: paymentIdStr,
        paymentProvider: "mercadopago",
      },
    });

    if (updated.source === "COURSE") {
      await syncCourseBookingFromOrder(
        orderId,
        newStatus,
        paymentIdStr
      );
    }
    await syncOnlineCourseAccessFromOrder(
      orderId,
      newStatus,
      paymentIdStr
    );

    await handleOrderStatusChangeEmails(orderId, order.status, newStatus);

    return NextResponse.json({
      ok: true,
      orderId,
      status: updated.status,
      mpStatus: paymentData.status,
    });
  } catch (e) {
    console.error("[MP CONFIRM RETURN]", e);
    return NextResponse.json(
      { error: "No se pudo confirmar el pago" },
      { status: 500 }
    );
  }
}
