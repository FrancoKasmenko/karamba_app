import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { OrderStatus } from "@prisma/client";

const PAID: OrderStatus[] = ["PAID", "SHIPPED", "DELIVERED"];

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const rows = await prisma.orderItem.findMany({
    where: {
      itemType: "PRODUCT",
      productId: { not: null },
      product: { isDigital: true },
      order: {
        userId: session.user.id,
        status: { in: PAID },
      },
    },
    select: {
      productId: true,
      productName: true,
      product: {
        select: {
          id: true,
          slug: true,
          fileName: true,
        },
      },
      order: { select: { id: true, createdAt: true } },
    },
    orderBy: { id: "desc" },
  });

  const seen = new Set<string>();
  const list: {
    productId: string;
    productName: string;
    slug: string;
    fileName: string | null;
    orderId: string;
    purchasedAt: string;
  }[] = [];

  for (const r of rows) {
    if (!r.productId || !r.product) continue;
    const key = r.productId;
    if (seen.has(key)) continue;
    seen.add(key);
    list.push({
      productId: r.productId,
      productName: r.productName,
      slug: r.product.slug,
      fileName: r.product.fileName,
      orderId: r.order.id,
      purchasedAt: r.order.createdAt.toISOString(),
    });
  }

  list.sort(
    (a, b) =>
      new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime()
  );

  return NextResponse.json(list);
}
