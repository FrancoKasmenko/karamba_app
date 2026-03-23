import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, context: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { id } = await context.params;

  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      total: true,
      status: true,
      checkoutPaymentMethod: true,
      transferReceiptUrl: true,
      transferReceiptStatus: true,
      transferReceiptAt: true,
      userId: true,
      transferAccount: {
        select: {
          holderName: true,
          accountNumber: true,
          bankName: true,
          bankKey: true,
        },
      },
    },
  });

  if (!order || order.userId !== session.user.id) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  return NextResponse.json(order);
}
