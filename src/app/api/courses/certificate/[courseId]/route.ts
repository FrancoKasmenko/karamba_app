import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userHasOnlineCourseAccess } from "@/lib/online-course-access";
import {
  certificateCompletionDate,
  userCompletedOnlineCourse,
} from "@/lib/online-course-completion";
import { buildCourseCertificatePdf } from "@/lib/course-certificate-pdf";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ courseId: string }>;
}

export async function GET(_req: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { courseId } = await context.params;

  const course = await prisma.onlineCourse.findUnique({
    where: { id: courseId },
    select: { id: true, title: true },
  });
  if (!course) {
    return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });
  }

  const access = await userHasOnlineCourseAccess(session.user.id, courseId);
  if (!access) {
    return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
  }

  const done = await userCompletedOnlineCourse(session.user.id, courseId);
  if (!done) {
    return NextResponse.json(
      { error: "Completá todas las clases para obtener el certificado" },
      { status: 403 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true },
  });

  const completedAt = await certificateCompletionDate(
    session.user.id,
    courseId
  );
  const displayName =
    (user?.name && user.name.trim()) || user?.email || "Participante";

  try {
    const pdfBytes = await buildCourseCertificatePdf({
      userDisplayName: displayName,
      courseTitle: course.title,
      completedAt,
    });

    const safeSlug = course.title
      .slice(0, 40)
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-");

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="certificado-karamba-${safeSlug || courseId.slice(-8)}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    console.error("[CERTIFICATE PDF]", e);
    return NextResponse.json(
      { error: "No se pudo generar el certificado" },
      { status: 500 }
    );
  }
}
