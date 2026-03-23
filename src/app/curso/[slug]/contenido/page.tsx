import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userHasOnlineCourseAccess } from "@/lib/online-course-access";
import LearningPlayer from "./learning-player";
import { userCompletedOnlineCourse } from "@/lib/online-course-completion";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lesson?: string }>;
}

export default async function CursoContenidoPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { lesson: lessonParam } = await searchParams;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/curso/${slug}/contenido`)}`);
  }

  const course = await prisma.onlineCourse.findFirst({
    where: { slug, isPublished: true },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: {
          lessons: { orderBy: { order: "asc" } },
        },
      },
      resources: { orderBy: { order: "asc" } },
    },
  });

  if (!course) notFound();

  const ok = await userHasOnlineCourseAccess(session.user.id, course.id);
  if (!ok) notFound();

  const enrollment = await prisma.userCourse.findUnique({
    where: {
      userId_onlineCourseId: {
        userId: session.user.id,
        onlineCourseId: course.id,
      },
    },
  });

  const lessonIds = course.modules.flatMap((m) => m.lessons.map((l) => l.id));
  const progressRows = await prisma.userLessonProgress.findMany({
    where: {
      userId: session.user.id,
      lessonId: { in: lessonIds },
    },
  });
  const completedMap = Object.fromEntries(
    progressRows.filter((r) => r.completed).map((r) => [r.lessonId, true])
  );

  const flatLessons = course.modules.flatMap((m) =>
    m.lessons.map((l) => ({ ...l, moduleId: m.id, moduleTitle: m.title }))
  );

  let initialLessonId = lessonParam || enrollment?.lastLessonId || flatLessons[0]?.id;
  if (initialLessonId && !flatLessons.some((l) => l.id === initialLessonId)) {
    initialLessonId = flatLessons[0]?.id;
  }

  const certificateEligible = await userCompletedOnlineCourse(
    session.user.id,
    course.id
  );

  return (
    <LearningPlayer
      course={{
        id: course.id,
        title: course.title,
        slug: course.slug,
        modules: course.modules.map((m) => ({
          id: m.id,
          title: m.title,
          order: m.order,
          lessons: m.lessons.map((l) => ({
            id: l.id,
            title: l.title,
            videoUrl: l.videoUrl,
            content: l.content,
            order: l.order,
          })),
        })),
        resources: course.resources.map((r) => ({
          id: r.id,
          title: r.title,
          fileUrl: r.fileUrl,
        })),
      }}
      initialLessonId={initialLessonId ?? null}
      completedLessonIds={Object.keys(completedMap)}
      progressPercent={enrollment?.progress ?? 0}
      lastLessonId={enrollment?.lastLessonId ?? null}
      courseDbId={course.id}
      certificateEligible={certificateEligible}
    />
  );
}
