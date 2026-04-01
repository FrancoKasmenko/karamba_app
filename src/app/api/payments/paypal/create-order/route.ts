import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fireAndForget, notifyOrderCreated } from "@/lib/email-events";
import { roundMoney } from "@/lib/product-pricing";
import { completeCartForOrder } from "@/lib/analytics-cart-server";
import {
  mergeCheckoutShippingNotes,
  resolveProductCheckout,
  type CheckoutLineInput,
  type CheckoutShippingContext,
} from "@/lib/checkout-cart-resolve";
import {
  getPayPalAccessToken,
  getPayPalSettings,
  paypalCreateOrder,
} from "@/lib/paypal-server";

function bodyToShippingContext(shipping: {
  delivery?: string;
  departamento?: string;
  city?: string;
}): CheckoutShippingContext {
  const del = shipping?.delivery;
  if (del === "digital") {
    return { delivery: "digital", departamento: "—", city: "" };
  }
  if (del === "pickup") {
    return {
      delivery: "pickup",
      departamento: String(shipping?.departamento ?? "Montevideo"),
      city: String(shipping?.city ?? ""),
    };
  }
  return {
    delivery: "shipping",
    departamento: String(shipping?.departamento ?? "Montevideo"),
    city: String(shipping?.city ?? ""),
  };
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await req.json();
    const { items, shipping, couponCode: rawCouponCode, analyticsSessionId } =
      body;

    const sessionIdForCart =
      typeof analyticsSessionId === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        analyticsSessionId.trim()
      )
        ? analyticsSessionId.trim()
        : null;

    if (!items?.length) {
      return NextResponse.json(
        { error: "No hay productos en el carrito" },
        { status: 400 }
      );
    }

    const settings = await getPayPalSettings();
    if (!settings) {
      return NextResponse.json(
        { error: "PayPal no está habilitado o faltan credenciales." },
        { status: 503 }
      );
    }

    const shippingCtx = bodyToShippingContext(
      (shipping ?? {}) as {
        delivery?: string;
        departamento?: string;
        city?: string;
      }
    );

    const resolved = await resolveProductCheckout({
      items: items as CheckoutLineInput[],
      shipping: shippingCtx,
      rawCouponCode,
      paymentMethod: "PAYPAL",
    });

    if (!resolved.ok) {
      return NextResponse.json(
        { error: resolved.error },
        { status: resolved.status }
      );
    }

    const data = resolved.data;

    if (data.shippingPendingManualQuote) {
      return NextResponse.json(
        {
          error:
            "Para tu ubicación el envío se coordina con la tienda. Usá transferencia o Mercado Pago, o escribinos por WhatsApp.",
        },
        { status: 400 }
      );
    }

    const notesMerged = mergeCheckoutShippingNotes(
      shipping?.notes,
      data.shippingZoneName,
      data.shippingPendingManualQuote
    );

    const finalTotal = roundMoney(data.newSubtotal + data.shippingCost);

    const accessToken = await getPayPalAccessToken(
      settings.clientId,
      settings.secret,
      settings.env
    );
    if (!accessToken) {
      return NextResponse.json(
        { error: "No se pudo conectar con PayPal (credenciales o red)." },
        { status: 502 }
      );
    }

    const order = await prisma.order.create({
      data: {
        userId: session.user.id,
        total: finalTotal,
        currency: settings.currency,
        status: "PENDING",
        source: "PRODUCT",
        checkoutPaymentMethod: "PAYPAL",
        shippingName: shipping.name,
        shippingAddress: shipping.address,
        shippingCity: shipping.city,
        shippingPhone: shipping.phone,
        notes: notesMerged || null,
        couponCode: data.couponCodeStored,
        couponDiscount: data.couponDiscountRecorded,
        items: {
          create: data.orderItemsPayload,
        },
      },
    });

    const paypalLines = data.chargedItems.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.price,
    }));

    const pp = await paypalCreateOrder({
      accessToken,
      env: settings.env,
      currency: settings.currency,
      referenceId: order.id,
      lines: paypalLines,
      shippingAmount: data.shippingCost,
    });

    if ("error" in pp) {
      await prisma.order
        .update({
          where: { id: order.id },
          data: { status: "CANCELLED" },
        })
        .catch(() => {});
      console.error("[PayPal create-order] fallo API", pp.error);
      return NextResponse.json(
        { error: `PayPal: ${pp.error}` },
        { status: pp.status }
      );
    }

    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentId: pp.id,
        paymentProvider: "paypal",
        paypalOrderAmountValue: pp.chargedTotal,
        paypalOrderCurrency: pp.chargedCurrency,
      },
    });

    console.log(
      `[PayPal] Orden interna ${order.id} | PayPal order ${pp.id} | total tienda ${finalTotal} ${settings.currency} | PayPal ${pp.chargedTotal} ${pp.chargedCurrency}`
    );

    if (sessionIdForCart) {
      await completeCartForOrder({
        sessionId: sessionIdForCart,
        orderId: order.id,
        userId: session.user.id,
        total: finalTotal,
      }).catch(() => {});
    }

    fireAndForget(notifyOrderCreated(order.id));

    return NextResponse.json({
      orderId: order.id,
      paypalOrderId: pp.id,
    });
  } catch (e) {
    console.error("[PayPal create-order]", e);
    return NextResponse.json(
      { error: "Error al crear el pago con PayPal" },
      { status: 500 }
    );
  }
}
