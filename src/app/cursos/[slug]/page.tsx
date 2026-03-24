import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import CourseDetail from "./course-detail";
import { toAbsoluteUrl } from "@/lib/site-url";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const course = await prisma.course.findUnique({
      where: { slug },
      select: {
        title: true,
        description: true,
        image: true,
        published: true,
      },
    });
    if (!course?.published) {
      return { title: "Curso" };
    }
    const description =
      course.description?.replace(/<[^>]*>/g, " ").trim().slice(0, 160) ||
      `${course.title} — Karamba`;
    const ogImage = course.image
      ? toAbsoluteUrl(course.image)
      : toAbsoluteUrl("/brand/icon.png");
    return {
      title: course.title,
      description,
      openGraph: {
        title: course.title,
        description,
        type: "website",
        images: [{ url: ogImage, alt: course.title }],
      },
      twitter: {
        card: "summary_large_image",
        title: course.title,
        description,
        images: [ogImage],
      },
    };
  } catch {
    return { title: "Curso" };
  }
}

export default function CourseDetailPage() {
  return <CourseDetail />;
}
