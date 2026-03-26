import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { getMercadoPagoClient, Payment } from "@/lib/mercadopago";
import {
  syncCourseBookingFromOrder,
  syncOnlineCourseAccessFromOrder,
} from "@/lib/order-course-sync";
import { handleOrderStatusChangeEmails } from "@/lib/email-events";
import { recordCouponRedemptionIfNeeded } from "@/lib/coupon-checkout";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_req: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await context.params;

  try {
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }

    if (!order.paymentId) {
      return NextResponse.json(
        { error: "La orden no tiene un pago asociado" },
        { status: 400 }
      );
    }

    const mpClient = await getMercadoPagoClient();
    if (!mpClient) {
      return NextResponse.json(
        { error: "MercadoPago no configurado" },
        { status: 500 }
      );
    }

    const payment = new Payment(mpClient);
    const paymentData = await payment.get({ id: Number(order.paymentId) });

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
      where: { id },
      data: { status: newStatus },
    });

    if (updated.source === "COURSE") {
      await syncCourseBookingFromOrder(id, newStatus, order.paymentId);
    }
    await syncOnlineCourseAccessFromOrder(id, newStatus, order.paymentId);

    await handleOrderStatusChangeEmails(id, order.status, newStatus);

    await recordCouponRedemptionIfNeeded(id);

    console.log(`[SYNC PAYMENT] Orden ${id}: ${order.status} → ${newStatus} | MP status: ${paymentData.status}`);

    return NextResponse.json({
      orderId: id,
      previousStatus: order.status,
      newStatus: updated.status,
      mpStatus: paymentData.status,
      mpStatusDetail: paymentData.status_detail,
    });
  } catch (err) {
    console.error("[SYNC PAYMENT] Error:", err);
    return NextResponse.json(
      { error: "Error al sincronizar pago" },
      { status: 500 }
    );
  }
}
