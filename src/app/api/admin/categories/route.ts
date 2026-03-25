import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { slugify } from "@/lib/utils";
import { invalidateCategoryDescendantCache } from "@/lib/categories";

async function uniqueCategorySlugCreate(name: string) {
  const base = slugify(name);
  if (!base) return `categoria-${Date.now()}`;
  let slug = base;
  let n = 0;
  for (;;) {
    const clash = await prisma.category.findFirst({
      where: { slug },
      select: { id: true },
    });
    if (!clash) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const categories = await prisma.category.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      order: true,
      parentId: true,
      showInNavbar: true,
      image: true,
    },
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(categories);
}

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

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
    const slug = await uniqueCategorySlugCreate(name);
    const category = await prisma.category.create({
      data: {
        name,
        slug,
        image: body.image || null,
        order: body.order || 0,
        parentId: body.parentId || null,
        showInNavbar: Boolean(body.showInNavbar) && !body.parentId,
      },
    });
    invalidateCategoryDescendantCache();
    revalidatePath("/", "layout");
    return NextResponse.json(category);
  } catch (err) {
    console.error("Create category error:", err);
    return NextResponse.json(
      { error: "Error al crear categoría" },
      { status: 500 }
    );
  }
}
