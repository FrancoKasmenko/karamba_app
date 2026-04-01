import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const rows = await prisma.shippingZone.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const name = String(body.name ?? "").trim();
  const price = Number(body.price);
  const departmentNames = Array.isArray(body.departmentNames)
    ? body.departmentNames.map((x: unknown) => String(x).trim()).filter(Boolean)
    : [];
  const cityNames = Array.isArray(body.cityNames)
    ? body.cityNames.map((x: unknown) => String(x).trim()).filter(Boolean)
    : [];
  const active = body.active !== false;
  const sortOrder = Math.floor(Number(body.sortOrder) || 0);

  if (!name) {
    return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
  }
  if (!Number.isFinite(price) || price < 0) {
    return NextResponse.json({ error: "Precio inválido" }, { status: 400 });
  }

  const row = await prisma.shippingZone.create({
    data: {
      name,
      price,
      departmentNames,
      cityNames,
      active,
      sortOrder,
    },
  });
  return NextResponse.json(row);
}
