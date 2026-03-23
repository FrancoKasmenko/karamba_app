import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const rows = await prisma.paymentAccount.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await req.json();
    const row = await prisma.paymentAccount.create({
      data: {
        holderName: String(body.holderName || "").trim(),
        accountNumber: String(body.accountNumber || "").trim(),
        bankName: String(body.bankName || "").trim(),
        bankKey: String(body.bankKey || "generic").trim() || "generic",
        active: body.active !== false,
        sortOrder: Number(body.sortOrder) || 0,
      },
    });
    return NextResponse.json(row);
  } catch {
    return NextResponse.json({ error: "Error al crear" }, { status: 500 });
  }
}
