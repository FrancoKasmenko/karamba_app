import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const accounts = await prisma.paymentAccount.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        holderName: true,
        accountNumber: true,
        bankName: true,
        bankKey: true,
      },
    });
    return NextResponse.json(accounts);
  } catch {
    return NextResponse.json([]);
  }
}
