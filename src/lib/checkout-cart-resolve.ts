import type { CheckoutPaymentMethod, Product, Variant } from "@prisma/client";
import {
  applyProportionalDiscountToLines,
  validateCouponForCart,
  type CartLineInput,
} from "@/lib/coupon-checkout";
import { prisma } from "@/lib/prisma";
import { quoteShippingFromProducts } from "@/lib/shipping-quote";
import { roundMoney, unitPriceForPaymentMethod } from "@/lib/product-pricing";

export type ProductWithVariants = Product & {
  variants: Variant[];
  categories: { id: string }[];
};

export type CheckoutLineInput = {
  productId: string;
  name?: string;
  quantity: number;
  variant?: string;
};

export type CheckoutShippingContext = {
  delivery: "shipping" | "pickup" | "digital";
  departamento: string;
  city: string;
};

export type ResolvedCheckout = {
  dbProducts: ProductWithVariants[];
  productById: Map<string, ProductWithVariants>;
  skipPhysicalDelivery: boolean;
  shippingCost: number;
  shippingPendingManualQuote: boolean;
  shippingZoneName: string | null;
  chargedItems: {
    productId: string;
    name: string;
    quantity: number;
    variant?: string;
    price: number;
  }[];
  newSubtotal: number;
  couponDiscountRecorded: number;
  couponCodeStored: string | null;
  orderItemsPayload: {
    itemType: "PRODUCT";
    productId: string;
    productName: string;
    price: number;
    quantity: number;
    variant?: string;
  }[];
};

export function mergeCheckoutShippingNotes(
  userNotes: string | undefined | null,
  zoneName: string | null,
  pendingManualQuote: boolean
): string {
  const parts: string[] = [];
  const base = (userNotes ?? "").trim();
  if (base) parts.push(base);
  if (zoneName) parts.push(`[Envío: ${zoneName}]`);
  if (pendingManualQuote) parts.push("[Envío: a cotizar con la tienda]");
  return parts.join("\n");
}

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

export async function resolveProductCheckout(
  params: {
    items: CheckoutLineInput[];
    shipping: CheckoutShippingContext;
    rawCouponCode: string | undefined | null;
    paymentMethod: CheckoutPaymentMethod;
  }
): Promise<
  | { ok: true; data: ResolvedCheckout }
  | { ok: false; status: number; error: string }
> {
  const { items, shipping, rawCouponCode, paymentMethod } = params;

  if (!items?.length) {
    return { ok: false, status: 400, error: "No hay productos en el carrito" };
  }

  const lineProductIds = [
    ...new Set(
      items
        .map((i) => i.productId)
        .filter((id): id is string => typeof id === "string" && id.length > 0)
    ),
  ];

  if (lineProductIds.length === 0) {
    return { ok: false, status: 400, error: "Productos inválidos" };
  }

  const dbProducts = await prisma.product.findMany({
    where: { id: { in: lineProductIds } },
    include: {
      variants: true,
      categories: { select: { id: true } },
    },
  });

  if (dbProducts.length !== lineProductIds.length) {
    return { ok: false, status: 400, error: "Producto no encontrado" };
  }

  const productById = new Map<string, ProductWithVariants>(
    dbProducts.map((p) => [p.id, p])
  );

  const allDigitalOrCourse = dbProducts.every(
    (p) => p.isOnlineCourse || p.isDigital
  );
  if (!allDigitalOrCourse && shipping.delivery === "digital") {
    return {
      ok: false,
      status: 400,
      error: "Hay productos físicos: elegí envío o retiro en local.",
    };
  }

  const deliveryForQuote: "shipping" | "pickup" =
    shipping.delivery === "shipping" ? "shipping" : "pickup";

  let quote: Awaited<ReturnType<typeof quoteShippingFromProducts>>;
  try {
    quote = await quoteShippingFromProducts({
      productIds: lineProductIds,
      delivery: deliveryForQuote,
      departamento: shipping.departamento || "Montevideo",
      city: shipping.city || "",
    });
  } catch {
    return { ok: false, status: 400, error: "Error al calcular envío" };
  }

  const skipPhysicalDelivery = quote.skipPhysicalDelivery;
  const shippingCost = skipPhysicalDelivery ? 0 : quote.cost;
  const shippingPendingManualQuote =
    !skipPhysicalDelivery &&
    shipping.delivery === "shipping" &&
    quote.pendingManualQuote;

  const resolvedItems: {
    productId: string;
    name: string;
    quantity: number;
    variant?: string;
    price: number;
  }[] = [];

  for (const item of items) {
    const p = productById.get(item.productId);
    if (!p) {
      return { ok: false, status: 400, error: "Producto no encontrado" };
    }
    const base = baseUnitFromProduct(p, item.variant);
    const unitCharged = unitPriceForPaymentMethod(base, paymentMethod);
    const qty = Math.max(1, Math.floor(Number(item.quantity) || 1));
    const minPurchase = Math.max(
      1,
      Math.floor(Number(p.minPurchaseQuantity)) || 1
    );
    if (qty < minPurchase) {
      return {
        ok: false,
        status: 400,
        error: `"${p.name}": la cantidad mínima de compra es ${minPurchase} unidades.`,
      };
    }
    resolvedItems.push({
      productId: item.productId,
      name: (item.name?.trim() || p.name).slice(0, 500),
      quantity: qty,
      variant: item.variant,
      price: unitCharged,
    });
  }

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
    paymentMethod,
    couponLines,
    productById
  );
  if (!couponCheck.ok) {
    return { ok: false, status: 400, error: couponCheck.error };
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

  return {
    ok: true,
    data: {
      dbProducts,
      productById,
      skipPhysicalDelivery,
      shippingCost,
      shippingPendingManualQuote,
      shippingZoneName: quote.zoneName,
      chargedItems,
      newSubtotal,
      couponDiscountRecorded,
      couponCodeStored,
      orderItemsPayload,
    },
  };
}
