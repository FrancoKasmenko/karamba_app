import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  describeMercadoPagoError,
  getMercadoPagoClient,
  Preference,
} from "@/lib/mercadopago";
import {
  getWebhookUrl,
  isPublicUrl,
  mercadoPagoAbsoluteUrl,
} from "@/lib/base-url";
import { fireAndForget, notifyOrderCreated } from "@/lib/email-events";
import { roundMoney } from "@/lib/product-pricing";
import { completeCartForOrder } from "@/lib/analytics-cart-server";
import {
  mergeCheckoutShippingNotes,
  resolveProductCheckout,
  type CheckoutLineInput,
  type CheckoutShippingContext,
} from "@/lib/checkout-cart-resolve";
import { parseBodyPaymentMethod } from "@/lib/checkout-payment-method";

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
    const {
      items,
      shipping,
      paymentMethod: rawPaymentMethod,
      paymentAccountId,
      couponCode: rawCouponCode,
      analyticsSessionId,
    } = body;

    const sessionIdForCart =
      typeof analyticsSessionId === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        analyticsSessionId.trim()
      )
        ? analyticsSessionId.trim()
        : null;

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "No hay productos en el carrito" },
        { status: 400 }
      );
    }

    const payMethodEnum = parseBodyPaymentMethod(rawPaymentMethod);
    if (!payMethodEnum) {
      return NextResponse.json(
        { error: "Método de pago no válido" },
        { status: 400 }
      );
    }

    if (payMethodEnum === "PAYPAL") {
      return NextResponse.json(
        {
          error:
            "Para pagar con PayPal usá el botón «Pagar con PayPal» en el checkout.",
        },
        { status: 400 }
      );
    }

    const lineInputs = items as CheckoutLineInput[];

    const shippingCtx = bodyToShippingContext(
      (shipping ?? {}) as {
        delivery?: string;
        departamento?: string;
        city?: string;
      }
    );

    const resolved = await resolveProductCheckout({
      items: lineInputs,
      shipping: shippingCtx,
      rawCouponCode,
      paymentMethod: payMethodEnum,
    });

    if (!resolved.ok) {
      return NextResponse.json(
        { error: resolved.error },
        { status: resolved.status }
      );
    }

    const data = resolved.data;
    const notesMerged = mergeCheckoutShippingNotes(
      shipping?.notes,
      data.shippingZoneName,
      data.shippingPendingManualQuote
    );

    let mercadoPagoClient: Awaited<
      ReturnType<typeof getMercadoPagoClient>
    > = null;
    if (payMethodEnum !== "BANK_TRANSFER") {
      mercadoPagoClient = await getMercadoPagoClient();
      if (!mercadoPagoClient) {
        return NextResponse.json(
          {
            error:
              "Mercado Pago no está disponible: falta el Access Token, no está activado en Admin → Pagos, o la configuración no se guardó. Revisá credenciales y volvé a guardar.",
          },
          { status: 503 }
        );
      }
    }

    if (payMethodEnum === "BANK_TRANSFER") {
      if (!paymentAccountId || typeof paymentAccountId !== "string") {
        return NextResponse.json(
          { error: "Seleccioná una cuenta para transferir" },
          { status: 400 }
        );
      }

      const acc = await prisma.paymentAccount.findFirst({
        where: { id: paymentAccountId, active: true },
      });

      if (!acc) {
        return NextResponse.json(
          { error: "Cuenta de pago no válida" },
          { status: 400 }
        );
      }

      const finalTotal = roundMoney(data.newSubtotal + data.shippingCost);

      const noteExtra = `\n[Pago: transferencia → ${acc.bankName} · ${acc.holderName} · ${acc.accountNumber}]`;
      const order = await prisma.order.create({
        data: {
          userId: session.user.id,
          total: finalTotal,
          status: "PENDING",
          source: "PRODUCT",
          checkoutPaymentMethod: "BANK_TRANSFER",
          transferAccountId: acc.id,
          paymentProvider: "transfer",
          transferReceiptStatus: "NONE",
          shippingName: shipping.name,
          shippingAddress: shipping.address,
          shippingCity: shipping.city,
          shippingPhone: shipping.phone,
          notes: (notesMerged + noteExtra).trim(),
          couponCode: data.couponCodeStored,
          couponDiscount: data.couponDiscountRecorded,
          items: {
            create: data.orderItemsPayload,
          },
        },
      });

      console.log(`[CHECKOUT TRANSFER] Orden ${order.id} | ${finalTotal}`);

      if (sessionIdForCart) {
        await completeCartForOrder({
          sessionId: sessionIdForCart,
          orderId: order.id,
          userId: session.user.id,
          total: finalTotal,
        }).catch(() => {});
      }

      return NextResponse.json({
        orderId: order.id,
        flow: "transfer",
      });
    }

    const finalTotal = roundMoney(data.newSubtotal + data.shippingCost);

    const order = await prisma.order.create({
      data: {
        userId: session.user.id,
        total: finalTotal,
        status: "PENDING",
        source: "PRODUCT",
        checkoutPaymentMethod: "MERCADOPAGO",
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

    console.log(`[CHECKOUT] Orden creada: ${order.id} | Total: $${finalTotal}`);

    if (sessionIdForCart) {
      await completeCartForOrder({
        sessionId: sessionIdForCart,
        orderId: order.id,
        userId: session.user.id,
        total: finalTotal,
      }).catch(() => {});
    }

    fireAndForget(notifyOrderCreated(order.id));

    const preference = new Preference(mercadoPagoClient!);

    const mpItems = data.chargedItems.map((item, idx: number) => ({
      id: `item-${idx}`,
      title: item.name,
      unit_price: Number(item.price),
      quantity: Number(item.quantity),
      currency_id: "UYU",
    }));

    if (data.shippingCost > 0) {
      mpItems.push({
        id: "shipping",
        title: "Costo de envío",
        unit_price: Number(data.shippingCost),
        quantity: 1,
        currency_id: "UYU",
      });
    }

    const back_urls = {
      success: mercadoPagoAbsoluteUrl(
        `/checkout/success?orderId=${encodeURIComponent(order.id)}`
      ),
      failure: mercadoPagoAbsoluteUrl("/checkout?error=payment_failed"),
      pending: mercadoPagoAbsoluteUrl(
        `/checkout/success?orderId=${encodeURIComponent(order.id)}&pending=true`
      ),
    };

    const preferenceBody: Record<string, unknown> = {
      items: mpItems,
      back_urls,
      auto_return: "approved",
      external_reference: order.id,
      payer: {
        email: shipping.email || session.user.email,
      },
    };

    if (isPublicUrl()) {
      const webhookUrl = getWebhookUrl();
      preferenceBody.notification_url = webhookUrl;
      console.log(`[CHECKOUT] Webhook URL: ${webhookUrl}`);
    } else {
      console.log(
        "[CHECKOUT] URL local detectada, webhook omitido. Usá BASE_URL con HTTPS (p. ej. ngrok) para recibir webhooks."
      );
    }

    let result;
    try {
      result = await preference.create({
        body: preferenceBody as Parameters<Preference["create"]>[0]["body"],
      });
    } catch (mpErr) {
      console.error("[CHECKOUT] Mercado Pago API:", mpErr);
      const detail = describeMercadoPagoError(mpErr);
      await prisma.order
        .update({
          where: { id: order.id },
          data: { status: "CANCELLED" },
        })
        .catch(() => {});
      const urlIssue = /back_url|auto_return|invalid_back|notification_url/i.test(
        detail
      );
      const hint = urlIssue
        ? "Mercado Pago exige URLs HTTPS públicas: definí BASE_URL o NEXT_PUBLIC_SITE_URL con https://karamba.com.uy (sin barra final). En local usá una URL HTTPS de ngrok."
        : "Si el error no es de URLs: en Admin → Pagos usá solo el Access token de producción (no la Public key en ese campo).";
      return NextResponse.json(
        {
          error: detail
            ? `Mercado Pago: ${detail} ${hint}`
            : `No se pudo crear el pago en Mercado Pago. ${hint}`,
        },
        { status: 502 }
      );
    }

    console.log(
      `[CHECKOUT] Preferencia MP creada: ${result.id} | Orden: ${order.id}`
    );

    return NextResponse.json({
      orderId: order.id,
      initPoint: result.init_point,
    });
  } catch (error) {
    console.error("[CHECKOUT] Error:", error);
    return NextResponse.json(
      { error: "Error al procesar el pedido" },
      { status: 500 }
    );
  }
}
