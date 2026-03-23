import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const courses = await prisma.course.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      sessions: {
        include: { _count: { select: { bookings: { where: { status: { not: "CANCELLED" } } } } } },
      },
    },
  });

  return NextResponse.json(courses);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const { title, description, price, image, duration, published, courseType } = body;

  if (!title || price === undefined) {
    return NextResponse.json({ error: "Título y precio son obligatorios" }, { status: 400 });
  }

  let slug = slugify(title);
  const exists = await prisma.course.findUnique({ where: { slug } });
  if (exists) slug = `${slug}-${Date.now()}`;

  const course = await prisma.course.create({
    data: {
      title,
      slug,
      description: description || null,
      price: Number(price),
      image: image || null,
      duration: duration || null,
      courseType: courseType || "PRESENCIAL",
      published: published ?? false,
    },
  });

  return NextResponse.json(course);
}
