import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { date, startTime, endTime, instructorName, capacity, meetingUrl } = body;

  if (!date || !startTime || !endTime) {
    return NextResponse.json({ error: "Fecha y horarios son obligatorios" }, { status: 400 });
  }

  const courseSession = await prisma.courseSession.create({
    data: {
      courseId: id,
      date: new Date(date),
      startTime,
      endTime,
      instructorName: instructorName || null,
      capacity: Number(capacity) || 10,
      meetingUrl: meetingUrl || null,
    },
  });

  return NextResponse.json(courseSession);
}
