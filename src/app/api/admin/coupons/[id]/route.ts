import { NextResponse } from "next/server";
import { CouponDiscountType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PUT(req: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await context.params;
  const body = await req.json();

  const existing = await prisma.coupon.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const code = String(body.code ?? existing.code).trim().toUpperCase();
  if (!code) {
    return NextResponse.json({ error: "Código requerido" }, { status: 400 });
  }

  const discountType: CouponDiscountType =
    body.discountType === "FIXED_AMOUNT"
      ? CouponDiscountType.FIXED_AMOUNT
      : CouponDiscountType.PERCENT;

  const categoryIds = Array.isArray(body.categoryIds)
    ? body.categoryIds.filter((x: unknown) => typeof x === "string")
    : existing.categoryIds;

  try {
    const coupon = await prisma.coupon.update({
      where: { id },
      data: {
        code,
        description:
          body.description !== undefined
            ? String(body.description).trim() || null
            : existing.description,
        active:
          body.active !== undefined ? Boolean(body.active) : existing.active,
        discountType,
        percentOff:
          discountType === "PERCENT"
            ? Math.min(100, Math.max(0, Number(body.percentOff) || 0))
            : null,
        amountOff:
          discountType === "FIXED_AMOUNT"
            ? Math.max(0, Number(body.amountOff) || 0)
            : null,
        validFrom:
          body.validFrom !== undefined
            ? body.validFrom
              ? new Date(body.validFrom)
              : null
            : existing.validFrom,
        validUntil:
          body.validUntil !== undefined
            ? body.validUntil
              ? new Date(body.validUntil)
              : null
            : existing.validUntil,
        maxRedemptions:
          body.maxRedemptions !== undefined
            ? body.maxRedemptions === "" || body.maxRedemptions == null
              ? null
              : Math.max(0, Math.floor(Number(body.maxRedemptions)))
            : existing.maxRedemptions,
        excludeOnSale:
          body.excludeOnSale !== undefined
            ? Boolean(body.excludeOnSale)
            : existing.excludeOnSale,
        transferOnly:
          body.transferOnly !== undefined
            ? Boolean(body.transferOnly)
            : existing.transferOnly,
        categoryIds,
      },
    });
    return NextResponse.json(coupon);
  } catch (e: unknown) {
    console.error(e);
    const dup =
      e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2002";
    return NextResponse.json(
      { error: dup ? "Ya existe un cupón con ese código" : "Error al actualizar" },
      { status: 400 }
    );
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await context.params;
  await prisma.coupon.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
