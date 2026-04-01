import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { slugify } from "@/lib/utils";
import {
  normalizeProductDigitalFiles,
  validateDigitalFilesForSave,
} from "@/lib/product-digital-files";
import { nextResponseForPrismaSchemaDrift } from "@/lib/prisma-schema-drift-response";
import { parseMinPurchaseQuantity } from "@/lib/min-purchase-quantity";
import { normalizeProductCategoryIds } from "@/lib/product-category-ids";

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function assertCategoryIdsExist(ids: string[]): Promise<boolean> {
  if (ids.length === 0) return true;
  const n = await prisma.category.count({ where: { id: { in: ids } } });
  return n === ids.length;
}

export async function GET(_req: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await context.params;
  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: { variants: true, categories: true },
    });

    if (!product) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (e) {
    const drift = nextResponseForPrismaSchemaDrift(e);
    if (drift) return drift;
    console.error("GET /api/admin/products/[id]:", e);
    return NextResponse.json(
      { error: "Error al cargar el producto" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await context.params;

  try {
    const body = await req.json();

    const categoryIds = normalizeProductCategoryIds(body);
    const categoriesOk = await assertCategoryIdsExist(categoryIds);
    if (!categoriesOk) {
      return NextResponse.json(
        { error: "Una o más categorías no existen" },
        { status: 400 }
      );
    }

    const existing = await prisma.product.findUnique({
      where: { id },
      select: {
        fileUrl: true,
        fileName: true,
        digitalFiles: true,
        onlineCourseId: true,
      },
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

    let nextDigital: { fileUrl: string; fileName: string }[] = [];
    if (isDigital) {
      if (Array.isArray(body.digitalFiles)) {
        const v = validateDigitalFilesForSave(body.digitalFiles);
        if (!v.ok) {
          return NextResponse.json({ error: v.error }, { status: 400 });
        }
        nextDigital = v.value;
      } else {
        nextDigital = normalizeProductDigitalFiles({
          digitalFiles: existing?.digitalFiles,
          fileUrl: existing?.fileUrl,
          fileName: existing?.fileName,
        });
        if (nextDigital.length === 0) {
          return NextResponse.json(
            { error: "Los productos digitales requieren al menos un archivo" },
            { status: 400 }
          );
        }
      }
    }

    const minPurchaseQuantity = parseMinPurchaseQuantity(body.minPurchaseQuantity);

    const product = await prisma.product.update({
      where: { id },
      data: {
        name: body.name,
        slug: slugify(body.name),
        description: body.description,
        price: parseFloat(body.price),
        comparePrice: body.comparePrice ? parseFloat(body.comparePrice) : null,
        minPurchaseQuantity,
        images: body.images || [],
        imageUrl: body.imageUrl?.trim() || null,
        featured: body.featured || false,
        active: body.active !== false,
        isDigital,
        digitalFiles: isDigital ? nextDigital : Prisma.DbNull,
        fileUrl: isDigital ? nextDigital[0]?.fileUrl ?? null : null,
        fileName: isDigital ? nextDigital[0]?.fileName ?? null : null,
        categories: {
          set: categoryIds.map((cid) => ({ id: cid })),
        },
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
      include: { variants: true, categories: true },
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
