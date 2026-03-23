import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { slugify } from "@/lib/utils";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const categories = await prisma.category.findMany({
    include: { children: { orderBy: { order: "asc" } }, parent: true },
    orderBy: { order: "asc" },
  });
  return NextResponse.json(categories);
}

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await req.json();
    const category = await prisma.category.create({
      data: {
        name: body.name,
        slug: slugify(body.name),
        image: body.image || null,
        order: body.order || 0,
        parentId: body.parentId || null,
        showInNavbar: Boolean(body.showInNavbar) && !body.parentId,
      },
    });
    return NextResponse.json(category);
  } catch (err) {
    console.error("Create category error:", err);
    return NextResponse.json(
      { error: "Error al crear categoría" },
      { status: 500 }
    );
  }
}
