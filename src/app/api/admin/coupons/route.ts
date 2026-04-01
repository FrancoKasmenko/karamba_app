import { NextResponse } from "next/server";
import { CouponDiscountType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { roundMoney } from "@/lib/product-pricing";

function optionalPositiveMoney(val: unknown): number | null {
  if (val === "" || val == null) return null;
  const n = Number(val);
  if (!Number.isFinite(n) || n <= 0) return null;
  return roundMoney(n);
}

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const coupons = await prisma.coupon.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(coupons);
}

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await req.json();
    const code = String(body.code || "").trim().toUpperCase();
    if (!code) {
      return NextResponse.json({ error: "Código requerido" }, { status: 400 });
    }

    const discountType: CouponDiscountType =
      body.discountType === "FIXED_AMOUNT"
        ? CouponDiscountType.FIXED_AMOUNT
        : CouponDiscountType.PERCENT;

    const categoryIds = Array.isArray(body.categoryIds)
      ? body.categoryIds.filter((x: unknown) => typeof x === "string")
      : [];

    const coupon = await prisma.coupon.create({
      data: {
        code,
        description: body.description?.trim() || null,
        active: body.active !== false,
        discountType,
        percentOff:
          discountType === "PERCENT"
            ? Math.min(100, Math.max(0, Number(body.percentOff) || 0))
            : null,
        amountOff:
          discountType === "FIXED_AMOUNT"
            ? Math.max(0, Number(body.amountOff) || 0)
            : null,
        validFrom: body.validFrom ? new Date(body.validFrom) : null,
        validUntil: body.validUntil ? new Date(body.validUntil) : null,
        maxRedemptions:
          body.maxRedemptions === "" || body.maxRedemptions == null
            ? null
            : Math.max(0, Math.floor(Number(body.maxRedemptions))),
        excludeOnSale: Boolean(body.excludeOnSale),
        transferOnly: Boolean(body.transferOnly),
        categoryIds,
        minPurchaseAmount: optionalPositiveMoney(body.minPurchaseAmount),
        maxDiscountAmount: optionalPositiveMoney(body.maxDiscountAmount),
      },
    });
    return NextResponse.json(coupon);
  } catch (e: unknown) {
    console.error(e);
    const msg =
      e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2002"
        ? "Ya existe un cupón con ese código"
        : "Error al crear cupón";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
