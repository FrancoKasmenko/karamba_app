import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { slugify } from "@/lib/utils";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await context.params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: { variants: true, category: true },
  });

  if (!product) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  return NextResponse.json(product);
}

export async function PUT(req: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await context.params;

  try {
    const body = await req.json();

    const existing = await prisma.product.findUnique({
      where: { id },
      select: { fileUrl: true, fileName: true, onlineCourseId: true },
    });

    if (existing?.onlineCourseId) {
      return NextResponse.json(
        {
          error:
            "Este producto pertenece a un curso online. Editá el curso en Admin → Cursos online.",
        },
        { status: 400 }
      );
    }

    await prisma.variant.deleteMany({ where: { productId: id } });

    const isDigital = Boolean(body.isDigital);

    const nextFileUrl =
      isDigital && (!body.fileUrl || body.fileUrl === "")
        ? existing?.fileUrl ?? null
        : isDigital
          ? body.fileUrl || null
          : null;
    const nextFileName =
      isDigital && (!body.fileName || body.fileName === "")
        ? existing?.fileName ?? null
        : isDigital
          ? body.fileName || null
          : null;

    const product = await prisma.product.update({
      where: { id },
      data: {
        name: body.name,
        slug: slugify(body.name),
        description: body.description,
        price: parseFloat(body.price),
        comparePrice: body.comparePrice ? parseFloat(body.comparePrice) : null,
        images: body.images || [],
        imageUrl: body.imageUrl?.trim() || null,
        featured: body.featured || false,
        active: body.active !== false,
        isDigital,
        fileUrl: nextFileUrl,
        fileName: nextFileName,
        categoryId: body.categoryId || null,
        variants: body.variants?.length
          ? {
              create: body.variants.map(
                (v: { name: string; value: string; price?: number; stock?: number }) => ({
                  name: v.name,
                  value: v.value,
                  price: v.price ? parseFloat(String(v.price)) : null,
                  stock: v.stock || 0,
                })
              ),
            }
          : undefined,
      },
      include: { variants: true },
    });

    return NextResponse.json(product);
  } catch (err) {
    console.error("Update product error:", err);
    return NextResponse.json(
      { error: "Error al actualizar producto" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await context.params;

  try {
    const linked = await prisma.product.findUnique({
      where: { id },
      select: { onlineCourseId: true },
    });
    if (linked?.onlineCourseId) {
      return NextResponse.json(
        {
          error:
            "Eliminá el curso desde Admin → Cursos online (se borra el producto automáticamente).",
        },
        { status: 400 }
      );
    }
    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Delete product error:", err);
    return NextResponse.json(
      { error: "Error al eliminar producto" },
      { status: 500 }
    );
  }
}
