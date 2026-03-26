import type { CheckoutPaymentMethod, Product, Variant } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { roundMoney, unitPriceForPaymentMethod } from "@/lib/product-pricing";
import type { OrderStatus } from "@prisma/client";

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

function isOnSaleProduct(
  product: ProductWithVariants,
  variantValue?: string | null
): boolean {
  const cp = product.comparePrice;
  if (cp == null) return false;
  const current = baseUnitFromProduct(product, variantValue);
  return roundMoney(cp) > current;
}

async function loadCategoryAncestorSets(): Promise<Map<string, Set<string>>> {
  const cats = await prisma.category.findMany({
    select: { id: true, parentId: true },
  });
  const parentOf = new Map<string, string | null>();
  for (const c of cats) parentOf.set(c.id, c.parentId);

  const chainFor = (id: string): Set<string> => {
    const set = new Set<string>();
    let cur: string | null = id;
    while (cur) {
      set.add(cur);
      cur = parentOf.get(cur) ?? null;
    }
    return set;
  };

  const map = new Map<string, Set<string>>();
  for (const c of cats) {
    map.set(c.id, chainFor(c.id));
  }
  return map;
}

function productMatchesCouponCategories(
  productCategoryId: string | null,
  allowedIds: string[],
  chainMap: Map<string, Set<string>>
): boolean {
  if (allowedIds.length === 0) return true;
  if (!productCategoryId) return false;
  const chain = chainMap.get(productCategoryId);
  if (!chain) return allowedIds.includes(productCategoryId);
  return allowedIds.some((aid) => chain.has(aid));
}

export type CartLineInput = {
  productId: string;
  quantity: number;
  variant?: string | null;
};

export async function validateCouponForCart(
  rawCode: string | undefined | null,
  paymentMethod: CheckoutPaymentMethod,
  lines: CartLineInput[],
  productById: Map<string, ProductWithVariants>
): Promise<
  | { ok: true; discount: number; code: string }
  | { ok: false; error: string }
> {
  const code = (rawCode || "").trim().toUpperCase();
  if (!code) return { ok: true, discount: 0, code: "" };

  const coupon = await prisma.coupon.findUnique({
    where: { code },
  });

  if (!coupon || !coupon.active) {
    return { ok: false, error: "Cupón inválido o inactivo" };
  }

  const now = new Date();
  if (coupon.validFrom && now < coupon.validFrom) {
    return { ok: false, error: "Este cupón aún no está vigente" };
  }
  if (coupon.validUntil && now > coupon.validUntil) {
    return { ok: false, error: "Este cupón expiró" };
  }
  if (
    coupon.maxRedemptions != null &&
    coupon.redemptionCount >= coupon.maxRedemptions
  ) {
    return { ok: false, error: "Este cupón ya no tiene usos disponibles" };
  }
  if (coupon.transferOnly && paymentMethod !== "BANK_TRANSFER") {
    return {
      ok: false,
      error: "Este cupón solo aplica pagando con transferencia bancaria",
    };
  }

  const chainMap = await loadCategoryAncestorSets();

  let eligible = 0;

  for (const line of lines) {
    const p = productById.get(line.productId);
    if (!p) return { ok: false, error: "Producto no encontrado" };
    const qty = Math.max(1, Math.floor(Number(line.quantity) || 1));
    if (coupon.excludeOnSale && isOnSaleProduct(p, line.variant)) {
      continue;
    }
    if (
      !productMatchesCouponCategories(
        p.categoryId,
        coupon.categoryIds,
        chainMap
      )
    ) {
      continue;
    }
    const base = baseUnitFromProduct(p, line.variant);
    const unit = unitPriceForPaymentMethod(base, paymentMethod);
    eligible += roundMoney(unit * qty);
  }

  eligible = roundMoney(eligible);
  if (eligible <= 0) {
    return {
      ok: false,
      error: "Ningún producto del carrito aplica a este cupón",
    };
  }

  let discount = 0;
  if (coupon.discountType === "PERCENT") {
    const pct = Math.min(100, Math.max(0, coupon.percentOff ?? 0));
    discount = roundMoney((eligible * pct) / 100);
  } else {
    const amt = Math.max(0, coupon.amountOff ?? 0);
    discount = roundMoney(Math.min(amt, eligible));
  }

  return { ok: true, discount, code: coupon.code };
}

function isOrderPaidLike(status: OrderStatus) {
  return status === "PAID" || status === "SHIPPED" || status === "DELIVERED";
}

/** Llamar cuando la orden pasa a un estado pagado (webhook MP o validación transferencia). */
export async function recordCouponRedemptionIfNeeded(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      couponCode: true,
      couponDiscount: true,
      couponRedemptionRecorded: true,
      status: true,
    },
  });
  if (
    !order?.couponCode ||
    order.couponDiscount <= 0 ||
    order.couponRedemptionRecorded ||
    !isOrderPaidLike(order.status)
  ) {
    return;
  }

  const coupon = await prisma.coupon.findUnique({
    where: { code: order.couponCode },
  });
  if (!coupon) return;

  await prisma.$transaction([
    prisma.coupon.update({
      where: { id: coupon.id },
      data: { redemptionCount: { increment: 1 } },
    }),
    prisma.order.update({
      where: { id: orderId },
      data: { couponRedemptionRecorded: true },
    }),
  ]);
}

export function applyProportionalDiscountToLines<
  T extends { price: number; quantity: number },
>(lines: T[], productSubtotal: number, discount: number): T[] {
  if (discount <= 0 || productSubtotal <= 0) return lines;
  const cap = Math.min(discount, productSubtotal);
  const ratio = roundMoney((productSubtotal - cap) / productSubtotal);
  return lines.map((item) => ({
    ...item,
    price: roundMoney(item.price * ratio),
  }));
}
