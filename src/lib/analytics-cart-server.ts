import { prisma } from "@/lib/prisma";

const DEFAULT_ABANDON_MINUTES = 45;

export function cartAbandonAfterMinutes(): number {
  const n = Number(process.env.ANALYTICS_CART_ABANDON_AFTER_MINUTES);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_ABANDON_MINUTES;
}

export async function markStaleCartsAbandoned(): Promise<void> {
  const minutes = cartAbandonAfterMinutes();
  const cutoff = new Date(Date.now() - minutes * 60 * 1000);
  await prisma.cart.updateMany({
    where: { status: "ACTIVE", lastActivityAt: { lt: cutoff } },
    data: { status: "ABANDONED", abandonedAt: new Date() },
  });
}

export async function upsertActiveCartFromTotal(params: {
  sessionId: string;
  userId: string | null;
  total: number;
}): Promise<void> {
  const { sessionId, userId, total } = params;
  const now = new Date();
  const safeTotal = Number.isFinite(total) && total >= 0 ? total : 0;

  const existing = await prisma.cart.findFirst({
    where: { sessionId, status: "ACTIVE" },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });

  if (existing) {
    await prisma.cart.update({
      where: { id: existing.id },
      data: {
        total: safeTotal,
        lastActivityAt: now,
        ...(userId ? { userId } : {}),
      },
    });
    return;
  }

  await prisma.cart.create({
    data: {
      sessionId,
      userId,
      status: "ACTIVE",
      total: safeTotal,
      lastActivityAt: now,
    },
  });
}

export async function completeCartForOrder(params: {
  sessionId: string;
  orderId: string;
  userId: string;
  total: number;
}): Promise<void> {
  const { sessionId, orderId, userId, total } = params;
  const now = new Date();
  const safeTotal = Number.isFinite(total) && total >= 0 ? total : 0;

  await prisma.cart.updateMany({
    where: { sessionId, status: "ACTIVE" },
    data: {
      status: "COMPLETED",
      orderId,
      userId,
      total: safeTotal,
      completedAt: now,
      lastActivityAt: now,
    },
  });
}

export async function completeCartOnPurchaseEvent(params: {
  sessionId: string;
  userId: string | null;
  orderId: string;
  value?: number;
}): Promise<void> {
  const { sessionId, orderId, userId, value } = params;
  const now = new Date();
  const data: {
    status: "COMPLETED";
    orderId: string;
    completedAt: Date;
    lastActivityAt: Date;
    userId?: string;
    total?: number;
  } = {
    status: "COMPLETED",
    orderId,
    completedAt: now,
    lastActivityAt: now,
  };
  if (userId) data.userId = userId;
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    data.total = value;
  }

  await prisma.cart.updateMany({
    where: { sessionId, status: "ACTIVE" },
    data,
  });
}
