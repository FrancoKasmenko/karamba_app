import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * skipPhysicalDelivery: curso online y/o solo productos digitales (sin envío/retiro).
 * onlineCourseOnly: compatibilidad; true si todos son cursos online.
 */
export async function GET(req: Request) {
  try {
    const idsParam = new URL(req.url).searchParams.get("ids") || "";
    const ids = [...new Set(idsParam.split(",").map((s) => s.trim()).filter(Boolean))];

    if (ids.length === 0) {
      return NextResponse.json({
        onlineCourseOnly: false,
        skipPhysicalDelivery: false,
      });
    }

    const products = await prisma.product.findMany({
      where: { id: { in: ids } },
      select: { id: true, isOnlineCourse: true, isDigital: true },
    });

    if (products.length !== ids.length) {
      return NextResponse.json({
        onlineCourseOnly: false,
        skipPhysicalDelivery: false,
      });
    }

    const onlineCourseOnly = products.every((p) => p.isOnlineCourse === true);
    const skipPhysicalDelivery = products.every(
      (p) => p.isOnlineCourse === true || p.isDigital === true
    );

    return NextResponse.json({
      onlineCourseOnly,
      skipPhysicalDelivery,
    });
  } catch {
    return NextResponse.json({
      onlineCourseOnly: false,
      skipPhysicalDelivery: false,
    });
  }
}
