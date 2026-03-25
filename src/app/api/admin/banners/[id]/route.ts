import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PUT(req: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await context.params;
  try {
    const body = await req.json();
    const data: {
      title: string | null;
      subtitle: string | null;
      buttonText: string | null;
      buttonLink: string | null;
      image: string;
      active: boolean;
      order?: number;
    } = {
      title: body.title ?? null,
      subtitle: body.subtitle ?? null,
      buttonText: body.buttonText ?? null,
      buttonLink: body.buttonLink ?? null,
      image: String(body.image || ""),
      active: body.active !== false,
    };
    if (typeof body.order === "number" && !Number.isNaN(body.order)) {
      data.order = Math.floor(body.order);
    }
    const banner = await prisma.banner.update({
      where: { id },
      data,
    });
    return NextResponse.json(banner);
  } catch {
    return NextResponse.json(
      { error: "Error al actualizar banner" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await context.params;
  try {
    await prisma.banner.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Error al eliminar banner" },
      { status: 500 }
    );
  }
}
