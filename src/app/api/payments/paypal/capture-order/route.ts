import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  syncCourseBookingFromOrder,
  syncOnlineCourseAccessFromOrder,
} from "@/lib/order-course-sync";
import { handleOrderStatusChangeEmails } from "@/lib/email-events";
import { roundMoney } from "@/lib/product-pricing";
import {
  amountsMatchOrderTotal,
  buildPayPalCurrencyContext,
  getPayPalAccessToken,
  getPayPalSettings,
  paypalCaptureOrder,
} from "@/lib/paypal-server";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await req.json();
    const orderId = body.orderId as string | undefined;
    const paypalOrderId = body.paypalOrderId as string | undefined;

    if (!orderId?.trim() || !paypalOrderId?.trim()) {
      return NextResponse.json(
        { error: "orderId y paypalOrderId son obligatorios" },
        { status: 400 }
      );
    }

    const settings = await getPayPalSettings();
    if (!settings) {
      return NextResponse.json(
        { error: "PayPal no está configurado" },
        { status: 503 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId.trim() },
      select: {
        id: true,
        userId: true,
        status: true,
        source: true,
        total: true,
        currency: true,
        paymentId: true,
        checkoutPaymentMethod: true,
        paypalOrderAmountValue: true,
        paypalOrderCurrency: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }

    if (order.userId !== session.user.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    if (order.checkoutPaymentMethod !== "PAYPAL") {
      return NextResponse.json(
        { error: "Esta orden no es de PayPal" },
        { status: 400 }
      );
    }

    if (order.status !== "PENDING") {
      return NextResponse.json(
        {
          error:
            order.status === "PAID"
              ? "Esta orden ya está pagada"
              : "Esta orden no puede capturarse en este estado",
        },
        { status: 400 }
      );
    }

    if (order.paymentId !== paypalOrderId.trim()) {
      console.warn(
        `[PayPal capture] mismatch paymentId esperado ${order.paymentId} recibido ${paypalOrderId}`
      );
      return NextResponse.json(
        { error: "El id de orden de PayPal no coincide con tu pedido" },
        { status: 400 }
      );
    }

    const accessToken = await getPayPalAccessToken(
      settings.clientId,
      settings.secret,
      settings.env
    );
    if (!accessToken) {
      return NextResponse.json(
        { error: "No se pudo conectar con PayPal" },
        { status: 502 }
      );
    }

    const cap = await paypalCaptureOrder({
      accessToken,
      env: settings.env,
      paypalOrderId: paypalOrderId.trim(),
    });

    if (!cap.ok) {
      console.error("[PayPal capture] error", cap.error, cap.raw);
      return NextResponse.json(
        { error: cap.error || "No se pudo capturar el pago" },
        { status: 502 }
      );
    }

    if (cap.status !== "COMPLETED") {
      console.warn("[PayPal capture] estado no completado", cap.status);
      return NextResponse.json(
        {
          error: `El pago no quedó aprobado (estado: ${cap.status || "desconocido"})`,
        },
        { status: 400 }
      );
    }

    const cur = (cap.currencyCode || "").toUpperCase();

    let expectedPayPalAmount: number;
    let expectedCur: string;
    let fxBridge: boolean;

    if (
      order.paypalOrderAmountValue != null &&
      order.paypalOrderCurrency != null &&
      order.paypalOrderCurrency.trim() !== ""
    ) {
      expectedPayPalAmount = roundMoney(order.paypalOrderAmountValue);
      expectedCur = order.paypalOrderCurrency.trim().toUpperCase();
      fxBridge = expectedCur !== order.currency.toUpperCase();
    } else {
      let resolution;
      try {
        resolution = await buildPayPalCurrencyContext(order.currency);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return NextResponse.json({ error: msg }, { status: 500 });
      }
      expectedPayPalAmount = resolution.convertAmount(order.total);
      expectedCur = resolution.paypalCurrencyCode.toUpperCase();
      fxBridge =
        resolution.paypalCurrencyCode.toUpperCase() !==
        order.currency.toUpperCase();
    }

    if (cur !== expectedCur) {
      console.error("[PayPal capture] moneda distinta", cur, expectedCur);
      return NextResponse.json(
        { error: "Moneda del pago no coincide con la orden en PayPal" },
        { status: 400 }
      );
    }

    const epsilon = fxBridge ? 0.06 : 0.02;
    if (!amountsMatchOrderTotal(cap.amountValue, expectedPayPalAmount, epsilon)) {
      console.error(
        "[PayPal capture] monto no coincide",
        cap.amountValue,
        expectedPayPalAmount,
        { fxBridge, orderTotal: order.total, orderCurrency: order.currency }
      );
      return NextResponse.json(
        { error: "El monto pagado no coincide con el pedido. Contactá a la tienda." },
        { status: 400 }
      );
    }

    const prevStatus = order.status;
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "PAID",
        paymentId: cap.captureId,
        paymentProvider: "paypal",
      },
    });

    console.log(
      `[PayPal capture] orden ${order.id} PAID | capture ${cap.captureId} | ${cap.amountValue} ${cur}`
    );

    if (updated.source === "COURSE") {
      await syncCourseBookingFromOrder(
        order.id,
        "PAID",
        cap.captureId
      );
    }
    await syncOnlineCourseAccessFromOrder(order.id, "PAID", cap.captureId);
    await handleOrderStatusChangeEmails(order.id, prevStatus, "PAID");

    return NextResponse.json({
      ok: true,
      orderId: order.id,
      status: updated.status,
    });
  } catch (e) {
    console.error("[PayPal capture-order]", e);
    return NextResponse.json(
      { error: "Error al confirmar el pago" },
      { status: 500 }
    );
  }
}
