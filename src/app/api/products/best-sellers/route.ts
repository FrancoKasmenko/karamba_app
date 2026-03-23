import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const revalidate = 300;

export async function GET() {
  try {
    const topItems = await prisma.orderItem.groupBy({
      by: ["productId"],
      where: { itemType: "PRODUCT", productId: { not: null } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 12,
    });

    let products: {
      id: string;
      name: string;
      slug: string;
      price: number;
      comparePrice: number | null;
      images: string[];
      imageUrl: string | null;
      isDigital: boolean;
    }[] = [];

    if (topItems.length >= 4) {
      const ids = topItems
        .map((i) => i.productId)
        .filter((id): id is string => id != null);
      const raw = await prisma.product.findMany({
        where: { id: { in: ids }, active: true, isOnlineCourse: false },
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          comparePrice: true,
          images: true,
          imageUrl: true,
          isDigital: true,
        },
      });

      const idOrder = new Map(ids.map((id, idx) => [id, idx]));
      products = raw.sort(
        (a, b) => (idOrder.get(a.id) ?? 99) - (idOrder.get(b.id) ?? 99)
      );
    }

    if (products.length < 4) {
      products = await prisma.product.findMany({
        where: {
          active: true,
          isOnlineCourse: false,
          OR: [{ images: { isEmpty: false } }, { imageUrl: { not: null } }],
        },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          comparePrice: true,
          images: true,
          imageUrl: true,
          isDigital: true,
        },
      });
    }

    return NextResponse.json(products.slice(0, 8));
  } catch {
    return NextResponse.json([]);
  }
}
