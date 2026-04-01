import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await ctx.params;
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) {
      return NextResponse.json({ error: "Nombre inválido" }, { status: 400 });
    }
    data.name = name;
  }
  if (body.price !== undefined) {
    const price = Number(body.price);
    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json({ error: "Precio inválido" }, { status: 400 });
    }
    data.price = price;
  }
  if (body.departmentNames !== undefined) {
    data.departmentNames = Array.isArray(body.departmentNames)
      ? body.departmentNames.map((x: unknown) => String(x).trim()).filter(Boolean)
      : [];
  }
  if (body.cityNames !== undefined) {
    data.cityNames = Array.isArray(body.cityNames)
      ? body.cityNames.map((x: unknown) => String(x).trim()).filter(Boolean)
      : [];
  }
  if (body.active !== undefined) data.active = Boolean(body.active);
  if (body.sortOrder !== undefined) {
    data.sortOrder = Math.floor(Number(body.sortOrder) || 0);
  }

  try {
    const row = await prisma.shippingZone.update({
      where: { id },
      data,
    });
    return NextResponse.json(row);
  } catch {
    return NextResponse.json({ error: "Zona no encontrada" }, { status: 404 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await ctx.params;
  try {
    await prisma.shippingZone.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Zona no encontrada" }, { status: 404 });
  }
}
