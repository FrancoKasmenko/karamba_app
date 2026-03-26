import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { slugify } from "@/lib/utils";
import { validateDigitalFilesForSave } from "@/lib/product-digital-files";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const products = await prisma.product.findMany({
    where: { isOnlineCourse: false },
    include: { variants: true, category: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(products);
}

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await req.json();
    if (body.isOnlineCourse) {
      return NextResponse.json(
        {
          error:
            "Los cursos online se crean desde Admin → Cursos online (el producto se genera solo).",
        },
        { status: 400 }
      );
    }

    const isDigital = Boolean(body.isDigital);
    let digitalList: { fileUrl: string; fileName: string }[] = [];
    if (isDigital) {
      const files =
        Array.isArray(body.digitalFiles) && body.digitalFiles.length > 0
          ? body.digitalFiles
          : body.fileUrl
            ? [{ fileUrl: body.fileUrl, fileName: body.fileName || "archivo" }]
            : [];
      const v = validateDigitalFilesForSave(files);
      if (!v.ok) {
        return NextResponse.json({ error: v.error }, { status: 400 });
      }
      digitalList = v.value;
    }
    const slug = slugify(body.name);

    const product = await prisma.product.create({
      data: {
        name: body.name,
        slug,
        description: body.description,
        price: parseFloat(body.price),
        comparePrice: body.comparePrice ? parseFloat(body.comparePrice) : null,
        images: body.images || [],
        imageUrl: body.imageUrl?.trim() || null,
        featured: body.featured || false,
        active: body.active !== false,
        isDigital,
        digitalFiles: isDigital ? digitalList : Prisma.DbNull,
        fileUrl: isDigital ? digitalList[0]?.fileUrl ?? null : null,
        fileName: isDigital ? digitalList[0]?.fileName ?? null : null,
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
    console.error("Create product error:", err);
    return NextResponse.json(
      { error: "Error al crear producto" },
      { status: 500 }
    );
  }
}
