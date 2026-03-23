import { prisma } from "@/lib/prisma";
import { userHasOnlineCourseAccess } from "@/lib/online-course-access";

export async function userCompletedOnlineCourse(
  userId: string,
  onlineCourseId: string
): Promise<boolean> {
  const ok = await userHasOnlineCourseAccess(userId, onlineCourseId);
  if (!ok) return false;

  const total = await prisma.courseLesson.count({
    where: { module: { courseId: onlineCourseId } },
  });
  if (total === 0) return false;

  const uc = await prisma.userCourse.findUnique({
    where: {
      userId_onlineCourseId: { userId, onlineCourseId },
    },
    select: { progress: true },
  });
  if ((uc?.progress ?? 0) >= 100) return true;

  const completed = await prisma.userLessonProgress.count({
    where: {
      userId,
      completed: true,
      lesson: { module: { courseId: onlineCourseId } },
    },
  });
  return completed >= total;
}

/** Fecha mostrada en el certificado: última clase marcada como completada. */
export async function certificateCompletionDate(
  userId: string,
  onlineCourseId: string
): Promise<Date> {
  const agg = await prisma.userLessonProgress.aggregate({
    where: {
      userId,
      completed: true,
      lesson: { module: { courseId: onlineCourseId } },
    },
    _max: { updatedAt: true },
  });
  return agg._max.updatedAt ?? new Date();
}
