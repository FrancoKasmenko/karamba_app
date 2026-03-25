import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { slugify } from "@/lib/utils";
import { invalidateCategoryDescendantCache } from "@/lib/categories";

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function uniqueCategorySlug(name: string, excludeId: string) {
  const base = slugify(name);
  if (!base) return `categoria-${excludeId.slice(0, 8)}`;
  let slug = base;
  let n = 0;
  for (;;) {
    const clash = await prisma.category.findFirst({
      where: { slug, NOT: { id: excludeId } },
      select: { id: true },
    });
    if (!clash) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}

export async function PUT(req: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await context.params;
  try {
    const body = await req.json();
    const name =
      typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json(
        { error: "El nombre es obligatorio" },
        { status: 400 }
      );
    }

    const existing = await prisma.category.findUnique({
      where: { id },
      select: { parentId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    }

    const parentId =
      body.parentId === "" || body.parentId == null
        ? null
        : String(body.parentId);
    const isRoot = !parentId;
    const slug = await uniqueCategorySlug(name, id);

    const data: {
      name: string;
      slug: string;
      image: string | null;
      order: number;
      parentId: string | null;
      showInNavbar?: boolean;
    } = {
      name,
      slug,
      image: body.image != null ? String(body.image) : null,
      order:
        typeof body.order === "number" && !Number.isNaN(body.order)
          ? Math.floor(body.order)
          : 0,
      parentId,
    };
    if (body.showInNavbar !== undefined) {
      data.showInNavbar = Boolean(body.showInNavbar) && isRoot;
    } else if (parentId && existing.parentId === null) {
      data.showInNavbar = false;
    }
    const category = await prisma.category.update({
      where: { id },
      data,
    });
    invalidateCategoryDescendantCache();
    revalidatePath("/", "layout");
    return NextResponse.json(category);
  } catch (e) {
    console.error("[category PUT]", e);
    return NextResponse.json(
      { error: "Error al actualizar categor\u00eda" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await context.params;
  try {
    await prisma.category.delete({ where: { id } });
    invalidateCategoryDescendantCache();
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Error al eliminar categor\u00eda" },
      { status: 500 }
    );
  }
}
