import { prisma } from "@/lib/prisma";
import {
  fireAndForget,
  notifyCourseCompleted,
} from "@/lib/email-events";

export async function recalcOnlineCourseProgress(
  userId: string,
  onlineCourseId: string
) {
  const ucBefore = await prisma.userCourse.findUnique({
    where: {
      userId_onlineCourseId: { userId, onlineCourseId },
    },
    select: { progress: true },
  });

  const lessonIds = await prisma.courseLesson.findMany({
    where: { module: { courseId: onlineCourseId } },
    select: { id: true },
  });
  const total = lessonIds.length;
  const ids = lessonIds.map((l) => l.id);

  if (total === 0) {
    await prisma.userCourse.updateMany({
      where: { userId, onlineCourseId },
      data: { progress: 0 },
    });
    return 0;
  }

  const completed = await prisma.userLessonProgress.count({
    where: {
      userId,
      completed: true,
      lessonId: { in: ids },
    },
  });

  const progress = Math.round((completed / total) * 100);

  await prisma.userCourse.updateMany({
    where: { userId, onlineCourseId },
    data: { progress },
  });

  if (progress >= 100) {
    const wasComplete = (ucBefore?.progress ?? 0) >= 100;
    if (!wasComplete) {
      fireAndForget(notifyCourseCompleted(userId, onlineCourseId));
    }
  }

  return progress;
}
