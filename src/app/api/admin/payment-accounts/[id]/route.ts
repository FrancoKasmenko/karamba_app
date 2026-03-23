import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function PUT(req: Request, context: Ctx) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await context.params;
  try {
    const body = await req.json();
    const row = await prisma.paymentAccount.update({
      where: { id },
      data: {
        holderName:
          body.holderName !== undefined
            ? String(body.holderName).trim()
            : undefined,
        accountNumber:
          body.accountNumber !== undefined
            ? String(body.accountNumber).trim()
            : undefined,
        bankName:
          body.bankName !== undefined ? String(body.bankName).trim() : undefined,
        bankKey:
          body.bankKey !== undefined
            ? String(body.bankKey).trim() || "generic"
            : undefined,
        active: body.active !== undefined ? Boolean(body.active) : undefined,
        sortOrder:
          body.sortOrder !== undefined ? Number(body.sortOrder) : undefined,
      },
    });
    return NextResponse.json(row);
  } catch {
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, context: Ctx) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await context.params;
  try {
    await prisma.paymentAccount.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "No se puede eliminar (puede tener órdenes asociadas)" },
      { status: 400 }
    );
  }
}
