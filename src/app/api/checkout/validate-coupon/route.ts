import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Product, Variant } from "@prisma/client";
import {
  validateCouponForCart,
  type CartLineInput,
} from "@/lib/coupon-checkout";

type ProductWithVariants = Product & { variants: Variant[] };

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await req.json();
  const { items, paymentMethod, couponCode } = body as {
    items?: {
      productId: string;
      quantity: number;
      variant?: string;
    }[];
    paymentMethod?: string;
    couponCode?: string;
  };

  if (!items?.length) {
    return NextResponse.json({ error: "Carrito vacío" }, { status: 400 });
  }

  const method =
    paymentMethod === "BANK_TRANSFER" ? "BANK_TRANSFER" : "MERCADOPAGO";

  const lineProductIds = [
    ...new Set(
      items
        .map((i) => i.productId)
        .filter((id): id is string => typeof id === "string" && id.length > 0)
    ),
  ];

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

  const productById = new Map<string, ProductWithVariants>(
    dbProducts.map((p) => [p.id, p])
  );

  const couponLines: CartLineInput[] = items.map((item) => ({
    productId: item.productId,
    quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
    variant: item.variant,
  }));

  const result = await validateCouponForCart(
    couponCode,
    method,
    couponLines,
    productById
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    discount: result.discount,
    code: result.code,
  });
}
