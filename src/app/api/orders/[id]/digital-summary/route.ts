import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { OrderStatus } from "@prisma/client";

const PAID: OrderStatus[] = ["PAID", "SHIPPED", "DELIVERED"];

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, context: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { id } = await context.params;

  const order = await prisma.order.findFirst({
    where: { id, userId: session.user.id },
    select: { status: true },
  });

  if (!order) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const canDownload = PAID.includes(order.status);

  const items = await prisma.orderItem.findMany({
    where: {
      orderId: id,
      itemType: "PRODUCT",
      productId: { not: null },
    },
    include: {
      product: {
        select: {
          id: true,
          isDigital: true,
          isOnlineCourse: true,
          fileName: true,
          slug: true,
        },
      },
    },
  });

  const digital = items
    .filter((i) => i.product?.isDigital)
    .map((i) => ({
      productId: i.product!.id,
      productName: i.productName,
      slug: i.product!.slug,
      fileName: i.product!.fileName,
      canDownload,
    }));

  const withProduct = items.filter((i) => i.productId && i.product);
  const onlineCourseOnly =
    withProduct.length > 0 &&
    withProduct.every((i) => i.product?.isOnlineCourse === true);

  return NextResponse.json({ digital, canDownload, onlineCourseOnly });
}
