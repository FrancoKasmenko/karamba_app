import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

interface RouteContext {
  params: Promise<{ sessionId: string }>;
}

export async function POST(req: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { sessionId } = await context.params;
  const body = await req.json();
  const email = String(body.email || "")
    .trim()
    .toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Email requerido" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json(
      { error: "No hay ninguna cuenta con ese email. La persona debe registrarse primero." },
      { status: 404 }
    );
  }

  const sessionRow = await prisma.courseSession.findUnique({
    where: { id: sessionId },
    include: { bookings: true },
  });

  if (!sessionRow) {
    return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
  }

  const activeCount = sessionRow.bookings.filter(
    (b) => b.status !== "CANCELLED"
  ).length;
  if (activeCount >= sessionRow.capacity) {
    return NextResponse.json(
      { error: "No hay cupos disponibles en esta sesión" },
      { status: 409 }
    );
  }

  const existing = await prisma.courseBooking.findUnique({
    where: {
      userId_courseSessionId: {
        userId: user.id,
        courseSessionId: sessionId,
      },
    },
  });

  if (existing) {
    if (existing.status === "PAID") {
      return NextResponse.json({ ok: true, already: true, bookingId: existing.id });
    }
    const updated = await prisma.courseBooking.update({
      where: { id: existing.id },
      data: { status: "PAID" },
    });
    return NextResponse.json({ ok: true, bookingId: updated.id });
  }

  const booking = await prisma.courseBooking.create({
    data: {
      userId: user.id,
      courseSessionId: sessionId,
      status: "PAID",
      orderId: null,
    },
  });

  return NextResponse.json({ ok: true, bookingId: booking.id });
}
