import { prisma } from "@/lib/prisma";

export async function userHasOnlineCourseAccess(
  userId: string,
  onlineCourseId: string
) {
  const n = await prisma.userCoursePurchase.count({
    where: { userId, onlineCourseId },
  });
  return n > 0;
}
