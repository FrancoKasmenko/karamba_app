import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isLessonUploadVideoUrl } from "@/lib/online-course-api";
import OnlineCourseForm from "../online-course-form";
import GrantOnlineAccessCard from "./grant-access-card";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditarCursoOnlinePage({ params }: Props) {
  const { id } = await params;
  const course = await prisma.onlineCourse.findUnique({
    where: { id },
    include: {
      modules: { include: { lessons: true }, orderBy: { order: "asc" } },
      resources: { orderBy: { order: "asc" } },
    },
  });

  if (!course) notFound();

  const initial = {
    id: course.id,
    title: course.title,
    slug: course.slug,
    description: course.description || "",
    image: course.image || "",
    price: String(course.price),
    level: course.level,
    isPublished: course.isPublished,
    totalDurationMinutes: course.totalDurationMinutes
      ? String(course.totalDurationMinutes)
      : "",
    modules: course.modules.map((m) => ({
      title: m.title,
      order: m.order,
      lessons: m.lessons.map((l) => {
        const vu = (l.videoUrl || "").trim();
        const upload = isLessonUploadVideoUrl(vu);
        return {
          title: l.title,
          videoType: upload ? ("UPLOAD" as const) : ("EXTERNAL" as const),
          videoUrl: upload ? "" : vu,
          videoFile: upload ? vu : "",
          content: l.content || "",
          order: l.order,
          durationMinutes:
            l.durationMinutes != null ? String(l.durationMinutes) : "",
        };
      }),
    })),
    resources: course.resources.map((r) => ({
      title: r.title,
      fileUrl: r.fileUrl,
      order: r.order,
    })),
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-gray-800 mb-6">
        Editar: {course.title}
      </h1>
      <OnlineCourseForm initial={initial} />
      <GrantOnlineAccessCard courseId={id} />
    </div>
  );
}
