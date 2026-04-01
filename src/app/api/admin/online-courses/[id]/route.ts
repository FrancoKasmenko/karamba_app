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

interface RouteContext {
  params: Promise<{ id: string }>;
}

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

export async function GET(_req: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await context.params;
  const course = await prisma.onlineCourse.findUnique({
    where: { id },
    include: {
      modules: { include: { lessons: true }, orderBy: { order: "asc" } },
      resources: { orderBy: { order: "asc" } },
      products: { select: { id: true, name: true, slug: true } },
    },
  });

  if (!course) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  return NextResponse.json(course);
}

export async function PUT(req: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await context.params;

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

    const desc = String(body.description ?? "").trim() || null;
    const imageStr = String(body.image ?? "").trim() || null;
    const coursePrice = parseFloat(String(body.price ?? 0)) || 0;
    const published = Boolean(body.isPublished);

    await prisma.$transaction(async (tx) => {
      await tx.courseModule.deleteMany({ where: { courseId: id } });
      await tx.courseResource.deleteMany({ where: { courseId: id } });

      await tx.onlineCourse.update({
        where: { id },
        data: {
          title,
          slug,
          description: desc,
          image: imageStr,
          price: coursePrice,
          level,
          isPublished: published,
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

      const { images, imageUrl } = courseImageForProduct(imageStr);
      const linked = await tx.product.findFirst({
        where: { onlineCourseId: id },
        select: { id: true },
      });
      const prodSlug = await uniqueProductSlug(tx, slug, linked?.id);

      const productPayload = {
        name: title,
        slug: prodSlug,
        description: desc,
        price: coursePrice,
        images,
        imageUrl,
        active: published,
        isOnlineCourse: true as const,
        onlineCourseId: id,
      };

      if (linked) {
        await tx.product.update({
          where: { id: linked.id },
          data: productPayload,
        });
      } else {
        await tx.product.create({
          data: {
            ...productPayload,
            comparePrice: null,
            featured: false,
            isDigital: false,
            fileUrl: null,
            fileName: null,
          },
        });
      }
    });

    const course = await prisma.onlineCourse.findUnique({
      where: { id },
      include: {
        modules: { include: { lessons: true }, orderBy: { order: "asc" } },
        resources: { orderBy: { order: "asc" } },
        products: { select: { id: true, name: true, slug: true } },
      },
    });

    return NextResponse.json(course);
  } catch (e) {
    console.error(e);
    const known = prismaOnlineCourseHttpError(e);
    return NextResponse.json(
      {
        error: known?.message ?? "Error al actualizar curso",
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

export async function DELETE(_req: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await context.params;

  try {
    await prisma.product.deleteMany({ where: { onlineCourseId: id } });
    await prisma.onlineCourse.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Error al eliminar" },
      { status: 500 }
    );
  }
}
