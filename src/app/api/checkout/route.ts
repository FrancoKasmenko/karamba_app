import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMercadoPagoClient, Preference } from "@/lib/mercadopago";
import { getBaseUrl, getWebhookUrl, isPublicUrl } from "@/lib/base-url";
import { fireAndForget, notifyOrderCreated } from "@/lib/email-events";
import {
  roundMoney,
  unitPriceForPaymentMethod,
} from "@/lib/product-pricing";
import type { Product, Variant } from "@prisma/client";
import {
  applyProportionalDiscountToLines,
  validateCouponForCart,
  type CartLineInput,
} from "@/lib/coupon-checkout";

type ProductWithVariants = Product & { variants: Variant[] };

function baseUnitFromProduct(
  product: ProductWithVariants,
  variantValue?: string | null
): number {
  if (variantValue) {
    const v = product.variants.find((x) => x.value === variantValue);
    if (v && v.price != null) return roundMoney(v.price);
  }
  return roundMoney(product.price);
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
      paymentMethod,
      paymentAccountId,
      couponCode: rawCouponCode,
    } = body;

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "No hay productos en el carrito" },
        { status: 400 }
      );
    }

    const method =
      paymentMethod === "BANK_TRANSFER" ? "BANK_TRANSFER" : "MERCADOPAGO";

    const cartItems = items as { productId?: string }[];
    const lineProductIds: string[] = [
      ...new Set(
        cartItems
          .map((i) => i.productId)
          .filter(
            (id): id is string => typeof id === "string" && id.length > 0
          )
      ),
    ];

    if (lineProductIds.length === 0) {
      return NextResponse.json(
        { error: "Productos inválidos" },
        { status: 400 }
      );
    }

    const dbProducts = await prisma.product.findMany({
      where: { id: { in: lineProductIds } },
      include: { variants: true },
    });

    if (dbProducts.length !== lineProductIds.length) {
      return NextResponse.json(
        { error: "Producto no encontrado" },
        { status: 400 }
      );
    }

    const productById = new Map(dbProducts.map((p) => [p.id, p]));

    const skipPhysicalDelivery = dbProducts.every(
      (p) => p.isOnlineCourse || p.isDigital
    );

    const requestedShipping = Math.max(0, Number(shipping?.shippingCost) || 0);
    const shippingCost = skipPhysicalDelivery ? 0 : requestedShipping;

    const payMethodEnum =
      method === "BANK_TRANSFER" ? "BANK_TRANSFER" : "MERCADOPAGO";

    const resolvedItems = (
      cartItems as {
        productId: string;
        name?: string;
        quantity: number;
        variant?: string;
      }[]
    ).map((item) => {
      const p = productById.get(item.productId);
      if (!p) {
        throw new Error("Producto no encontrado");
      }
      const base = baseUnitFromProduct(p, item.variant);
      const unitCharged = unitPriceForPaymentMethod(base, payMethodEnum);
      const qty = Math.max(1, Math.floor(Number(item.quantity) || 1));
      return {
        productId: item.productId,
        name: (item.name?.trim() || p.name).slice(0, 500),
        quantity: qty,
        variant: item.variant,
        price: unitCharged,
      };
    });

    const productSubtotal = roundMoney(
      resolvedItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
    );

    const couponLines: CartLineInput[] = resolvedItems.map((r) => ({
      productId: r.productId,
      quantity: r.quantity,
      variant: r.variant,
    }));

    const couponCheck = await validateCouponForCart(
      rawCouponCode,
      payMethodEnum,
      couponLines,
      productById
    );
    if (!couponCheck.ok) {
      return NextResponse.json({ error: couponCheck.error }, { status: 400 });
    }

    const chargedItems = applyProportionalDiscountToLines(
      resolvedItems,
      productSubtotal,
      couponCheck.discount
    );
    const newSubtotal = roundMoney(
      chargedItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
    );
    const couponDiscountRecorded = roundMoney(productSubtotal - newSubtotal);

    const orderItemsPayload = chargedItems.map((item) => ({
      itemType: "PRODUCT" as const,
      productId: item.productId,
      productName: item.name,
      price: item.price,
      quantity: item.quantity,
      variant: item.variant,
    }));

    const couponCodeStored = couponCheck.code ? couponCheck.code : null;

    let mercadoPagoClient: Awaited<
      ReturnType<typeof getMercadoPagoClient>
    > = null;
    if (method !== "BANK_TRANSFER") {
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

    if (method === "BANK_TRANSFER") {
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

      const finalTotal = newSubtotal + shippingCost;

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
          notes: (shipping.notes || "") + noteExtra,
          couponCode: couponCodeStored,
          couponDiscount: couponDiscountRecorded,
          items: {
            create: orderItemsPayload,
          },
        },
      });

      console.log(`[CHECKOUT TRANSFER] Orden ${order.id} | ${finalTotal}`);

      return NextResponse.json({
        orderId: order.id,
        flow: "transfer",
      });
    }

    const finalTotal = newSubtotal + shippingCost;

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
        notes: shipping.notes,
        couponCode: couponCodeStored,
        couponDiscount: couponDiscountRecorded,
        items: {
          create: orderItemsPayload,
        },
      },
    });

    console.log(`[CHECKOUT] Orden creada: ${order.id} | Total: $${finalTotal}`);

    fireAndForget(notifyOrderCreated(order.id));

    const preference = new Preference(mercadoPagoClient!);
    const baseUrl = getBaseUrl();

    const mpItems = chargedItems.map((item, idx: number) => ({
      id: `item-${idx}`,
      title: item.name,
      unit_price: Number(item.price),
      quantity: Number(item.quantity),
      currency_id: "UYU",
    }));

    if (shippingCost > 0) {
      mpItems.push({
        id: "shipping",
        title: "Costo de envío",
        unit_price: Number(shippingCost),
        quantity: 1,
        currency_id: "UYU",
      });
    }

    const preferenceBody = {
      items: mpItems,
      back_urls: {
        success: `${baseUrl}/checkout/success?orderId=${order.id}`,
        failure: `${baseUrl}/checkout?error=payment_failed`,
        pending: `${baseUrl}/checkout/success?orderId=${order.id}&pending=true`,
      },
      auto_return: "approved" as const,
      external_reference: order.id,
      payer: {
        email: shipping.email || session.user.email,
      },
      notification_url: undefined as string | undefined,
    };

    if (isPublicUrl()) {
      const webhookUrl = getWebhookUrl();
      preferenceBody.notification_url = webhookUrl;
      console.log(`[CHECKOUT] Webhook URL: ${webhookUrl}`);
    } else {
      console.log(
        "[CHECKOUT] URL local detectada, webhook omitido. Usá BASE_URL con ngrok para recibir webhooks."
      );
    }

    let result;
    try {
      result = await preference.create({ body: preferenceBody });
    } catch (mpErr) {
      console.error("[CHECKOUT] Mercado Pago API:", mpErr);
      await prisma.order
        .update({
          where: { id: order.id },
          data: { status: "CANCELLED" },
        })
        .catch(() => {});
      return NextResponse.json(
        {
          error:
            "Mercado Pago rechazó crear el pago (token inválido, moneda o datos). Revisá credenciales de producción en Admin → Pagos.",
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
