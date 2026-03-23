import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Indica si todos los productos del carrito son cursos online (sin envío físico).
 */
export async function GET(req: Request) {
  try {
    const idsParam = new URL(req.url).searchParams.get("ids") || "";
    const ids = [...new Set(idsParam.split(",").map((s) => s.trim()).filter(Boolean))];

    if (ids.length === 0) {
      return NextResponse.json({ onlineCourseOnly: false });
    }

    const products = await prisma.product.findMany({
      where: { id: { in: ids } },
      select: { id: true, isOnlineCourse: true },
    });

    if (products.length !== ids.length) {
      return NextResponse.json({ onlineCourseOnly: false });
    }

    const onlineCourseOnly = products.every((p) => p.isOnlineCourse === true);

    return NextResponse.json({ onlineCourseOnly });
  } catch {
    return NextResponse.json({ onlineCourseOnly: false });
  }
}
