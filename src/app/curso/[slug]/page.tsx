import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { userHasOnlineCourseAccess } from "@/lib/online-course-access";
import OnlineCoursePublic from "./online-course-public";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const course = await prisma.onlineCourse.findUnique({
    where: { slug },
    select: { title: true, description: true, isPublished: true },
  });
  if (!course?.isPublished) return { title: "Curso" };
  return {
    title: `${course.title} | Cursos online`,
    description: course.description?.slice(0, 160) || course.title,
  };
}

export default async function CursoOnlinePublicPage({ params }: Props) {
  const { slug } = await params;
  const course = await prisma.onlineCourse.findFirst({
    where: { slug, isPublished: true },
    include: {
      modules: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          title: true,
          order: true,
          lessons: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              title: true,
              order: true,
              durationMinutes: true,
            },
          },
        },
      },
      resources: {
        orderBy: { order: "asc" },
        select: { id: true, title: true, order: true },
      },
      products: {
        where: { active: true, isOnlineCourse: true },
        take: 1,
        select: {
          id: true,
          slug: true,
          name: true,
          price: true,
          imageUrl: true,
          images: true,
        },
      },
    },
  });

  if (!course) notFound();

  const session = await getServerSession(authOptions);
  let hasAccess = false;
  if (session?.user?.id) {
    hasAccess = await userHasOnlineCourseAccess(session.user.id, course.id);
  }

  return <OnlineCoursePublic course={course} hasAccess={hasAccess} />;
}
