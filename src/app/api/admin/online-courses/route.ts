import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import {
  lessonVideoUrlFromPayload,
  parseLessonDurationMinutes,
  parseOnlineCourseLevel,
  parseTotalDurationMinutes,
  prismaOnlineCourseHttpError,
  resolveOnlineCourseSlug,
} from "@/lib/online-course-api";
import {
  courseImageForProduct,
  uniqueProductSlug,
} from "@/lib/online-course-product";

type LessonIn = {
  title: string;
  videoType?: string | null;
  videoUrl?: string | null;
  videoFile?: string | null;
  content?: string | null;
  order?: number;
  durationMinutes?: number | null;
};

function lessonVideoFields(l: LessonIn) {
  return { videoUrl: lessonVideoUrlFromPayload(l) };
}

type ModuleIn = {
  title: string;
  order?: number;
  lessons?: LessonIn[];
};

type ResourceIn = {
  title: string;
  fileUrl: string;
  order?: number;
};

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const list = await prisma.onlineCourse.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { modules: true, enrollments: true } },
      products: { select: { id: true, name: true, slug: true } },
    },
  });

  return NextResponse.json(list);
}

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await req.json();
    const title = String(body.title || "").trim();
    if (!title) {
      return NextResponse.json({ error: "Título obligatorio" }, { status: 400 });
    }

    const slug = resolveOnlineCourseSlug(body.slug, title);
    const level = parseOnlineCourseLevel(body.level);
    const modules = (body.modules || []) as ModuleIn[];
    const resources = ((body.resources || []) as ResourceIn[]).filter((r) =>
      String(r.fileUrl || "").trim()
    );

    const courseId = await prisma.$transaction(async (tx) => {
      const course = await tx.onlineCourse.create({
        data: {
          title,
          slug,
          description: String(body.description ?? "").trim() || null,
          image: String(body.image ?? "").trim() || null,
          price: parseFloat(String(body.price ?? 0)) || 0,
          level,
          isPublished: Boolean(body.isPublished),
          totalDurationMinutes: parseTotalDurationMinutes(
            body.totalDurationMinutes
          ),
          modules: {
            create: modules.map((m, mi) => ({
              title: String(m.title || `Módulo ${mi + 1}`),
              order: m.order ?? mi,
              lessons: {
                create: (m.lessons || []).map((l, li) => ({
                  title: String(l.title || `Clase ${li + 1}`),
                  ...lessonVideoFields(l),
                  content: l.content?.trim() || null,
                  order: l.order ?? li,
                  durationMinutes: parseLessonDurationMinutes(
                    l.durationMinutes
                  ),
                })),
              },
            })),
          },
          resources: {
            create: resources.map((r, ri) => ({
              title: String(r.title || `Recurso ${ri + 1}`),
              fileUrl: String(r.fileUrl || "").trim(),
              order: r.order ?? ri,
            })),
          },
        },
      });

      const { images, imageUrl } = courseImageForProduct(course.image);
      const prodSlug = await uniqueProductSlug(tx, course.slug);

      await tx.product.create({
        data: {
          name: course.title,
          slug: prodSlug,
          description: course.description,
          price: course.price,
          comparePrice: null,
          images,
          imageUrl,
          featured: false,
          active: course.isPublished,
          isDigital: false,
          fileUrl: null,
          fileName: null,
          isOnlineCourse: true,
          onlineCourseId: course.id,
        },
      });

      return course.id;
    });

    const course = await prisma.onlineCourse.findUnique({
      where: { id: courseId },
      include: {
        modules: { include: { lessons: true }, orderBy: { order: "asc" } },
        resources: { orderBy: { order: "asc" } },
        products: { select: { id: true, name: true, slug: true } },
      },
    });

    if (!course) {
      return NextResponse.json(
        { error: "Curso creado pero no se pudo recargar" },
        { status: 500 }
      );
    }

    return NextResponse.json(course);
  } catch (e) {
    console.error(e);
    const known = prismaOnlineCourseHttpError(e);
    return NextResponse.json(
      {
        error: known?.message ?? "Error al crear curso online",
        hint:
          process.env.NODE_ENV === "development"
            ? e instanceof Error
              ? e.message
              : String(e)
            : undefined,
      },
      { status: known?.status ?? 500 }
    );
  }
}
