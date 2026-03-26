import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import {
  syncCourseBookingFromOrder,
  syncOnlineCourseAccessFromOrder,
} from "@/lib/order-course-sync";
import { handleOrderStatusChangeEmails } from "@/lib/email-events";
import { recordCouponRedemptionIfNeeded } from "@/lib/coupon-checkout";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await context.params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      transferAccount: true,
      items: {
        include: {
          product: {
            select: {
              images: true,
              imageUrl: true,
              slug: true,
              isDigital: true,
              fileName: true,
              fileUrl: true,
            },
          },
          courseSession: {
            include: { course: { select: { title: true, slug: true } } },
          },
        },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
  }

  return NextResponse.json(order);
}

export async function PUT(req: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await context.params;
  const body = await req.json();

  const existing = await prisma.order.findUnique({
    where: { id },
    select: { checkoutPaymentMethod: true, status: true },
  });

  const data: Record<string, unknown> = {};
  if (body.shippingAddress !== undefined) data.shippingAddress = body.shippingAddress;
  if (body.shippingCity !== undefined) data.shippingCity = body.shippingCity;
  if (body.shippingPhone !== undefined) data.shippingPhone = body.shippingPhone;
  if (body.shippingName !== undefined) data.shippingName = body.shippingName;
  if (body.notes !== undefined) data.notes = body.notes;
  if (body.transferReceiptStatus !== undefined) {
    data.transferReceiptStatus = body.transferReceiptStatus;
  }
  if (body.status !== undefined) {
    data.status = body.status;
  } else if (
    body.transferReceiptStatus === "VALIDATED" &&
    existing?.checkoutPaymentMethod === "BANK_TRANSFER"
  ) {
    data.status = "PAID";
  }

  try {
    const order = await prisma.order.update({
      where: { id },
      data,
      include: {
        user: { select: { name: true, email: true, phone: true } },
        transferAccount: true,
        items: {
          include: {
            product: {
            select: {
              images: true,
              imageUrl: true,
              slug: true,
              isDigital: true,
              fileName: true,
              fileUrl: true,
            },
          },
            courseSession: {
              include: { course: { select: { title: true, slug: true } } },
            },
          },
        },
      },
    });

    if (order.source === "COURSE") {
      await syncCourseBookingFromOrder(order.id, order.status, order.paymentId);
    }
    await syncOnlineCourseAccessFromOrder(
      order.id,
      order.status,
      order.paymentId
    );

    if (existing?.status != null) {
      await handleOrderStatusChangeEmails(
        order.id,
        existing.status,
        order.status
      );
    }

    await recordCouponRedemptionIfNeeded(order.id);

    return NextResponse.json(order);
  } catch {
    return NextResponse.json(
      { error: "Error al actualizar orden" },
      { status: 500 }
    );
  }
}
