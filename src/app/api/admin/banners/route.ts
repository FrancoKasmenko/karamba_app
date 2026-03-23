import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const banners = await prisma.banner.findMany({
    orderBy: { order: "asc" },
  });
  return NextResponse.json(banners);
}

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await req.json();
    const count = await prisma.banner.count();
    const banner = await prisma.banner.create({
      data: {
        title: body.title || null,
        subtitle: body.subtitle || null,
        buttonText: body.buttonText || null,
        buttonLink: body.buttonLink || null,
        image: body.image,
        order: body.order ?? count,
        active: body.active !== false,
      },
    });
    return NextResponse.json(banner);
  } catch (err) {
    console.error("Create banner error:", err);
    return NextResponse.json(
      { error: "Error al crear banner" },
      { status: 500 }
    );
  }
}
