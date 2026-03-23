import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  if (body.status) {
    const booking = await prisma.courseBooking.update({
      where: { id },
      data: { status: body.status },
    });
    return NextResponse.json(booking);
  }

  return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
}
