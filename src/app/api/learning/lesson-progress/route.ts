import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userHasOnlineCourseAccess } from "@/lib/online-course-access";
import { recalcOnlineCourseProgress } from "@/lib/online-course-progress";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const lessonId = body?.lessonId as string | undefined;
  const completed = Boolean(body?.completed);
  const lastViewed = Boolean(body?.lastViewed);

  if (!lessonId) {
    return NextResponse.json({ error: "lessonId requerido" }, { status: 400 });
  }

  const lesson = await prisma.courseLesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      module: { select: { courseId: true } },
    },
  });

  if (!lesson) {
    return NextResponse.json({ error: "Clase no encontrada" }, { status: 404 });
  }

  const courseId = lesson.module.courseId;
  const ok = await userHasOnlineCourseAccess(session.user.id, courseId);
  if (!ok) {
    return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
  }

  await prisma.userCourse.upsert({
    where: {
      userId_onlineCourseId: {
        userId: session.user.id,
        onlineCourseId: courseId,
      },
    },
    create: {
      userId: session.user.id,
      onlineCourseId: courseId,
      progress: 0,
    },
    update: {},
  });

  if (completed) {
    await prisma.userLessonProgress.upsert({
      where: {
        userId_lessonId: { userId: session.user.id, lessonId },
      },
      create: {
        userId: session.user.id,
        lessonId,
        completed: true,
      },
      update: { completed: true },
    });
  }

  if (lastViewed || completed) {
    await prisma.userCourse.updateMany({
      where: { userId: session.user.id, onlineCourseId: courseId },
      data: { lastLessonId: lessonId },
    });
  }

  const progress = await recalcOnlineCourseProgress(session.user.id, courseId);

  return NextResponse.json({ ok: true, progress });
}
