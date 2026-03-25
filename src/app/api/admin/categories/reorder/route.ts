import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { invalidateCategoryDescendantCache } from "@/lib/categories";

type ReorderItem = { id: string; order: number; parentId: string | null };

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await req.json();
    const items = body.items as ReorderItem[];
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Lista inválida" }, { status: 400 });
    }

    const ids = items.map((i) => i.id);
    if (new Set(ids).size !== ids.length) {
      return NextResponse.json({ error: "IDs duplicados" }, { status: 400 });
    }

    const existing = await prisma.category.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    if (existing.length !== ids.length) {
      return NextResponse.json({ error: "Categoría no encontrada" }, { status: 400 });
    }

    for (const i of items) {
      if (i.parentId && i.parentId === i.id) {
        return NextResponse.json({ error: "Padre inválido" }, { status: 400 });
      }
    }

    const parentIds = [
      ...new Set(items.map((i) => i.parentId).filter(Boolean) as string[]),
    ];
    if (parentIds.length > 0) {
      const parents = await prisma.category.findMany({
        where: { id: { in: parentIds } },
        select: { id: true },
      });
      if (parents.length !== parentIds.length) {
        return NextResponse.json({ error: "Padre no existe" }, { status: 400 });
      }
    }

    await prisma.$transaction(
      items.map((i) =>
        prisma.category.update({
          where: { id: i.id },
          data: {
            order: Math.max(0, Math.floor(i.order)),
            parentId: i.parentId,
            ...(i.parentId ? { showInNavbar: false } : {}),
          },
        })
      )
    );

    invalidateCategoryDescendantCache();
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[categories/reorder]", e);
    return NextResponse.json(
      { error: "Error al reordenar" },
      { status: 500 }
    );
  }
}
