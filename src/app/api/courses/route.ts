import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const revalidate = 60;

export async function GET() {
  const courses = await prisma.course.findMany({
    where: { published: true },
    orderBy: { createdAt: "desc" },
    include: {
      sessions: {
        where: { date: { gte: new Date() } },
        orderBy: { date: "asc" },
        include: { _count: { select: { bookings: { where: { status: { not: "CANCELLED" } } } } } },
      },
    },
  });

  return NextResponse.json(courses);
}
