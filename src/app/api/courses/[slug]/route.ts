import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const course = await prisma.course.findUnique({
    where: { slug, published: true },
    include: {
      sessions: {
        where: { date: { gte: new Date() } },
        orderBy: { date: "asc" },
        include: { _count: { select: { bookings: { where: { status: { not: "CANCELLED" } } } } } },
      },
    },
  });

  if (!course) {
    return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });
  }

  return NextResponse.json(course);
}
