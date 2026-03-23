import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { slugify } from "@/lib/utils";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PUT(req: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await context.params;
  try {
    const body = await req.json();
    const existing = await prisma.category.findUnique({
      where: { id },
      select: { parentId: true },
    });
    const parentId = body.parentId || null;
    const isRoot = !parentId;
    const data: {
      name: string;
      slug: string;
      image: string | null;
      order: number;
      parentId: string | null;
      showInNavbar?: boolean;
    } = {
      name: body.name,
      slug: slugify(body.name),
      image: body.image || null,
      order: body.order || 0,
      parentId,
    };
    if (body.showInNavbar !== undefined) {
      data.showInNavbar = Boolean(body.showInNavbar) && isRoot;
    } else if (parentId && existing && existing.parentId === null) {
      data.showInNavbar = false;
    }
    const category = await prisma.category.update({
      where: { id },
      data,
    });
    return NextResponse.json(category);
  } catch {
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
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Error al eliminar categor\u00eda" },
      { status: 500 }
    );
  }
}
